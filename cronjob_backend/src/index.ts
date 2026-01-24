import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import {env} from 'hono/adapter'
import { cors } from 'hono/cors';
import z, { any } from 'zod'

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




app.post('/tosendworks', async (c) => {
  //const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

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

      const problemsToMail = user.mailprops?.[0]?.problemsToMail ?? 3;
      const selectedTagIds = user.mailprops?.[0]?.tags_choosen.map(t => t.tag_id) ?? [];
      const selectedTagNames = user.mailprops?.[0]?.tags_choosen.map(t => t.tagrelation.tag_name) ?? [];
      const hasSelectedTags = selectedTagIds.length > 0;

      const solvedRecently = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: userId,
          solved: true,
          created_at: { gte: sevenDaysAgo },
        },
        select: { problem_id: true },
      });

      const solvedIds = solvedRecently.map(p => p.problem_id);

      // Expand tags to groups - returns undefined if "Others" tag selected
      const expandedTagNames = hasSelectedTags ? expandTagsToGroups(selectedTagNames) : undefined;
      
      // If no tags selected OR any "Others" tag selected, fetch all problems (no filter)
      let tagFilter: { some: { tags: { tag_name: { in: string[], mode: 'insensitive' } } } } | undefined = undefined;
      
      if (hasSelectedTags && expandedTagNames !== undefined) {
        // Use expanded tags for filtering (case-insensitive)
        tagFilter = { some: { tags: { tag_name: { in: expandedTagNames, mode: 'insensitive' } } } };
      }

      // ---------------- A. USER POSTED ----------------
      const userPosted = await prisma.problems.findMany({
        where: {
          user_id_posted: userId,
          id: { notIn: solvedIds },
          ...(tagFilter && { problem_tags: tagFilter }),
        },
        take: problemsToMail,
        include: { problem_tags: { include: { tags: true } } },
      });

      const usedIds = new Set(userPosted.map(p => p.id));

      // ---------------- B. RANDOM ----------------
      const randomProblems = await prisma.problems.findMany({
        where: {
          id: { notIn: [...usedIds, ...solvedIds] },
          ...(tagFilter && { problem_tags: tagFilter }),
        },
        take: problemsToMail,
        include: { problem_tags: { include: { tags: true } } },
      });

      randomProblems.forEach(p => usedIds.add(p.id));

      // ---------------- C. IMPLEMENTATION ----------------
      const implementationTag = await prisma.tags.findFirst({
        where: { tag_name: "Implementation" },
      });

      const implementationProblems = implementationTag
        ? await prisma.problems.findMany({
            where: {
              id: { notIn: [...usedIds, ...solvedIds] },
              problem_tags: { some: { tag_id: implementationTag.id } },
            },
            take: 2,
            include: { problem_tags: { include: { tags: true } } },
          })
        : [];

      // ---------------- D. STARRED PROBLEMS ----------------
      const starred = await prisma.problemtouser.findMany({
        where: {
          user_id: userId,
          starred: true,
          problem_id: { notIn: solvedIds },
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

      // ---------------- SAVE SENT PROBLEMS ----------------
      const allProblems = [
        ...userPosted,
        ...randomProblems,
        ...implementationProblems,
      ];

      await prisma.problemsToUserWithDate.createMany({
        data: allProblems.map(p => ({
          user_id: userId,
          problem_id: p.id,
          solved: false,
        })),
      });

      // ---------------- PREP MAIL PAYLOAD ----------------
      mailsToSend.push({
        user: user.name,
        emails,
        userPosted: userPosted.map(p => ({
          title: p.title,
          link: p.problem_link,
          tags: p.problem_tags.map(t => t.tags.tag_name),
        })),
        randomProblems: randomProblems.map(p => ({
          title: p.title,
          link: p.problem_link,
          tags: p.problem_tags.map(t => t.tags.tag_name),
        })),
        implementationProblems: implementationProblems.map(p => ({
          title: p.title,
          link: p.problem_link,
          tags: p.problem_tags.map(t => t.tags.tag_name),
        })),
        starredProblems: starred.map(s => ({
          title: s.problems.title,
          link: s.problems.problem_link,
          tags: s.problems.problem_tags.map(t => t.tags.tag_name),
        })),
      });
    }

    
    // SEND MAIL
    const re = await fetch("https://mailer-daily-code-9fs57cxyb-sahil-kumar-sinhas-projects.vercel.app/sendquestionsmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: mailsToSend }),
    });

    console.log("✅ Daily mails sent successfully");
    return c.json({
      success:true,
      data: mailsToSend,
      re
    })

  } catch (err) {
    console.error("❌ Cron failed:", err);
    return c.json({
      success:false,
      error: err
    })
  } finally {
    await prisma.$disconnect();
  }
});

















export default {
  fetch: app.fetch,
  async scheduled(event:any, env:any, ctx:any) {
    //console.log(event.scheduledTime)
    await handleScheduled();
  },
}


// async function handleScheduled() {
//   const DATABASE_URL = "prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19JTE5GUnBRZThnSWh4N0o5b2gxQzYiLCJhcGlfa2V5IjoiMDFLRDAyRDRKRFAwMlhRRDVURU5HRDNSTjMiLCJ0ZW5hbnRfaWQiOiI3MGI3MzI2NGQ0NWQxZjBmMzA4YzUwN2EwNDVmYjI4YzAwYjA0ZDZhY2ZkMTljZTZlNTY5ZWMxZTE2MjIyOWQ4IiwiaW50ZXJuYWxfc2VjcmV0IjoiMTcyZWZhY2EtNDY5ZS00ZGZiLTg0NWUtOTNmNmMwZDhjNGUzIn0.lveooq2Gu4IPCCjfN5-kPkiDqT9_RQ74cluFgjuUOIo";

//   const prisma = new PrismaClient({
//     datasourceUrl: DATABASE_URL,
//   }).$extends(withAccelerate());

//   const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

//   try {
//     // 1️⃣ Fetch all users who want daily mail
//     const users = await prisma.user.findMany({
//       where: { dailymail: true },
//       include: {
//         mailprops: {
//           include: {
//             tags_choosen: {
//               include: { tagrelation: true },
//             },
//           },
//         },
//         allmails: {
//           include: { mail: true },
//         },
//       },
//     });

//     const mailsToSend: any[] = [];

//     for (const user of users) {
//       const userId = user.id;
//       const userName = user.name;

//       const emails = [
//         user.username, // login email
//         //@ts-ignore
//         ...user.allmails.map(m => m.mail.mail),
//       ];

//       const problemsToMail = user.mailprops?.[0]?.problemsToMail ?? 3;
//       const selectedTagIds =
//         user.mailprops?.[0]?.tags_choosen.map((t:any) => t.tag_id) ?? [];

//       // 2️⃣ Find recently solved problems
//       const solvedRecently = await prisma.problemsToUserWithDate.findMany({
//         where: {
//           user_id: userId,
//           solved: true,
//           created_at: { gte: sevenDaysAgo },
//         },
//         select: { problem_id: true },
//       });

//       const solvedIds = solvedRecently.map((p:any) => p.problem_id);

//       // -----------------------------------
//       // A️⃣ User-posted problems
//       // -----------------------------------
//       const userPosted = await prisma.problems.findMany({
//         where: {
//           user_id_posted: userId,
//           id: { notIn: solvedIds },
//           problem_tags: {
//             some: { tag_id: { in: selectedTagIds } },
//           },
//         },
//         take: problemsToMail,
//         include: {
//           problem_tags: { include: { tags: true } },
//         },
//       });

//       const usedIds = new Set(userPosted.map((p:any) => p.id));

//       // -----------------------------------
//       // B️⃣ Random problems (same tags)
//       // -----------------------------------
//       const randomProblems = await prisma.problems.findMany({
//         where: {
//           user_id_posted: { not: userId },
//           id: { notIn: [...solvedIds, ...usedIds] },
//           problem_tags: {
//             some: { tag_id: { in: selectedTagIds } },
//           },
//         },
//         take: problemsToMail,
//         orderBy: { id: "desc" },
//         include: {
//           problem_tags: { include: { tags: true } },
//         },
//       });

//       randomProblems.forEach(p => usedIds.add(p.id));

//       // -----------------------------------
//       // C️⃣ Implementation problems
//       // -----------------------------------
//       const implementationTag = await prisma.tags.findFirst({
//         where: { tag_name: "Implementation" },
//       });

//       const implementationProblems = implementationTag
//         ? await prisma.problems.findMany({
//             where: {
//               id: { notIn: [...solvedIds, ...usedIds] },
//               problem_tags: {
//                 some: { tag_id: implementationTag.id },
//               },
//             },
//             take: 2,
//             include: {
//               problem_tags: { include: { tags: true } },
//             },
//           })
//         : [];

//       implementationProblems.forEach(p => usedIds.add(p.id));

//       // -----------------------------------
//       // D️⃣ Starred problems
//       // -----------------------------------
//       const starred = await prisma.problemtouser.findMany({
//         where: {
//           user_id: userId,
//           starred: true,
//           problem_id: { notIn: solvedIds },
//         },
//         take: 2,
//         include: {
//           problems: {
//             include: {
//               problem_tags: { include: { tags: true } },
//             },
//           },
//         },
//       });

//       // -----------------------------------
//       // Build mail payload
//       // -----------------------------------
//       mailsToSend.push({
//         user: userName,
//         emails,
//         userPosted: formatProblems(userPosted),
//         randomProblems: formatProblems(randomProblems),
//         implementationProblems: formatProblems(implementationProblems),
//         starredProblems: starred.map(s => ({
//           title: s.problems.title,
//           link: s.problems.problem_link,
//           tags: s.problems.problem_tags.map(t => t.tags.tag_name),
//         })),
//       });
//     }

//     // 3️⃣ Send to mailer
//     await fetch("https://mailexpress.vercel.app/sendquestionsmail", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ success: true, data: mailsToSend }),
//     });

//     console.log("📨 Daily mails sent:", mailsToSend.length);
//   } catch (e) {
//     console.error("❌ Cron failed:", e);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// Helper


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

      const problemsToMail = user.mailprops?.[0]?.problemsToMail ?? 3;
      const selectedTagIds = user.mailprops?.[0]?.tags_choosen.map(t => t.tag_id) ?? [];
      const selectedTagNames = user.mailprops?.[0]?.tags_choosen.map(t => t.tagrelation.tag_name) ?? [];
      const hasSelectedTags = selectedTagIds.length > 0;

      const solvedRecently = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: userId,
          solved: true,
          created_at: { gte: sevenDaysAgo },
        },
        select: { problem_id: true },
      });

      const solvedIds = solvedRecently.map(p => p.problem_id);

      // Expand tags to groups - returns undefined if "Others" tag selected
      const expandedTagNames = hasSelectedTags ? expandTagsToGroups(selectedTagNames) : undefined;
      
      // If no tags selected OR any "Others" tag selected, fetch all problems (no filter)
      let tagFilter: { some: { tags: { tag_name: { in: string[], mode: 'insensitive' } } } } | undefined = undefined;
      
      if (hasSelectedTags && expandedTagNames !== undefined) {
        // Use expanded tags for filtering (case-insensitive)
        tagFilter = { some: { tags: { tag_name: { in: expandedTagNames, mode: 'insensitive' } } } };
      }

      // ---------------- A. USER POSTED ----------------
      const userPosted = await prisma.problems.findMany({
        where: {
          user_id_posted: userId,
          id: { notIn: solvedIds },
          ...(tagFilter && { problem_tags: tagFilter }),
        },
        take: problemsToMail,
        include: { problem_tags: { include: { tags: true } } },
      });

      const usedIds = new Set(userPosted.map(p => p.id));

      // ---------------- B. RANDOM ----------------
      const randomProblems = await prisma.problems.findMany({
        where: {
          id: { notIn: [...usedIds, ...solvedIds] },
          ...(tagFilter && { problem_tags: tagFilter }),
        },
        take: problemsToMail,
        include: { problem_tags: { include: { tags: true } } },
      });

      randomProblems.forEach(p => usedIds.add(p.id));

      // ---------------- C. IMPLEMENTATION ----------------
      const implementationTag = await prisma.tags.findFirst({
        where: { tag_name: "Implementation" },
      });

      const implementationProblems = implementationTag
        ? await prisma.problems.findMany({
            where: {
              id: { notIn: [...usedIds, ...solvedIds] },
              problem_tags: { some: { tag_id: implementationTag.id } },
            },
            take: 2,
            include: { problem_tags: { include: { tags: true } } },
          })
        : [];

      // ---------------- D. STARRED PROBLEMS ----------------
      const starred = await prisma.problemtouser.findMany({
        where: {
          user_id: userId,
          starred: true,
          problem_id: { notIn: solvedIds },
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

      // ---------------- SAVE SENT PROBLEMS ----------------
      const allProblems = [
        ...userPosted,
        ...randomProblems,
        ...implementationProblems,
      ];

      await prisma.problemsToUserWithDate.createMany({
        data: allProblems.map(p => ({
          user_id: userId,
          problem_id: p.id,
          solved: false,
        })),
      });

      // ---------------- PREP MAIL PAYLOAD ----------------
      mailsToSend.push({
        user: user.name,
        emails,
        userPosted: userPosted.map(p => ({
          title: p.title,
          link: p.problem_link,
          tags: p.problem_tags.map(t => t.tags.tag_name),
        })),
        randomProblems: randomProblems.map(p => ({
          title: p.title,
          link: p.problem_link,
          tags: p.problem_tags.map(t => t.tags.tag_name),
        })),
        implementationProblems: implementationProblems.map(p => ({
          title: p.title,
          link: p.problem_link,
          tags: p.problem_tags.map(t => t.tags.tag_name),
        })),
        starredProblems: starred.map(s => ({
          title: s.problems.title,
          link: s.problems.problem_link,
          tags: s.problems.problem_tags.map(t => t.tags.tag_name),
        })),
      });
    }

    // SEND MAIL
    await fetch("https://mailer-daily-code-9fs57cxyb-sahil-kumar-sinhas-projects.vercel.app/sendquestionsmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: mailsToSend }),
    });

    console.log("✅ Daily mails sent successfully");

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








