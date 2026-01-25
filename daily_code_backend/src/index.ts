import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import {env} from 'hono/adapter'
import { signupMIddleware } from './middlewares/signup_validator';
import { signinMIddleware } from './middlewares/signin_validator';
import { authtoken } from './middlewares/authorizetoken';
import { decode, sign, verify } from 'hono/jwt'
import { cors } from 'hono/cors';
import z from 'zod'
//import { FetchEvent, Response, ScheduledEvent } from '@cloudflare/workers-types';

//import { notesauth } from './middlewares/notesauth';


const app = new Hono();
app.use(cors());

async function jwtsign(username:string):Promise<string>{
  const payload = {
    username:username
  }
  const secret = 'dailycodekey'
  const token = await sign(payload, secret)
  return token;
}




app.get('/test/:id', async (c) => {
  const problemId = Number(c.req.param('id'));

  const p = new Promise((resolve)=>{
    setTimeout(()=>{
      resolve(0);
    }, 1000);
  })

  await p;
      
    return c.json({
        userid: 1,
        id:problemId,
        title:"I am title",
        body:"I am body"
      });
   
})

app.delete('/test/delete/:id', async (c) => {
  const problemId = Number(c.req.param('id'));

  const p = new Promise((resolve)=>{
    setTimeout(()=>{
      resolve(0);
    }, 1000);
  })

  await p;

  
  return c.json({
      success: true,
      deleted:problemId,
      userid: 1,
      id:problemId,
      title:"I am title",
      body:"I am body"
    });
  
})



app.post('/varification', async (c) => {
  const body = await c.req.json();
  //console.log(body);
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  const emailSchema = z.object({
    email: z.string().email(),
  });

  function generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  try {
    const validation = emailSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: 'Invalid email format',success:false }, 400);
    }
    const code = generateVerificationCode();
    const email = body.email.trim();
    //const trimmedStr = str.trim();
    const resp = {
      email,
      code
    }
    //https://mailexpress.vercel.app
    const response2 = await fetch('https://mailer-daily-code-lghsomxcp-sahil-kumar-sinhas-projects.vercel.app/sendcode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(resp), // Send data1 as JSON body
          });
    const result = await response2.json();
    try {
      const res = await prisma.emailwithcode.upsert({
        where: { email: email }, // Check if email already exists
        update: { code: code }, // If exists, update the code
        create: { email: email, code: code }, // If doesn't exist, create a new record
        select: { id: true },
      });
      
      return c.json({
        res: res,
        success:true
      });
    } catch (error) {
      console.error('Error creating/updating record:', error);
      return c.json({message:'Internal Server Error',success:true}, 500);
    } finally {
      prisma.$disconnect();
    }
    //console.log(result);

  } catch (error) {
    console.error('Error in verifying', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});




app.post('/varifycode', async (c) => {
  const body = await c.req.json();
  //console.log(body);
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const code = body.code;
    const email = body.email.trim();
    try {
      const res = await prisma.emailwithcode.findUnique({
        where: { email: email }, // Check if email already exists
        select: { id: true, code:true},
      });

      if(res && res.code===code){
        return c.json({
          success:true
        });
      }else{
        return c.json({
          success:false
        });
      }
      
      
    } catch (error) {
      console.error('Error creating/updating record:', error);
      return c.json({message:'Internal Server Error',success:false}, 500);
    } finally {
      prisma.$disconnect();
    }
    //console.log(result);

  } catch (error) {
    console.error('Error in verifying', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});




app.post('/', async (c) => {
  return c.json({
    message:"hi"
  })
})




app.post('/signup',signupMIddleware, async (c) => {
  const b = await c.req.json();
  const { DATABASE_URL } = env<{ DATABASE_URL:string }>(c)

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const res = await prisma.user.create({
      data:{
        name: b.name,
        username: b.username,
        password:b.password,
      },
      select:{
        id:true,
      }
    });
    const token = await jwtsign(b.username);
    return c.json({
      res: res,
      token:token
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({
      success:false,
      message: 'error',
    })
  }finally{
    prisma.$disconnect();
  }
});


app.post('/signin',signinMIddleware, async (c:any) => {
  
  const b = await c.req.json();
  const token = await jwtsign(b.username);
  const allData = c.get("alluserinfo");
  

  return c.json({
    token:token,
    data:allData
  })  
});



app.patch('/me/mail-preferences', authtoken, async (c: any) => {
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const { problemsToMail, tagIds, preferredDifficulty } = body;

    if (!Array.isArray(tagIds) || typeof problemsToMail !== 'number') {
      return c.json({ success: false, message: 'Invalid payload' }, 400);
    }

    // preferredDifficulty can be null/undefined (any difficulty) or a string like 'A', 'B', 'C', etc.
    const difficultyValue = preferredDifficulty || null;

    // get or create mail prefs
    
    const mailPref = await prisma.usermailprops.upsert({
      //@ts-ignore
      where: { user_id: userId },
      update: { problemsToMail, preferred_difficulty: difficultyValue },
      create: {
        user_id: userId,
        problemsToMail,
        preferred_difficulty: difficultyValue,
      },
    });

    // reset tags
    await prisma.mailproblemTags.deleteMany({
      where: { mailprop_id: mailPref.id },
    });

    // add new tags
    await prisma.mailproblemTags.createMany({
      data: tagIds.map((tagId: number) => ({
        mailprop_id: mailPref.id,
        tag_id: tagId,
      })),
    });

    return c.json({
      success: true,
      problemsToMail,
      tagIds,
      preferredDifficulty: difficultyValue,
    });

  } catch (error) {
    console.error('Error updating mail preferences:', error);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});

app.get('/dashboard/today', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const problems = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        solved: true,
        message: true,
        created_at: true,
        problem: {
          select: {
            id: true,
            title: true,
            problem_link: true,   // ✅ explicitly included
            difficulty: true,
            problem_tags: {
              select: {
                tags: {
                  select: {
                    id: true,
                    tag_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return c.json({
      success: true,
      problems,
    });

  } catch (error) {
    console.error('Error fetching today problems:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    await prisma.$disconnect();
  }
});

app.get('/my/problems/recent', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const recent = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
        solved: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 10,
      select: {
        created_at: true,
        problem: {
          select: {
            id: true,
            title: true,
            problem_link: true,
            difficulty: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      problems: recent,
    });

  } catch (error) {
    console.error('Error fetching recent problems:', error);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});





// app.get('/problems/feed', authtoken, async (c: any) => {
//   const query = c.req.query();

//   const page = Number(query.page || 1);
//   const limit = Number(query.limit || 10);
//   const skip = (page - 1) * limit;

//   const search = query.search || '';
//   const tagId = query.tagId ? Number(query.tagId) : null;
//   const difficulty = query.difficulty || null;

//   const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

//   const prisma = new PrismaClient({
//     datasourceUrl: DATABASE_URL,
//   }).$extends(withAccelerate());

//   try {
//     const problems = await prisma.problems.findMany({
//       where: {
//         AND: [
//           search
//             ? {
//                 title: {
//                   contains: search,
//                   mode: 'insensitive',
//                 },
//               }
//             : {},
//           difficulty
//             ? {
//                 difficulty: difficulty,
//               }
//             : {},
//           tagId
//             ? {
//                 problem_tags: {
//                   some: {
//                     tag_id: tagId,
//                   },
//                 },
//               }
//             : {},
//         ],
//       },
//       select: {
//         id: true,
//         title: true,
//         problem_link: true,  // ✅ explicitly included
//         difficulty: true,
//         problem_tags: {
//           select: {
//             tags: {
//               select: {
//                 id: true,
//                 tag_name: true,
//               },
//             },
//           },
//         },
//       },
//       skip,
//       take: limit,
//       orderBy: {
//         id: 'desc',
//       },
//     });

//     return c.json({
//       success: true,
//       page,
//       limit,
//       problems,
//     });

//   } catch (error) {
//     console.error('Error fetching problem feed:', error);
//     return c.json({
//       success: false,
//       message: 'error',
//     });
//   } finally {
//     await prisma.$disconnect();
//   }
// });

app.post('/problems/feed', authtoken, async (c: any) => {
  const query = c.req.query();
  const body = await c.req.json().catch(() => ({}));

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  const search = body.search || '';
  const tagIds: number[] = Array.isArray(body.tagIds) ? body.tagIds : [];
  const difficulty = body.difficulty || null;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // Build filters cleanly
    const whereClause: any = {
      AND: [],
    };

    if (search) {
      whereClause.AND.push({
        OR: [  // ⬅️ Search in BOTH title and problem_link
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            problem_link: {  // ⬅️ Added this
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (difficulty) {
      whereClause.AND.push({
        difficulty,
      });
    }

    if (tagIds.length > 0) {
      whereClause.AND.push({
        problem_tags: {
          some: {
            tag_id: { in: tagIds },
          },
        },
      });
    }

    // Count total for pagination
    const total = await prisma.problems.count({
      where: whereClause.AND.length ? whereClause : {},
    });

    // Fetch paginated data
    const problems = await prisma.problems.findMany({
      where: whereClause.AND.length ? whereClause : {},
      select: {
        id: true,
        title: true,
        problem_link: true,
        difficulty: true,
        problem_tags: {
          select: {
            tags: {
              select: {
                id: true,
                tag_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
      skip,
      take: limit,
    });

    return c.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + problems.length < total,
      },
      problems: problems.map(p => ({
        id: p.id,
        title: p.title,
        link: p.problem_link,
        difficulty: p.difficulty,
        tags: p.problem_tags.map(t => t.tags),
      })),
    });

  } catch (error) {
    console.error('Error fetching problem feed:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    prisma.$disconnect();
  }
});

app.post('/postproblems', authtoken, async (c: any) => {
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const {
    title,
    problem_link,
    difficulty = 'A',
    tagIds = [],
    solution = '',
    Pattern = '',
    mydifficulty = difficulty,
    importance = 0,
    notes = '',
  } = body;

  if (!title || !problem_link || !Array.isArray(tagIds) || tagIds.length === 0) {
    return c.json({ success: false, message: 'Invalid payload' }, 400);
  }

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  
  if (!DATABASE_URL) {
      return c.json({ success: false, message: 'Server Config Error: DB URL missing' }, 500);
  }

  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    // 1️⃣ Check if problem already exists (by link)
    // We fetching 'problem_tags' here
    const problem = await prisma.problems.findFirst({
      where: { problem_link },
      include: {
        problem_tags: true, 
      },
    });

    // -------------------------------
    // 🆕 CASE 1: Problem already exists
    // -------------------------------
    if (problem) {
      // ✅ FIX: Calculate existing tags BEFORE updating.
      // If we update first, we might lose access to the 'problem_tags' relation inside the variable.
      const existingTagIds = new Set(
        // @ts-ignore
        problem.problem_tags.map(t => t.tag_id)
      );

      // Update basic fields (safe overwrite of the record in DB)
      await prisma.problems.update({
        where: { id: problem.id },
        data: {
          title,
          difficulty,
        },
      });

      // Filter only new tags that aren't already linked
      const newTagIds = tagIds.filter((id: number) => !existingTagIds.has(id));

      if (newTagIds.length > 0) {
        await prisma.tagstoproblems.createMany({
          data: newTagIds.map((tagId: number) => ({
            // @ts-ignore
            problem_id: problem.id,
            tag_id: tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Ensure Problemtouser exists (Upsert)
      const problemToUser = await prisma.problemtouser.upsert({
        where: {
          user_id_problem_id: {
            user_id: userId,
            // @ts-ignore
            problem_id: problem.id,
          },
        },
        update: {
          solution,
          Pattern,
          mydifficulty,
          importance,
          notes,
        },
        create: {
          user_id: userId,
          // @ts-ignore
          problem_id: problem.id,
          solution,
          Pattern,
          mydifficulty,
          importance,
          notes,
        },
      });

      return c.json({
        success: true,
        updated: true,
        problem: {
          // @ts-ignore
          id: problem.id,
          title, // Return the new title from payload
          // @ts-ignore
          problem_link: problem.problem_link,
          difficulty, // Return the new difficulty from payload
        },
        user_entry: {
          id: problemToUser.id,
          importance,
          notes,
        },
      });
    }

    // -------------------------------
    // 🆕 CASE 2: New problem (Does not exist)
    // -------------------------------
    const newProblem = await prisma.problems.create({
      data: {
        title,
        problem_link,
        difficulty,
        user_id_posted: userId,
      },
    });

    await prisma.tagstoproblems.createMany({
      data: tagIds.map((tagId: number) => ({
        problem_id: newProblem.id,
        tag_id: tagId,
      })),
    });

    const problemToUser = await prisma.problemtouser.create({
      data: {
        user_id: userId,
        problem_id: newProblem.id,
        solution,
        Pattern,
        mydifficulty,
        importance,
        notes,
      },
    });

    return c.json({
      success: true,
      created: true,
      problem: {
        id: newProblem.id,
        title: newProblem.title,
        problem_link: newProblem.problem_link,
        difficulty: newProblem.difficulty,
        tagIds,
      },
      user_entry: {
        id: problemToUser.id,
        importance,
        notes,
      },
    });

  } catch (error: any) {
    console.error('Error creating/updating problem:', error);
    // Return the actual error message for easier debugging during development
    return c.json({ success: false, message: 'Internal Server Error', error: error.message }, 500);
  } finally {
    await prisma.$disconnect();
  }
});


// app.post('/admin/postproblems', authtoken, async (c: any) => {
//   const body = await c.req.json();
//   const x = await c.get('userinfo');
//   const userId = x.id;

//   const {
//     title,
//     problem_link,
//     difficulty = 'A',
//     tagIds = [],
//     solution = '',
//     Pattern = '',
//     mydifficulty = difficulty,
//     importance = 0,
//     notes = '',
//   } = body;

//   if (!title || !problem_link || !Array.isArray(tagIds) || tagIds.length === 0) {
//     return c.json(
//       { success: false, message: 'Invalid payload' },
//       400
//     );
//   }

//   const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
//   const prisma = new PrismaClient({
//     datasourceUrl: DATABASE_URL,
//   }).$extends(withAccelerate());

//   try {
//     // 1️⃣ Create problem
//     const problem = await prisma.problems.create({
//       data: {
//         title,
//         problem_link,
//         difficulty,
//         user_id_posted: userId,
//       },
//     });

//     // 2️⃣ Attach tags
//     await prisma.tagstoproblems.createMany({
//       data: tagIds.map((tagId: number) => ({
//         problem_id: problem.id,
//         tag_id: tagId,
//       })),
//     });

//     // 3️⃣ Create Problemtouser for poster
//     const problemToUser = await prisma.problemtouser.create({
//       data: {
//         user_id: userId,
//         problem_id: problem.id,
//         solution,
//         Pattern,
//         mydifficulty,
//         importance,
//         notes,
//       },
//     });

//     return c.json({
//       success: true,
//       problem: {
//         id: problem.id,
//         title: problem.title,
//         problem_link: problem.problem_link,
//         difficulty: problem.difficulty,
//         tagIds,
//       },
//       user_entry: {
//         id: problemToUser.id,
//         importance,
//         notes,
//       },
//     });

//   } catch (error) {
//     console.error('Error creating problem:', error);
//     return c.json(
//       { success: false, message: 'error' },
//       500
//     );
//   } finally {
//     prisma.$disconnect();
//   }
// });


app.post('/admin/postproblems', authtoken, async (c: any) => {
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const {
    title,
    problem_link,
    difficulty = 'A',
    tagIds = [],
    solution = '',
    Pattern = '',
    mydifficulty = difficulty,
    importance = 0,
    notes = '',
  } = body;

  if (!title || !problem_link || !Array.isArray(tagIds) || tagIds.length === 0) {
    return c.json({ success: false, message: 'Invalid payload' }, 400);
  }

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  
  if (!DATABASE_URL) {
      return c.json({ success: false, message: 'Server Config Error: DB URL missing' }, 500);
  }

  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    // 1️⃣ Check if problem already exists (by link)
    // We fetching 'problem_tags' here
    const problem = await prisma.problems.findFirst({
      where: { problem_link },
      include: {
        problem_tags: true, 
      },
    });

    // -------------------------------
    // 🆕 CASE 1: Problem already exists
    // -------------------------------
    if (problem) {
      // ✅ FIX: Calculate existing tags BEFORE updating.
      // If we update first, we might lose access to the 'problem_tags' relation inside the variable.
      const existingTagIds = new Set(
        // @ts-ignore
        problem.problem_tags.map(t => t.tag_id)
      );

      // Update basic fields (safe overwrite of the record in DB)
      await prisma.problems.update({
        where: { id: problem.id },
        data: {
          title,
          difficulty,
        },
      });

      // Filter only new tags that aren't already linked
      const newTagIds = tagIds.filter((id: number) => !existingTagIds.has(id));

      if (newTagIds.length > 0) {
        await prisma.tagstoproblems.createMany({
          data: newTagIds.map((tagId: number) => ({
            // @ts-ignore
            problem_id: problem.id,
            tag_id: tagId,
          })),
          skipDuplicates: true,
        });
      }

      // Ensure Problemtouser exists (Upsert)
      const problemToUser = await prisma.problemtouser.upsert({
        where: {
          user_id_problem_id: {
            user_id: userId,
            // @ts-ignore
            problem_id: problem.id,
          },
        },
        update: {
          solution,
          Pattern,
          mydifficulty,
          importance,
          notes,
        },
        create: {
          user_id: userId,
          // @ts-ignore
          problem_id: problem.id,
          solution,
          Pattern,
          mydifficulty,
          importance,
          notes,
        },
      });

      return c.json({
        success: true,
        updated: true,
        problem: {
          // @ts-ignore
          id: problem.id,
          title, // Return the new title from payload
          // @ts-ignore
          problem_link: problem.problem_link,
          difficulty, // Return the new difficulty from payload
        },
        user_entry: {
          id: problemToUser.id,
          importance,
          notes,
        },
      });
    }

    // -------------------------------
    // 🆕 CASE 2: New problem (Does not exist)
    // -------------------------------
    const newProblem = await prisma.problems.create({
      data: {
        title,
        problem_link,
        difficulty,
        user_id_posted: userId,
      },
    });

    await prisma.tagstoproblems.createMany({
      data: tagIds.map((tagId: number) => ({
        problem_id: newProblem.id,
        tag_id: tagId,
      })),
    });

    const problemToUser = await prisma.problemtouser.create({
      data: {
        user_id: userId,
        problem_id: newProblem.id,
        solution,
        Pattern,
        mydifficulty,
        importance,
        notes,
      },
    });

    return c.json({
      success: true,
      created: true,
      problem: {
        id: newProblem.id,
        title: newProblem.title,
        problem_link: newProblem.problem_link,
        difficulty: newProblem.difficulty,
        tagIds,
      },
      user_entry: {
        id: problemToUser.id,
        importance,
        notes,
      },
    });

  } catch (error: any) {
    console.error('Error creating/updating problem:', error);
    // Return the actual error message for easier debugging during development
    return c.json({ success: false, message: 'Internal Server Error', error: error.message }, 500);
  } finally {
    await prisma.$disconnect();
  }
});

app.post('/admin/tags', authtoken, async (c: any) => {
  const body = await c.req.json();
  const { tag_name } = body;

  if (!tag_name || typeof tag_name !== 'string') {
    return c.json(
      { success: false, message: 'Invalid tag name' },
      400
    );
  }

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const tag = await prisma.tags.create({
      data: {
        tag_name: tag_name.trim(),
      },
      select: {
        id: true,
        tag_name: true,
      },
    });

    return c.json({
      success: true,
      tag,
    });

  } catch (error: any) {
    // unique constraint error
    if (error.code === 'P2002') {
      return c.json(
        { success: false, message: 'Tag already exists' },
        409
      );
    }

    //console.error('Error creating tag:', error);
    return c.json(
      { success: false, message: 'error' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});

app.post('/tags', authtoken, async (c: any) => {
  const body = await c.req.json();
  const { tag_name } = body;

  if (!tag_name || typeof tag_name !== 'string') {
    return c.json(
      { success: false, message: 'Invalid tag name' },
      400
    );
  }

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const tag = await prisma.tags.create({
      data: {
        tag_name: tag_name.trim(),
      },
      select: {
        id: true,
        tag_name: true,
      },
    });

    return c.json({
      success: true,
      tag,
    });

  } catch (error: any) {
    // unique constraint error
    if (error.code === 'P2002') {
      return c.json(
        { success: false, message: 'Tag already exists' },
        409
      );
    }

    //console.error('Error creating tag:', error);
    return c.json(
      { success: false, message: 'error' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});

app.post('/tags/bulk', authtoken, async (c: any) => {
  const body = await c.req.json();
  const { tags } = body;

  if (!Array.isArray(tags) || tags.length === 0) {
    return c.json(
      { success: false, message: 'tags must be a non-empty array' },
      400
    );
  }

  // normalize + dedupe input
  const cleanedTags = [
    ...new Set(
      tags
        .filter((t: any) => typeof t === 'string')
        .map((t: string) => t.trim())
        .filter(Boolean)
    ),
  ];

  if (cleanedTags.length === 0) {
    return c.json(
      { success: false, message: 'No valid tags provided' },
      400
    );
  }

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // 1️⃣ Find existing tags
    const existing = await prisma.tags.findMany({
      where: {
        tag_name: {
          in: cleanedTags,
        },
      },
      select: {
        id: true,
        tag_name: true,
      },
    });

    const existingNames = new Set(existing.map(t => t.tag_name));

    // 2️⃣ Determine new tags
    const toCreate = cleanedTags.filter(t => !existingNames.has(t));

    // 3️⃣ Create new tags (skipDuplicates is safe)
    if (toCreate.length > 0) {
      await prisma.tags.createMany({
        data: toCreate.map(name => ({ tag_name: name })),
        skipDuplicates: true,
      });
    }

    // 4️⃣ Fetch all affected tags (fresh)
    const allTags = await prisma.tags.findMany({
      where: {
        tag_name: {
          in: cleanedTags,
        },
      },
      select: {
        id: true,
        tag_name: true,
      },
      orderBy: {
        tag_name: 'asc',
      },
    });

    return c.json({
      success: true,
      created: toCreate,
      tags: allTags,
    });

  } catch (error) {
    //console.error('Error creating tags in bulk:', error);
    return c.json(
      { success: false, message: 'error' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});

app.post('/admin/tags/bulk', authtoken, async (c: any) => {
  const body = await c.req.json();
  const { tags } = body;

  if (!Array.isArray(tags) || tags.length === 0) {
    return c.json(
      { success: false, message: 'tags must be a non-empty array' },
      400
    );
  }

  // normalize + dedupe input
  const cleanedTags = [
    ...new Set(
      tags
        .filter((t: any) => typeof t === 'string')
        .map((t: string) => t.trim())
        .filter(Boolean)
    ),
  ];

  if (cleanedTags.length === 0) {
    return c.json(
      { success: false, message: 'No valid tags provided' },
      400
    );
  }

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // 1️⃣ Find existing tags
    const existing = await prisma.tags.findMany({
      where: {
        tag_name: {
          in: cleanedTags,
        },
      },
      select: {
        id: true,
        tag_name: true,
      },
    });

    const existingNames = new Set(existing.map(t => t.tag_name));

    // 2️⃣ Determine new tags
    const toCreate = cleanedTags.filter(t => !existingNames.has(t));

    // 3️⃣ Create new tags (skipDuplicates is safe)
    if (toCreate.length > 0) {
      await prisma.tags.createMany({
        data: toCreate.map(name => ({ tag_name: name })),
        skipDuplicates: true,
      });
    }

    // 4️⃣ Fetch all affected tags (fresh)
    const allTags = await prisma.tags.findMany({
      where: {
        tag_name: {
          in: cleanedTags,
        },
      },
      select: {
        id: true,
        tag_name: true,
      },
      orderBy: {
        tag_name: 'asc',
      },
    });

    return c.json({
      success: true,
      created: toCreate,
      tags: allTags,
    });

  } catch (error) {
    console.error('Error creating tags in bulk:', error);
    return c.json(
      { success: false, message: 'error' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});



// app.get('/problems/search', authtoken, async (c: any) => {
//   const q = c.req.query('q') || '';

//   const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
//   const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
//     .$extends(withAccelerate());

//   try {
//     const problems = await prisma.problems.findMany({
//       where: {
//         OR: [
//           {
//             title: {
//               contains: q,
//               mode: 'insensitive',
//             },
//           },
//           {
//             problem_link: {
//               contains: q,
//               mode: 'insensitive',
//             },
//           },
//         ],
//       },
//       take: 20,
//       orderBy: { id: 'desc' },
//       select: {
//         id: true,
//         title: true,
//         problem_link: true,
//         difficulty: true,
//       },
//     });

//     return c.json({
//       success: true,
//       problems,
//     });

//   } catch (e) {
//     console.error('Error searching problems:', e);
//     return c.json({ success: false, message: 'error' }, 500);
//   } finally {
//     prisma.$disconnect();
//   }
// });

app.get('/problems/search', authtoken, async (c: any) => {
  // 1. Get the raw query
  const rawQ = c.req.query('q') || '';
  
  // 2. FIX: Decode it manually to turn "https%3A%2F%2F" back into "https://"
  const q = decodeURIComponent(rawQ);

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const problems = await prisma.problems.findMany({
      where: {
        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            problem_link: {
              contains: q, // Now this will search for 'https://...' instead of 'https%3A...'
              mode: 'insensitive',
            },
          },
        ],
      },
      take: 20,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        title: true,
        problem_link: true,
        difficulty: true,
      },
    });

    return c.json({
      success: true,
      problems,
    });

  } catch (e) {
    console.error('Error searching problems:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});

app.get('/admin/problems/search', authtoken, async (c: any) => {
  // 1. Get the raw query
  const rawQ = c.req.query('q') || '';
  
  // 2. FIX: Decode it manually to turn "https%3A%2F%2F" back into "https://"
  const q = decodeURIComponent(rawQ);

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const problems = await prisma.problems.findMany({
      where: {
        OR: [
          {
            title: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            problem_link: {
              contains: q, // Now this will search for 'https://...' instead of 'https%3A...'
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        title: true,
        problem_link: true,
        difficulty: true,
      },
    });

    return c.json({
      success: true,
      problems,
    });

  } catch (e) {
    console.error('Error searching problems:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});






app.get('/my/problems/posted', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const problems = await prisma.problems.findMany({
      where: { user_id_posted: userId },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        title: true,
        problem_link: true,
        difficulty: true,
        problem_tags: {
          select: {
            tags: {
              select: {
                id: true,
                tag_name: true,
              },
            },
          },
        },
      },
    });

    return c.json({
      success: true,
      problems,
    });

  } catch (e) {
    console.error('Error fetching posted problems:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});


app.delete('/problems/:id', authtoken, async (c: any) => {
  const problemId = Number(c.req.param('id'));
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const problem = await prisma.problems.findUnique({
      where: { id: problemId },
    });

    if (!problem || problem.user_id_posted !== userId) {
      return c.json(
        { success: false, message: 'Not allowed' },
        403
      );
    }

    await prisma.problems.delete({
      where: { id: problemId },
    });

    return c.json({ success: true });

  } catch (e) {
    console.error('Error deleting problem:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});



app.get('/my/problems/starred', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const starredProblems = await prisma.problemtouser.findMany({
      where: {
        user_id: userId,
        starred: true,
      },
      select: {
        id: true,
        importance: true,
        notes: true,
        no_solved: true,
        mydifficulty: true,
        problems: {
          select: {
            id: true,
            title: true,
            problem_link: true,
            difficulty: true,
            problem_tags: {
              select: {
                tags: {
                  select: {
                    id: true,
                    tag_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { importance: 'desc' }, // most important first
        { id: 'desc' },
      ],
    });

    return c.json({
      success: true,
      count: starredProblems.length,
      problems: starredProblems.map(p => ({
        problem_id: p.problems.id,
        title: p.problems.title,
        link: p.problems.problem_link,
        difficulty: p.problems.difficulty,
        tags: p.problems.problem_tags.map(t => t.tags.tag_name),
        user_data: {
          importance: p.importance,
          notes: p.notes,
          no_solved: p.no_solved,
          mydifficulty: p.mydifficulty,
        },
      })),
    });

  } catch (error) {
    console.error('Error fetching starred problems:', error);
    return c.json(
      {
        success: false,
        message: 'error',
      },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});



app.get('/problems/:problemId/open', authtoken, async (c: any) => {
  const problemId = Number(c.req.param('problemId'));
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // 1️⃣ Fetch problem (global data)
    const problem = await prisma.problems.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        problem_link: true,
        difficulty: true,
        user_id_posted: true,
        problem_tags: {
          select: {
            tags: {
              select: {
                id: true,
                tag_name: true,
              },
            },
          },
        },
      },
    });

    if (!problem) {
      return c.json(
        {
          success: false,
          message: 'Problem not found',
        },
        404
      );
    }

    // 2️⃣ Ensure Problemtouser exists
    let problemToUser = await prisma.problemtouser.findUnique({
      where: {
        user_id_problem_id: {
          user_id: userId,
          problem_id: problemId,
        },
      },
      include: {
        comments: {
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (!problemToUser) {
      problemToUser = await prisma.problemtouser.create({
        data: {
          user_id: userId,
          problem_id: problemId,
          solution: '',
          Pattern: '',
          mydifficulty: problem.difficulty,
          best_time: 0,
          no_solved: 0,
          starred: false,
          importance: 0,
          notes: '',
        },
        include: {
          comments: true,
        },
      });
    }

    // 3️⃣ Fetch sent history (useful for UI & analytics)
    const sentHistory = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
        problem_id: problemId,
      },
      select: {
        id: true,
        solved: true,
        message: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return c.json({
      success: true,
      problem: {
        id: problem.id,
        title: problem.title,
        problem_link: problem.problem_link,
        difficulty: problem.difficulty,
        tags: problem.problem_tags.map(t => t.tags),
        posted_by: problem.user_id_posted,
      },
      user_progress: {
        id: problemToUser.id,
        solution: problemToUser.solution,
        Pattern: problemToUser.Pattern,
        mydifficulty: problemToUser.mydifficulty,
        best_time: problemToUser.best_time,
        no_solved: problemToUser.no_solved,
        starred: problemToUser.starred,
        importance: problemToUser.importance,
        notes: problemToUser.notes,
        comments: problemToUser.comments,
      },
      sent_history: sentHistory,
    });

  } catch (error) {
    console.error('Error opening problem:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    await prisma.$disconnect();
  }
});



app.patch('/problems/:problemId', authtoken, async (c: any) => {
  const problemId = Number(c.req.param('problemId'));
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // 1️⃣ Ensure Problemtouser exists
    const existing = await prisma.problemtouser.findUnique({
      where: {
        user_id_problem_id: {
          user_id: userId,
          problem_id: problemId,
        },
      },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: 'Problem not opened yet',
        },
        400
      );
    }

    // 2️⃣ Build update payload dynamically
    const updateData: any = {};

    if (body.solution !== undefined) updateData.solution = body.solution;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.Pattern !== undefined) updateData.Pattern = body.Pattern;
    if (body.mydifficulty !== undefined) updateData.mydifficulty = body.mydifficulty;
    if (body.best_time !== undefined) updateData.best_time = body.best_time;
    if (body.starred !== undefined) updateData.starred = body.starred;
    if (body.importance !== undefined) updateData.importance = body.importance;

    // increment solve count if explicitly requested
    if (body.increment_solve === true) {
      updateData.no_solved = {
        increment: 1,
      };
    }

    // 3️⃣ Update Problemtouser
    const updated = await prisma.problemtouser.update({
      where: {
        user_id_problem_id: {
          user_id: userId,
          problem_id: problemId,
        },
      },
      data: updateData,
    });

    // 4️⃣ If solved = true, mark latest sent problem as solved
    if (body.solved === true) {
      await prisma.problemsToUserWithDate.updateMany({
        where: {
          user_id: userId,
          problem_id: problemId,
          solved: false,
        },
        data: {
          solved: true,
        },
      });
    }

    return c.json({
      success: true,
      updated,
    });

  } catch (error) {
    console.error('Error updating problem progress:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    await prisma.$disconnect();
  }
});


app.get('/my/problems/history', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const history = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
      },
      select: {
        created_at: true,
        solved: true,
        problem: {
          select: {
            id: true,
            title: true,
            problem_link: true,
            difficulty: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Group by date (YYYY-MM-DD)
    const grouped: Record<string, any[]> = {};

    history.forEach(item => {
      const dateKey = item.created_at.toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        solved: item.solved,
        problem: item.problem,
      });
    });

    return c.json({
      success: true,
      history: grouped,
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    await prisma.$disconnect();
  }
});


app.get('/tags', authtoken, async (c: any) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const tags = await prisma.tags.findMany({
      orderBy: { tag_name: 'asc' },
      select: {
        id: true,
        tag_name: true,
      },
    });

    return c.json({
      success: true,
      tags,
    });

  } catch (e) {
    console.error('Error fetching tags:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});

app.get('/admin/tags', authtoken, async (c: any) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const tags = await prisma.tags.findMany({
      orderBy: { tag_name: 'asc' },
      select: {
        id: true,
        tag_name: true,
      },
    });

    return c.json({
      success: true,
      tags,
    });

  } catch (e) {
    console.error('Error fetching tags:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});



app.get('/my/problems/history/:date', authtoken, async (c: any) => {
  const dateParam = c.req.param('date'); // YYYY-MM-DD
  const x = await c.get('userinfo');
  const userId = x.id;

  const start = new Date(`${dateParam}T00:00:00.000Z`);
  const end = new Date(`${dateParam}T23:59:59.999Z`);

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const problems = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      select: {
        solved: true,
        message: true,
        created_at: true,
        problem: {
          select: {
            id: true,
            title: true,
            problem_link: true,
            difficulty: true,
            problem_tags: {
              select: {
                tags: {
                  select: {
                    id: true,
                    tag_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return c.json({
      success: true,
      date: dateParam,
      problems,
    });

  } catch (error) {
    console.error('Error fetching history by date:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    await prisma.$disconnect();
  }
});


app.get('/my/stats', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // 1️⃣ Fetch all mailed problems
    const sent = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
      },
      select: {
        solved: true,
        created_at: true,
        problem: {
          select: {
            problem_link: true,
            problem_tags: {
              select: {
                tags: {
                  select: {
                    tag_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const totalSent = sent.length;
    const totalSolved = sent.filter(p => p.solved).length;

    const solveRate =
      totalSent === 0 ? 0 : Math.round((totalSolved / totalSent) * 100);

    // 2️⃣ Compute streaks
    const solvedDates = new Set(
      sent
        .filter(p => p.solved)
        .map(p => p.created_at.toISOString().split('T')[0])
    );

    let currentStreak = 0;
    let longestStreak = 0;

    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (solvedDates.has(cursor.toISOString().split('T')[0])) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // longest streak
    let streak = 0;
    let prevDate: string | null = null;

    [...solvedDates]
      .sort()
      .forEach(date => {
        if (!prevDate) {
          streak = 1;
        } else {
          const prev = new Date(prevDate);
          const curr = new Date(date);
          const diff =
            (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

          streak = diff === 1 ? streak + 1 : 1;
        }

        longestStreak = Math.max(longestStreak, streak);
        prevDate = date;
      });

    // 3️⃣ Tag-wise stats
    const tagStats: Record<string, number> = {};

    sent.forEach(p => {
      if (!p.solved) return;

      p.problem.problem_tags.forEach(t => {
        const name = t.tags.tag_name;
        tagStats[name] = (tagStats[name] || 0) + 1;
      });
    });

    // 4️⃣ Platform-wise stats
    const platformStats: Record<string, number> = {};

    sent.forEach(p => {
      if (!p.solved) return;

      const link = p.problem.problem_link.toLowerCase();
      let platform = 'Other';

      if (link.includes('leetcode')) platform = 'LeetCode';
      else if (link.includes('codeforces')) platform = 'Codeforces';
      else if (link.includes('codechef')) platform = 'CodeChef';
      else if (link.includes('geeksforgeeks')) platform = 'GeeksForGeeks';

      platformStats[platform] = (platformStats[platform] || 0) + 1;
    });

    return c.json({
      success: true,
      stats: {
        totalSent,
        totalSolved,
        solveRate,
        currentStreak,
        longestStreak,
        tagStats,
        platformStats,
      },
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({
      success: false,
      message: 'error',
    });
  } finally {
    await prisma.$disconnect();
  }
});




app.get('/me/stats/detailed', authtoken, async (c: any) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const { id: userId } = await c.get('userinfo');

  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const sent = await prisma.problemsToUserWithDate.findMany({
      where: { user_id: userId },
      include: {
        problem: {
          include: {
            problem_tags: { include: { tags: true } },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    const totalProblems = sent.length;
    const solvedProblems = sent.filter(p => p.solved).length;
    const solveRate = totalProblems
      ? Math.round((solvedProblems / totalProblems) * 100)
      : 0;

    // ---------- solved dates ----------
    const solvedDates = sent
      .filter(p => p.solved)
      .map(p => p.created_at.toISOString().split('T')[0]);

    const solvedDateSet = new Set(solvedDates);

    // ---------- streaks ----------
    let currentStreak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (solvedDateSet.has(cursor.toISOString().split('T')[0])) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    let longestStreak = 0;
    let streak = 0;
    let prev: string | null = null;

    [...solvedDateSet].sort().forEach(d => {
      if (!prev) streak = 1;
      else {
        const diff =
          (new Date(d).getTime() - new Date(prev).getTime()) /
          (1000 * 60 * 60 * 24);
        streak = diff === 1 ? streak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, streak);
      prev = d;
    });

    // ---------- last 30 days ----------
    const last30Days: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];

      last30Days.push({
        date: key,
        sent: sent.filter(s => s.created_at.toISOString().startsWith(key)).length,
        solved: sent.filter(
          s => s.solved && s.created_at.toISOString().startsWith(key)
        ).length,
      });
    }

    // ---------- difficulty stats ----------
    const difficultyStats: any = {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 },
    };

    sent.forEach(s => {
      const d =
        s.problem.difficulty === 'A'
          ? 'easy'
          : s.problem.difficulty === 'B'
          ? 'medium'
          : 'hard';

      difficultyStats[d].total++;
      if (s.solved) difficultyStats[d].solved++;
    });

    // ---------- tag stats ----------
    const tagMap: Record<string, { solved: number; total: number }> = {};

    sent.forEach(s => {
      s.problem.problem_tags.forEach(t => {
        const name = t.tags.tag_name;
        tagMap[name] ||= { solved: 0, total: 0 };
        tagMap[name].total++;
        if (s.solved) tagMap[name].solved++;
      });
    });

    const tagStats = Object.entries(tagMap)
      .map(([tagName, v]) => ({ tagName, ...v }))
      .sort((a, b) => b.solved - a.solved)
      .slice(0, 10);

    // ---------- platform stats ----------
    const platformStats: Record<string, number> = {};

    sent.forEach(s => {
      if (!s.solved) return;
      const link = s.problem.problem_link.toLowerCase();
      let p = 'Other';
      if (link.includes('leetcode')) p = 'LeetCode';
      else if (link.includes('codeforces')) p = 'Codeforces';
      else if (link.includes('codechef')) p = 'CodeChef';
      else if (link.includes('geeksforgeeks')) p = 'GeeksForGeeks';
      platformStats[p] = (platformStats[p] || 0) + 1;
    });

    // ---------- recent activity (7 days) ----------
    const recentActivity: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];

      const problems = sent
        .filter(s => s.created_at.toISOString().startsWith(key))
        .map(s => ({
          id: s.problem.id,
          title: s.problem.title,
          solved: s.solved,
          difficulty: s.problem.difficulty,
        }));

      recentActivity.push({ date: key, problems });
    }

    return c.json({
      success: true,
      stats: {
        totalProblems,
        solvedProblems,
        solveRate,
        currentStreak,
        longestStreak,
        streakDates: [...solvedDateSet],
        last30Days,
        difficultyStats,
        tagStats,
        platformStats,
        recentActivity,
      },
    });

  } finally {
    prisma.$disconnect();
  }
});



app.get('/me/stats/calendar', authtoken, async (c: any) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const { id: userId } = await c.get('userinfo');

  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);

  try {
    const solved = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
        solved: true,
        created_at: { gte: start, lte: end },
      },
    });

    const calendar: Record<string, any> = {};

    solved.forEach(s => {
      const d = s.created_at.toISOString().split('T')[0];
      calendar[d] ||= { solved: 0, level: 0 };
      calendar[d].solved++;
    });

    Object.values(calendar).forEach(v => {
      v.level =
        v.solved >= 5 ? 4 :
        v.solved >= 3 ? 3 :
        v.solved >= 2 ? 2 :
        v.solved >= 1 ? 1 : 0;
    });

    return c.json({
      success: true,
      calendar,
      yearStart: `${year}-01-01`,
      yearEnd: `${year}-12-31`,
    });

  } finally {
    prisma.$disconnect();
  }
});


app.get('/me/stats/progress', authtoken, async (c: any) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const { id: userId } = await c.get('userinfo');

  const period = Number(c.req.query('period') || 30);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  const start = new Date();
  start.setDate(start.getDate() - period + 1);

  try {
    const solved = await prisma.problemsToUserWithDate.findMany({
      where: {
        user_id: userId,
        solved: true,
        created_at: { gte: start },
      },
    });

    let cumulative = 0;
    const data: any[] = [];

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];

      const daily = solved.filter(s =>
        s.created_at.toISOString().startsWith(key)
      ).length;

      cumulative += daily;

      data.push({
        date: key,
        daily,
        cumulative,
      });
    }

    return c.json({
      success: true,
      period,
      data,
    });

  } finally {
    prisma.$disconnect();
  }
});






app.get('/me/profile', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        dailymail: true,
        mailprops: {
          select: {
            problemsToMail: true,
            preferred_difficulty: true,
            tags_choosen: {
              select: {
                tagrelation: {
                  select: {
                    id: true,
                    tag_name: true,
                  },
                },
              },
            },
          },
        },
        allmails: {
          select: {
            mail: {
              select: { mail: true },
            },
          },
        },
      },
    });

    return c.json({
      success: true,
      profile: {
        id: user?.id,
        name: user?.name,
        username: user?.username,
        email: user?.email,
        dailymail: user?.dailymail,
        problemsToMail: user?.mailprops[0]?.problemsToMail ?? 0,
        preferredDifficulty: user?.mailprops[0]?.preferred_difficulty ?? null,
        tags:
          user?.mailprops[0]?.tags_choosen.map(
            t => t.tagrelation
          ) ?? [],
        emails: user?.allmails.map(m => m.mail.mail) ?? [],
      },
    });

  } catch (e) {
    console.error('Error fetching profile:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});



app.get('/me/emails', authtoken, async (c: any) => {
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    const emails = await prisma.extrausermails.findMany({
      where: { user_id: userId },
      select: {
        mail: {
          select: { mail: true },
        },
      },
    });

    return c.json({
      success: true,
      emails: emails.map(e => e.mail.mail),
    });

  } catch (e) {
    console.error('Error fetching emails:', e);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});



app.post('/me/emails', authtoken, async (c: any) => {
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return c.json(
        { success: false, message: 'Invalid email' },
        400
      );
    }

    // 1️⃣ Upsert into Allmails
    const mail = await prisma.allmails.upsert({
      //@ts-ignore
      where: { mail: email },
      update: {},
      create: { mail: email },
    });

    // 2️⃣ Link to user (Extrausermails)
    await prisma.extrausermails.create({
      data: {
        user_id: userId,
        mail_id: mail.id,
      },
    });

    return c.json({
      success: true,
      email,
    });

  } catch (error: any) {
    // Handle duplicate gracefully
    if (error.code === 'P2002') {
      return c.json({
        success: true,
        message: 'Email already added',
      });
    }

    console.error('Error adding email:', error);
    return c.json(
      { success: false, message: 'error' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});



app.delete('/me/emails', authtoken, async (c: any) => {
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return c.json(
        { success: false, message: 'Invalid email' },
        400
      );
    }

    // 1️⃣ Find email record
    const mail = await prisma.allmails.findUnique({
      where: { mail: email },
    });

    if (!mail) {
      return c.json({
        success: true,
        message: 'Email already removed',
      });
    }

    // 2️⃣ Delete user ↔ email relation
    await prisma.extrausermails.deleteMany({
      where: {
        user_id: userId,
        mail_id: mail.id,
      },
    });

    return c.json({
      success: true,
      email,
      message: 'Email removed successfully',
    });

  } catch (error) {
    console.error('Error deleting email:', error);
    return c.json(
      { success: false, message: 'error' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});



app.post('/cron/send-daily-mails', async (c: any) => {
  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);

  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  }).$extends(withAccelerate());

  // ---------- helpers ----------
  const daysAgo = (d: number) => {
    const x = new Date();
    x.setDate(x.getDate() - d);
    return x;
  };

  const shouldSendExtra = () => Math.random() < 0.25; // 25% chance

  try {
    // 1️⃣ Fetch users with daily mail enabled
    const users = await prisma.user.findMany({
      where: { dailymail: true },
      include: {
        allmails: { include: { mail: true } },
        mailprops: {
          include: {
            tags_choosen: { include: { tagrelation: true } },
          },
        },
      },
    });

    const bulkPayload: any[] = [];

    // 2️⃣ Loop over users
    for (const user of users) {
      const emails = user.allmails.map(e => e.mail.mail);
      if (emails.length === 0) continue;

      const mailPref = user.mailprops[0];
      if (!mailPref) continue;

      const tagIds = mailPref.tags_choosen.map(t => t.tag_id);
      const baseLimit = mailPref.problemsToMail;
      const finalLimit = shouldSendExtra() ? baseLimit + 1 : baseLimit;

      // 3️⃣ Build tag usage for last 7 days (balance tags)
      const lastWeek = daysAgo(7);
      const recentSent = await prisma.problemsToUserWithDate.findMany({
        where: {
          user_id: user.id,
          created_at: { gte: lastWeek },
        },
        include: {
          problem: {
            include: {
              problem_tags: { include: { tags: true } },
            },
          },
        },
      });

      const tagUsage: Record<string, number> = {};
      recentSent.forEach(p => {
        p.problem.problem_tags.forEach(t => {
          const name = t.tags.tag_name;
          tagUsage[name] = (tagUsage[name] || 0) + 1;
        });
      });

      // 4️⃣ Fetch candidate problems (broader pool)
      const fiveDaysAgo = daysAgo(5);

      const candidates = await prisma.problems.findMany({
        where: {
          problem_tags: {
            some: { tag_id: { in: tagIds } },
          },
          // ❌ don't resend if solved in last 5 days
          problem_sent: {
            none: {
              user_id: user.id,
              solved: true,
              created_at: { gte: fiveDaysAgo },
            },
          },
        },
        include: {
          problem_tags: { include: { tags: true } },
          problem_user: {
            where: { user_id: user.id },
          },
          problem_sent: {
            where: { user_id: user.id },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        take: baseLimit * 3,
      });

      if (candidates.length === 0) continue;

      // 5️⃣ Score candidates (INTELLIGENCE CORE)
      const scored = candidates.map(problem => {
        const pu = problem.problem_user[0]; // may be undefined
        const lastSent = problem.problem_sent[0];

        let score = 0;

        // never attempted
        if (!pu) score += 50;

        // attempted but unsolved
        if (pu && pu.no_solved === 0) score += 30;

        // importance boost
        if (pu) score += pu.importance * 10;

        // starred resend after 14 days
        if (pu?.starred && lastSent) {
          if (lastSent.created_at < daysAgo(14)) {
            score += 40;
          }
        }

        // tag balance penalty
        problem.problem_tags.forEach(t => {
          const count = tagUsage[t.tags.tag_name] || 0;
          score -= count * 15;
        });

        return { problem, score };
      });

      const selectedProblems = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, finalLimit)
        .map(s => s.problem);

      if (selectedProblems.length === 0) continue;

      const problemsForMail: any[] = [];

      // 6️⃣ DB writes + payload build
      for (const problem of selectedProblems) {
        // ensure Problemtouser exists
        await prisma.problemtouser.upsert({
          where: {
            user_id_problem_id: {
              user_id: user.id,
              problem_id: problem.id,
            },
          },
          update: {},
          create: {
            user_id: user.id,
            problem_id: problem.id,
            notes: '',
          },
        });

        // record sent problem
        await prisma.problemsToUserWithDate.create({
          data: {
            user_id: user.id,
            problem_id: problem.id,
            message: 'Daily problem',
          },
        });

        problemsForMail.push({
          id: problem.id,
          title: problem.title,
          link: problem.problem_link,
          difficulty: problem.difficulty,
          tags: problem.problem_tags.map(pt => pt.tags.tag_name),
        });
      }

      bulkPayload.push({
        userId: user.id,
        userName: user.name,
        emails,
        problems: problemsForMail,
      });
    }

    // 7️⃣ Send to mailer (PURE JSON)
    if (bulkPayload.length > 0) {
      const response = await fetch(
        'https://mailer-daily-code-9fs57cxyb-sahil-kumar-sinhas-projects.vercel.app/sendbulk',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: bulkPayload }),
        }
      );

      const result = await response.json();

      return c.json({
        success: true,
        sentToUsers: bulkPayload.length,
        mailerResponse: result,
      });
    }

    return c.json({
      success: true,
      sentToUsers: 0,
      message: 'No mails to send today',
    });

  } catch (error) {
    console.error('Error in daily cron job:', error);
    return c.json(
      { success: false, message: 'Cron job failed' },
      500
    );
  } finally {
    prisma.$disconnect();
  }
});



app.patch('/problems/:problemId/solved', authtoken, async (c: any) => {
  const { problemId } = c.req.param();
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    if (typeof body.solved !== 'boolean') {
      return c.json({ success: false, message: 'Invalid solved value' }, 400);
    }

    // Update ProblemsToUserWithDate entry
    const existingEntry = await prisma.problemsToUserWithDate.findFirst({
      where: {
        user_id: userId,
        problem_id: parseInt(problemId),
      },
    });

    if (existingEntry) {
      await prisma.problemsToUserWithDate.update({
        where: {
          id: existingEntry.id,
        },
        data: {
          solved: body.solved,
        },
      });
    } else {
      await prisma.problemsToUserWithDate.create({
        data: {
          user_id: userId,
          problem_id: parseInt(problemId),
          solved: body.solved,
        },
      });
    }

    // Update Problemtouser entry
    const existingProblemUser = await prisma.problemtouser.findUnique({
      where: {
        user_id_problem_id: {
          user_id: userId,
          problem_id: parseInt(problemId),
        },
      },
    });

    if (body.solved) {
      // Marking as solved - increment no_solved
      if (existingProblemUser) {
        await prisma.problemtouser.update({
          where: {
            user_id_problem_id: {
              user_id: userId,
              problem_id: parseInt(problemId),
            },
          },
          data: {
            no_solved: {
              increment: 1,
            },
          },
        });
      } else {
        // Create new entry with no_solved = 1
        await prisma.problemtouser.create({
          data: {
            user_id: userId,
            problem_id: parseInt(problemId),
            no_solved: 1,
            notes: '',
          },
        });
      }
    } else {
      // Marking as unsolved - reset no_solved to 0
      if (existingProblemUser) {
        await prisma.problemtouser.update({
          where: {
            user_id_problem_id: {
              user_id: userId,
              problem_id: parseInt(problemId),
            },
          },
          data: {
            no_solved: 0,
          },
        });
      }
    }

    return c.json({
      success: true,
      solved: body.solved,
    });

  } catch (error) {
    console.error('Error toggling solved status:', error);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});



app.patch('/me/dailymail', authtoken, async (c: any) => {
  const body = await c.req.json();
  const x = await c.get('userinfo');
  const userId = x.id;

  const { DATABASE_URL } = env<{ DATABASE_URL: string }>(c);
  const prisma = new PrismaClient({ datasourceUrl: DATABASE_URL })
    .$extends(withAccelerate());

  try {
    if (typeof body.enabled !== 'boolean') {
      return c.json({ success: false, message: 'Invalid value' }, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { dailymail: body.enabled },
    });

    return c.json({
      success: true,
      dailymail: body.enabled,
    });

  } catch (error) {
    console.error('Error updating dailymail:', error);
    return c.json({ success: false, message: 'error' }, 500);
  } finally {
    prisma.$disconnect();
  }
});
































/////////////////////////////////////////////////////////////////





export default app;




