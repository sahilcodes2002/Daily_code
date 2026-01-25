import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import {env} from 'hono/adapter'
import { cors } from 'hono/cors';
import z, { any } from 'zod'

// ==================== PLATFORM & DIFFICULTY UTILITIES ====================

type Platform = 'codeforces' | 'leetcode' | 'codechef' | 'atcoder' | 'other';

// Detect platform from problem link
function getPlatform(link: string): Platform {
  const lowerLink = link.toLowerCase();
  if (lowerLink.includes('codeforces.com')) return 'codeforces';
  if (lowerLink.includes('leetcode.com')) return 'leetcode';
  if (lowerLink.includes('codechef.com')) return 'codechef';
  if (lowerLink.includes('atcoder.jp')) return 'atcoder';
  return 'other';
}

// Difficulty levels: A (easiest) -> F (hardest)
const DIFFICULTIES = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Get acceptable difficulty levels based on user's preferred difficulty and platform.
 * 
 * Cross-platform difficulty calibration:
 * - Codeforces: A=800-1000, B=1100-1400, C=1500-1800, D=1900-2100, E=2200-2400, F=2500+
 * - LeetCode: Easy≈A-B, Medium≈C-D, Hard≈E-F (but generally easier than CF at same letter)
 * - CodeChef: Similar to Codeforces
 * - AtCoder: Similar to Codeforces but slightly harder
 * 
 * STRICT Strategy:
 * - Always include the preferred difficulty
 * - Include ONE level harder max (reasonable challenge)
 * - For LeetCode only: can go one more level harder (LeetCode D ≈ Codeforces C)
 * - NEVER include more than one level easier (avoid too-easy problems)
 */
function getAcceptableDifficulties(preferred: string | null, platform: Platform): string[] {
  // No preference = accept all difficulties
  if (!preferred) return DIFFICULTIES;
  
  const prefIndex = DIFFICULTIES.indexOf(preferred.toUpperCase());
  if (prefIndex === -1) return DIFFICULTIES;
  
  const acceptable = new Set<string>();
  
  // Always include preferred
  acceptable.add(DIFFICULTIES[prefIndex]);
  
  // Include ONE level harder (reasonable challenge)
  if (prefIndex < DIFFICULTIES.length - 1) {
    acceptable.add(DIFFICULTIES[prefIndex + 1]);
  }
  
  // Platform-specific adjustments - STRICT
  switch (platform) {
    case 'leetcode':
      // LeetCode is easier, so we can accept ONE more level harder
      // User wants C? LeetCode D and E are acceptable (equivalent to CF C-D)
      if (prefIndex < DIFFICULTIES.length - 2) {
        acceptable.add(DIFFICULTIES[prefIndex + 2]);
      }
      break;
      
    case 'atcoder':
      // AtCoder is harder, so one level easier is actually appropriate
      if (prefIndex > 0) {
        acceptable.add(DIFFICULTIES[prefIndex - 1]);
      }
      break;
      
    case 'codeforces':
    case 'codechef':
    default:
      // For Codeforces/CodeChef - NO easier problems
      // User wants C? Give them C and D only, not B
      // This keeps the challenge appropriate
      break;
  }
  
  return Array.from(acceptable);
}

/**
 * Build a STRICT difficulty filter for Prisma query.
 * Only includes preferred difficulty + 1 harder + 2 harder for LeetCode flexibility.
 * Returns undefined if no difficulty preference (fetch all).
 */
function buildDifficultyFilter(preferred: string | null): { in: string[] } | undefined {
  if (!preferred) return undefined;
  
  const prefIndex = DIFFICULTIES.indexOf(preferred.toUpperCase());
  if (prefIndex === -1) return undefined;
  
  // STRICT filter: preferred, +1, +2 only (no easier except for AtCoder)
  const acceptable = new Set<string>();
  
  // Preferred level
  acceptable.add(DIFFICULTIES[prefIndex]);
  
  // One harder
  if (prefIndex < DIFFICULTIES.length - 1) {
    acceptable.add(DIFFICULTIES[prefIndex + 1]);
  }
  
  // Two harder (for LeetCode flexibility)
  if (prefIndex < DIFFICULTIES.length - 2) {
    acceptable.add(DIFFICULTIES[prefIndex + 2]);
  }
  
  // One easier (for AtCoder)
  if (prefIndex > 0) {
    acceptable.add(DIFFICULTIES[prefIndex - 1]);
  }
  
  return { in: Array.from(acceptable) };
}

/**
 * Check if a problem's difficulty is acceptable for the user's preference.
 * This is the STRICT filter applied after fetching.
 */
function isProblemAcceptable(
  problemDifficulty: string,
  problemLink: string,
  preferredDifficulty: string | null
): boolean {
  if (!preferredDifficulty) return true; // No preference, all acceptable
  
  const platform = getPlatform(problemLink);
  const acceptable = getAcceptableDifficulties(preferredDifficulty, platform);
  
  return acceptable.includes(problemDifficulty.toUpperCase());
}

/**
 * Score a problem based on how well it matches the user's preferred difficulty.
 * Higher score = better match. Returns 0 if not acceptable.
 */
function scoreProblemDifficulty(
  problemDifficulty: string,
  problemLink: string,
  preferredDifficulty: string | null
): number {
  if (!preferredDifficulty) return 100; // No preference, all equal
  
  const platform = getPlatform(problemLink);
  const acceptable = getAcceptableDifficulties(preferredDifficulty, platform);
  
  if (!acceptable.includes(problemDifficulty.toUpperCase())) {
    return 0; // Not acceptable - WILL BE FILTERED OUT
  }
  
  const prefIndex = DIFFICULTIES.indexOf(preferredDifficulty.toUpperCase());
  const probIndex = DIFFICULTIES.indexOf(problemDifficulty.toUpperCase());
  
  // Exact match gets highest score
  if (probIndex === prefIndex) return 100;
  
  // One level harder is good (challenge)
  if (probIndex === prefIndex + 1) return 85;
  
  // Two levels harder (for LeetCode) is okay
  if (probIndex === prefIndex + 2) return 70;
  
  // One level easier (for AtCoder) is acceptable
  if (probIndex === prefIndex - 1) return 60;
  
  return 0; // Should not reach here
}

/**
 * Select problems ensuring platform variety AND strict difficulty filtering.
 * Aims to distribute problems across Codeforces, LeetCode, CodeChef.
 * FILTERS OUT any problems that don't match the difficulty criteria.
 */
function selectWithPlatformVariety(
  problems: any[],
  count: number,
  preferredDifficulty: string | null
): any[] {
  // FIRST: Filter out problems that don't match difficulty criteria
  const filteredProblems = problems.filter(p => 
    isProblemAcceptable(p.difficulty, p.problem_link, preferredDifficulty)
  );
  
  if (filteredProblems.length <= count) return filteredProblems;
  
  // Group by platform
  const byPlatform: Record<Platform, any[]> = {
    codeforces: [],
    leetcode: [],
    codechef: [],
    atcoder: [],
    other: []
  };
  
  for (const p of filteredProblems) {
    const platform = getPlatform(p.problem_link);
    byPlatform[platform].push(p);
  }
  
  // Sort each platform's problems by difficulty score (best matches first)
  const platformKeys: Platform[] = ['codeforces', 'leetcode', 'codechef', 'atcoder', 'other'];
  for (const platform of platformKeys) {
    byPlatform[platform].sort((a, b) => {
      const scoreA = scoreProblemDifficulty(a.difficulty, a.problem_link, preferredDifficulty);
      const scoreB = scoreProblemDifficulty(b.difficulty, b.problem_link, preferredDifficulty);
      return scoreB - scoreA; // Higher score first
    });
  }
  
  const selected: any[] = [];
  const usedIds = new Set<number>();
  
  // Round-robin selection from each platform to ensure variety
  let platformIndex = 0;
  const activePlatforms = platformKeys.filter(p => byPlatform[p].length > 0);
  
  while (selected.length < count && activePlatforms.length > 0) {
    const platform = activePlatforms[platformIndex % activePlatforms.length];
    const platformProblems = byPlatform[platform];
    
    // Find next unused problem from this platform
    const problem = platformProblems.find(p => !usedIds.has(p.id));
    
    if (problem) {
      selected.push(problem);
      usedIds.add(problem.id);
    } else {
      // Remove exhausted platform
      const idx = activePlatforms.indexOf(platform);
      if (idx > -1) activePlatforms.splice(idx, 1);
    }
    
    platformIndex++;
  }
  
  return selected;
}

// ==================== TAG GROUPS ====================

// Tag Groups - selecting any tag expands to all tags in the group
const TAG_GROUPS: Record<string, string[]> = {
  "Dynamic Programming": [
    "Dynamic Programming", "DP", "dp", "Memoization", "Tabulation",
    "Bitmask DP", "Digit DP", "Tree DP", "DP on Trees", "Interval DP",
    "Knapsack", "LCS", "LIS", "Matrix Chain Multiplication", "State Compression"
  ],
  "Graph Basics": [
    "Graphs", "Graph", "BFS", "DFS", "Breadth First Search", "Depth First Search",
    "Graph Traversal", "Connected Components", "Bipartite", "Bipartite Graph",
    "Cycle Detection", "Topological Sort", "Topological Sorting"
  ],
  "Shortest Path": [
    "Shortest Path", "Dijkstra", "Bellman-Ford", "Floyd-Warshall", "SSSP",
    "All Pairs Shortest Path", "0-1 BFS"
  ],
  "Trees": [
    "Trees", "Tree", "Binary Tree", "BST", "Binary Search Tree", "N-ary Tree",
    "Tree Traversal", "LCA", "Lowest Common Ancestor", "Tree Diameter",
    "Centroid Decomposition", "Heavy-Light Decomposition", "HLD", "Euler Tour"
  ],
  "Advanced Graphs": [
    "MST", "Minimum Spanning Tree", "Kruskal", "Prim", "DSU", "Disjoint Set Union",
    "Union Find", "Strongly Connected Components", "SCC", "Tarjan", "Kosaraju",
    "Bridges", "Articulation Points", "Network Flow", "Max Flow", "Min Cut",
    "Bipartite Matching", "Hungarian Algorithm"
  ],
  "Strings": [
    "Strings", "String", "String Matching", "Pattern Matching", "KMP",
    "Knuth-Morris-Pratt", "Z-Algorithm", "Z Function", "Rabin-Karp", "Hashing",
    "String Hashing", "Rolling Hash", "Manacher", "Palindrome"
  ],
  "Advanced Strings": [
    "Trie", "Suffix Array", "Suffix Tree", "Aho-Corasick", "Suffix Automaton"
  ],
  "Binary Search": [
    "Binary Search", "Bisection", "Binary Search on Answer", "Ternary Search",
    "Parametric Search"
  ],
  "Sorting & Searching": [
    "Sorting", "Searching", "Merge Sort", "Quick Sort", "Counting Sort",
    "Radix Sort", "Bucket Sort", "Two Pointers", "Two-Pointers", "Sliding Window"
  ],
  "Data Structures": [
    "Data Structures", "Stack", "Queue", "Deque", "Priority Queue", "Heap",
    "Min Heap", "Max Heap", "Linked List", "Doubly Linked List"
  ],
  "Advanced Data Structures": [
    "Segment Tree", "Segment Trees", "Fenwick Tree", "BIT", "Binary Indexed Tree",
    "Sparse Table", "Mo's Algorithm", "Mo Algorithm", "Sqrt Decomposition",
    "Block Decomposition", "Persistent Data Structures", "Treap", "Splay Tree"
  ],
  "Number Theory": [
    "Number Theory", "Math", "Mathematics", "Prime", "Primes", "Sieve",
    "Sieve of Eratosthenes", "Prime Factorization", "GCD", "LCM", "Euclidean Algorithm",
    "Extended Euclidean", "Modular Arithmetic", "Modular Inverse", "Fermat's Little Theorem",
    "Chinese Remainder Theorem", "CRT", "Euler's Totient", "Phi Function"
  ],
  "Combinatorics": [
    "Combinatorics", "Permutation", "Permutations", "Combination", "Combinations",
    "nCr", "nPr", "Factorial", "Binomial Coefficient", "Pascal's Triangle",
    "Inclusion-Exclusion", "Pigeonhole Principle", "Catalan Numbers", "Derangements"
  ],
  "Geometry": [
    "Geometry", "Computational Geometry", "Convex Hull", "Line Intersection",
    "Point in Polygon", "Polygon Area", "Graham Scan", "Jarvis March",
    "Closest Pair of Points", "Sweep Line", "Line Sweep"
  ],
  "Greedy": [
    "Greedy", "Greedy Algorithm", "Greedy Algorithms", "Activity Selection",
    "Interval Scheduling", "Huffman Coding"
  ],
  "Divide & Conquer": [
    "Divide and Conquer", "Divide & Conquer", "D&C", "Merge Sort", "Quick Select",
    "Closest Pair", "Strassen's Algorithm"
  ],
  "Backtracking": [
    "Backtracking", "Recursion", "Recursive", "Brute Force", "Enumeration",
    "Generate Subsets", "Generate Permutations", "N-Queens", "Sudoku Solver"
  ],
  "Bit Manipulation": [
    "Bit Manipulation", "Bitwise", "Bitmask", "Bitmasking", "XOR", "AND", "OR",
    "Bit Operations", "Binary Representation"
  ],
  "Game Theory": [
    "Game Theory", "Nim", "Sprague-Grundy", "Minimax", "Alpha-Beta Pruning",
    "Winning/Losing States"
  ],
  "Matrix": [
    "Matrix", "Matrix Exponentiation", "Matrix Multiplication", "Gaussian Elimination",
    "Linear Algebra", "Determinant", "Matrix Inverse"
  ],
  "Probability & Statistics": [
    "Probability", "Expected Value", "Random", "Randomized Algorithm",
    "Monte Carlo", "Las Vegas Algorithm"
  ],
  "Interactive": [
    "Interactive", "Interactive Problem", "Query", "Online Algorithm"
  ],
  "Constructive": [
    "Constructive", "Constructive Algorithms", "Construction", "Ad-hoc", "Adhoc"
  ],
  "Implementation": [
    "Implementation", "Simulation", "Brute Force Implementation"
  ],
  "Arrays & Hashing": [
    "Array", "Arrays", "Hash Table", "Hash Map", "HashMap", "HashSet",
    "Prefix Sum", "Prefix Sums", "Difference Array", "Frequency Count"
  ],
  "Range Queries": [
    "Range Queries", "Range Query", "RMQ", "Range Minimum Query",
    "Range Sum Query", "Range Update"
  ],
  "Others": [
    "Bitmasks", "Meet in the Middle", "FFT", "Fast Fourier Transform", "NTT",
    "Number Theoretic Transform", "Pollard Rho", "Miller-Rabin", "Expression Parsing",
    "DP optimization", "Aliens Trick", "Lagrange Interpolation", "Burnside's Lemma",
    "Lucas Theorem", "Mobius Function", "Link Cut Tree", "2-SAT", "Flows",
    "Matching", "Hall's Theorem", "Dilworth's Theorem", "Sprague Grundy",
    "Offline Queries", "Online Queries", "CDQ Divide and Conquer",
    "basics", "basic", "beginner", "easy", "medium", "hard",
    "codeforces", "leetcode", "codechef", "atcoder", "spoj", "hackerrank", "hackerearth"
  ]
};

// Expand user's selected tags to include all tags from their groups
// Returns undefined if any "Others" tag is selected (fetch all problems)
// Returns expanded tag names array otherwise
function expandTagsToGroups(selectedTagNames: string[]): string[] | undefined {
  const expandedTags = new Set<string>();
  
  for (const tagName of selectedTagNames) {
    let foundInGroup = false;
    
    // Check each group for this tag
    for (const [groupName, groupTags] of Object.entries(TAG_GROUPS)) {
      const lowerGroupTags = groupTags.map(t => t.toLowerCase());
      
      if (lowerGroupTags.includes(tagName.toLowerCase())) {
        foundInGroup = true;
        
        // If tag belongs to "Others" group, return undefined to fetch all
        if (groupName === "Others") {
          return undefined;
        }
        
        // Add all tags from this group
        groupTags.forEach(t => expandedTags.add(t.toLowerCase()));
        break;
      }
    }
    
    // If tag not in any group, use it as-is
    if (!foundInGroup) {
      expandedTags.add(tagName.toLowerCase());
    }
  }
  
  return Array.from(expandedTags);
}

const app = new Hono();
app.use(cors());


export default {
  fetch: app.fetch,
  async scheduled(event:any, env:any, ctx:any) {
    //console.log(event.scheduledTime)
    await handleScheduled();
  },
}

async function handleScheduled() {
  const DATABASE_URL = "prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19JTE5GUnBRZThnSWh4N0o5b2gxQzYiLCJhcGlfa2V5IjoiMDFLRDAyRDRKRFAwMlhRRDVURU5HRDNSTjMiLCJ0ZW5hbnRfaWQiOiI3MGI3MzI2NGQ0NWQxZjBmMzA4YzUwN2EwNDVmYjI4YzAwYjA0ZDZhY2ZkMTljZTZlNTY5ZWMxZTE2MjIyOWQ4IiwiaW50ZXJuYWxfc2VjcmV0IjoiMTcyZWZhY2EtNDY5ZS00ZGZiLTg0NWUtOTNmNmMwZDhjNGUzIn0.lveooq2Gu4IPCCjfN5-kPkiDqT9_RQ74cluFgjuUOIo";

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const users = await prisma.user.findMany({
      where: { dailymail: true },
      include: {
        mailprops: { include: { tags_choosen: { include: { tagrelation: true } } } },
        allmails: { include: { mail: true } },
      },
    });

    const mailsToSend: any[] = [];

    for (const user of users) {
      const userId = user.id;
      const emails = [user.username, ...user.allmails.map(m => m.mail.mail)];

      // Get user preferences
      const problemsToMail = user.mailprops?.[0]?.problemsToMail ?? 3;
      const selectedTagNames = user.mailprops?.[0]?.tags_choosen.map(t => t.tagrelation.tag_name) ?? [];
      const hasSelectedTags = selectedTagNames.length > 0;
      // @ts-ignore - preferred_difficulty is the new field we added
      const preferredDifficulty: string | null = user.mailprops?.[0]?.preferred_difficulty ?? null;

      // Get recently solved problems to exclude
      const solvedRecently = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: userId,
          solved: true,
          created_at: { gte: sevenDaysAgo },
        },
        select: { problem_id: true },
      });
      const solvedIds = solvedRecently.map(p => p.problem_id);

      // Also exclude problems already sent in last 7 days (even if not solved)
      const sentRecently = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: userId,
          created_at: { gte: sevenDaysAgo },
        },
        select: { problem_id: true },
      });
      const sentIds = sentRecently.map(p => p.problem_id);
      const excludeIds = [...new Set([...solvedIds, ...sentIds])];

      // Build tag filter
      const expandedTagNames = hasSelectedTags ? expandTagsToGroups(selectedTagNames) : undefined;
      let tagFilter: { some: { tags: { tag_name: { in: string[], mode: 'insensitive' } } } } | undefined = undefined;
      
      if (hasSelectedTags && expandedTagNames !== undefined) {
        tagFilter = { some: { tags: { tag_name: { in: expandedTagNames, mode: 'insensitive' } } } };
      }

      // Build difficulty filter
      const difficultyFilter = buildDifficultyFilter(preferredDifficulty);

      // ==================== FETCH CANDIDATE PROBLEMS ====================
      // Fetch more problems than needed, then use smart selection for variety
      const fetchMultiplier = 5; // Fetch 5x more to have options for variety

      // ---------------- A. USER POSTED PROBLEMS ----------------
      const userPostedCandidates = await prisma.problems.findMany({
        where: {
          user_id_posted: userId,
          id: { notIn: excludeIds },
          ...(tagFilter && { problem_tags: tagFilter }),
          ...(difficultyFilter && { difficulty: difficultyFilter }),
        },
        take: problemsToMail * fetchMultiplier,
        include: { problem_tags: { include: { tags: true } } },
      });

      // Select with platform variety and difficulty scoring
      const userPosted = selectWithPlatformVariety(userPostedCandidates, problemsToMail, preferredDifficulty);
      const usedIds = new Set(userPosted.map(p => p.id));

      // ---------------- B. RANDOM PROBLEMS (with variety) ----------------
      const randomCandidates = await prisma.problems.findMany({
        where: {
          id: { notIn: [...usedIds, ...excludeIds] },
          ...(tagFilter && { problem_tags: tagFilter }),
          ...(difficultyFilter && { difficulty: difficultyFilter }),
        },
        take: problemsToMail * fetchMultiplier,
        include: { problem_tags: { include: { tags: true } } },
      });

      const randomProblems = selectWithPlatformVariety(randomCandidates, problemsToMail, preferredDifficulty);
      randomProblems.forEach(p => usedIds.add(p.id));

      // ---------------- C. STARRED PROBLEMS ----------------
      // User's starred problems - these should be revisited
      const starred = await prisma.problemtouser.findMany({
        where: {
          user_id: userId,
          starred: true,
          problem_id: { notIn: [...usedIds, ...excludeIds] },
        },
        take: 2,
        include: {
          problems: {
            include: {
              problem_tags: { include: { tags: true } },
            },
          },
        },
      });

      // ==================== SAVE SENT PROBLEMS ====================
      const allProblems = [
        ...userPosted,
        ...randomProblems,
      ];

      if (allProblems.length > 0) {
        await prisma.problemsToUserWithDate.createMany({
          data: allProblems.map(p => ({
            user_id: userId,
            problem_id: p.id,
            solved: false,
          })),
        });
      }

      // ==================== PREP MAIL PAYLOAD ====================
      const formatProblem = (p: any) => ({
        title: p.title,
        link: p.problem_link,
        difficulty: p.difficulty,
        platform: getPlatform(p.problem_link),
        tags: p.problem_tags.map((t: any) => t.tags.tag_name),
      });

      mailsToSend.push({
        user: user.name,
        emails,
        preferredDifficulty,
        userPosted: userPosted.map(formatProblem),
        randomProblems: randomProblems.map(formatProblem),
        starredProblems: starred.map(s => formatProblem(s.problems)),
      });

      console.log(`📧 Prepared mail for ${user.name}: ${allProblems.length} problems (difficulty: ${preferredDifficulty || 'any'})`);
    }

    // ==================== SEND MAIL ====================
    if (mailsToSend.length > 0) {
      await fetch("https://mailer-daily-code-9fs57cxyb-sahil-kumar-sinhas-projects.vercel.app/sendquestionsmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, data: mailsToSend }),
      });
    }

    console.log(`✅ Daily mails sent successfully to ${mailsToSend.length} users`);

  } catch (err) {
    console.error("❌ Cron failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}







function formatProblems(problems: any[]) {
  return problems.map(p => ({
    title: p.title,
    link: p.problem_link,
    tags: p.problem_tags.map((t: any) => t.tags.tag_name),
  }));
}



// async function handleScheduled() {

//   const DATABASE_URL = "prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlfa2V5IjoiNGFhYWFiNDctNjE3Yy00ZjMxLWExMzktM2NmMmVmMTMzNDY1IiwidGVuYW50X2lkIjoiZjJkNzY5N2E2NGZlNjI5OGQ4ZmU3NTVhYmRmZDkyYTNmNzk3MDFhZGY4MjQzMjM0NGVjY2QxMzM5YWU0NWY0MSIsImludGVybmFsX3NlY3JldCI6IjM0OWFjMjhhLWVlYWQtNDI5NS1iMTA5LTI1ZTgyYjJhMGYzZSJ9.4zCaFPGnGY-AZjQDIZDyMLcwOzaqwYYF-yTjPTgV9yc";

//   const prisma = new PrismaClient({
//     datasourceUrl: DATABASE_URL,
//   }).$extends(withAccelerate());

//   async function getall() {
//     try {
//       // Fetch the data
//       const mailworks = await prisma.mailworks.findMany();
//       const mailsubworks = await prisma.mailsubworks.findMany();
      
//       // Create a map to group data by email
//       const emailMap = new Map<string, { title: string; description?: string; project_id: number }[]>();
  
//       // Helper function to add data to the map
//       function addToMap(email: string, title: string,project_id:number, description?: string) {
//         if (!emailMap.has(email)) {
//           emailMap.set(email, []);
//         }
//         emailMap.get(email)?.push({ title, description, project_id });
//       }
  
//       // Process mailworks
//       mailworks.forEach(mailwork => {
//         addToMap(mailwork.email, mailwork.title, mailwork.project_id ,mailwork.description || "");
//       });
  
//       // Process mailsubworks
//       mailsubworks.forEach(mailsubwork => {
//         addToMap(mailsubwork.email, mailsubwork.title,mailsubwork.project_id ,mailsubwork.description || "");
//       });
  
//       // Convert map to array format
//       const result = Array.from(emailMap.entries()).map(([email, items]) => ({
//         email,
//         items
//       }));
  
//       console.log('Result from /tosendworks:', result);
  
//       // Return the result
//       return {
//         result,
//         success: true
//       };
  
//     } catch (error) {
//       console.error('Error processing request:', error);
//       return { error: 'Internal Server Error', success: false };
//     } finally {
//       await prisma.$disconnect();
//     }
//   }

//   try {
//     const resp = await getall();
//     const response2 = await fetch('https://mailexpress.vercel.app/sendmail', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(resp), // Send data1 as JSON body
//           });
//     console.log(resp);
//     //return c.json(resp);
//   } catch (error) {
//     console.error('Error in getall function:', error);
//     //return c.json({ error: 'Internal Server Error' }, 500);
//   }

// }








