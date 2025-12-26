import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import {env} from 'hono/adapter'
import { cors } from 'hono/cors';
import z, { any } from 'zod'



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

      const solvedRecently = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: userId,
          solved: true,
          created_at: { gte: sevenDaysAgo },
        },
        select: { problem_id: true },
      });

      const solvedIds = solvedRecently.map(p => p.problem_id);

      // ---------------- A. USER POSTED ----------------
      const userPosted = await prisma.problems.findMany({
        where: {
          user_id_posted: userId,
          id: { notIn: solvedIds },
          problem_tags: { some: { tag_id: { in: selectedTagIds } } },
        },
        take: problemsToMail,
        include: { problem_tags: { include: { tags: true } } },
      });

      const usedIds = new Set(userPosted.map(p => p.id));

      // ---------------- B. RANDOM ----------------
      const randomProblems = await prisma.problems.findMany({
        where: {
          id: { notIn: [...usedIds, ...solvedIds] },
          problem_tags: { some: { tag_id: { in: selectedTagIds } } },
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
        skipDuplicates: true,
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

      const solvedRecently = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: userId,
          solved: true,
          created_at: { gte: sevenDaysAgo },
        },
        select: { problem_id: true },
      });

      const solvedIds = solvedRecently.map(p => p.problem_id);

      // ---------------- A. USER POSTED ----------------
      const userPosted = await prisma.problems.findMany({
        where: {
          user_id_posted: userId,
          id: { notIn: solvedIds },
          problem_tags: { some: { tag_id: { in: selectedTagIds } } },
        },
        take: problemsToMail,
        include: { problem_tags: { include: { tags: true } } },
      });

      const usedIds = new Set(userPosted.map(p => p.id));

      // ---------------- B. RANDOM ----------------
      const randomProblems = await prisma.problems.findMany({
        where: {
          id: { notIn: [...usedIds, ...solvedIds] },
          problem_tags: { some: { tag_id: { in: selectedTagIds } } },
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
        skipDuplicates: true,
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








