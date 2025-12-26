const express = require('express');
const nodemailer = require('nodemailer');
const app = express();
const util = require('util')
const cors = require("cors");
const bodyParser = require('body-parser');
require('dotenv').config();

app.use(cors(
    {
      origin: "*"
    }
  ));
  app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: "Mailer Service is Running (Root)" });
});

app.get('/test', (req, res) => {
  res.status(200).json({ message: "Test route working" });
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host:'smtp.gmail.com',
    port:587,
    secure:false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    }
    // auth: {
    //     user: 'womensafetyalert11@gmail.com',
    //     pass: 'htpk vxik neog ewbs',
    // },
});


function textbodyofemail(email, tasks) {
    const current_date = new Date();
    const dateString = current_date.toLocaleDateString();
    const timeString = current_date.toLocaleTimeString();
    
    let taskList = tasks.map(task => `- ${task.title}: ${task.description}\nProject Link: https://sahilcodes2002.github.io/Habito/#/project/${task.project_id}`).join('\n\n');
    
    return `
    Hello ${email},

    This is a reminder to complete your pending tasks. Below is a list of tasks you need to complete:

    ${taskList}

    Please make sure to finish them in a timely manner.

    Best regards,
    DailyCode Team
        `;
}




function htmlbodyofemailnotif(email, tasks) {

    

      
    return `
        <p>Hello ${email},</p>
        <p>You have a new invitation on Habito, check it out on: <a href="https://sahilcodes2002.github.io/Habito/#/notifications">View Task</a></p>
        
    
        <p>Best regards,<br>DailyCode Team</p>
    `;
}





function htmlbodyofemail(email, tasks) {
    const current_date = new Date();
    const dateString = current_date.toLocaleDateString();
    const timeString = current_date.toLocaleTimeString();
    
    //let taskList = tasks.map(task => `<li><strong>${task.title}</strong>: ${task.description} <br> Project Link: <a href="https://sahilcodes2002.github.io/Habito/#/project/${task.project_id}">View Task</a></li>`).join('');
    let taskList = tasks.map(task => 
        `<li>
          <strong style="font-size: 1.5em; color: #FF7F50;">${task.title}</strong>: ${task.description} 
          <br> 
          Project Link: 
          <a href="https://sahilcodes2002.github.io/Habito/#/project/${task.project_id}">View Task</a>
        </li>`
      ).join('');
      
    return `
        <p>Hello ${email},</p>
        <p>This is a reminder to complete your pending tasks as of <strong>${dateString}</strong> at <strong>${timeString}</strong>.</p>
        <p>Below is a list of tasks you need to complete:</p>
        <ul>
            ${taskList}
        </ul>
        <p>Please make sure to finish them in a timely manner.</p>
        <p>Best regards,<br>DailyCode Team</p>
    `;
}





const sendMail = util.promisify(transporter.sendMail).bind(transporter);




app.post('/sendmail', async (req, res) => {
  const body = req.body;

  // Validate the incoming request body
  if (!body || !body.success || !body.result) {
      return res.status(400).json({
          message: "Invalid data"
      });
  }

  try {
      // Loop over each user and send emails
      for (const user of body.result) {
          const mailOptions = {
              from: {
                  name: 'DailyCode',
                  address: process.env.GMAIL_USER,
              },
              to: user.email,
              subject: 'Task Reminder from DailyCode',
              text: textbodyofemail(user.email, user.items),
              html: htmlbodyofemail(user.email, user.items),
          };

          // Send the email using the promisified sendMail
          await sendMail(mailOptions);
          console.log(`Email sent to ${user.email}`);
      }

      // Respond with success if all emails were sent
      res.status(200).json({
          message: "Emails sent"
      });

  } catch (err) {
      console.error("Error sending emails:", err);
      res.status(500).json({
          message: "Error sending emails",
          error: err.message
      });
  }
});




app.post('/sendnotif', async (req, res) => {
    var body = req.body;
  
    // Helper function for plain text email content
    function textbodyofemailv(code) {
        return `
    Hello ${email},

    You have a new invitation on Habito, check it out on : https://sahilcodes2002.github.io/Habito/#/notifications

    Best regards,
    DailyCode Team
        `;
    }
    
    // Helper function for HTML email content
    function htmlbodyofemailv(code) {
        return `
        <p>Hello ${email},</p>
        <p>You have a new invitation on Habito, check it out on: <a href="https://sahilcodes2002.github.io/Habito/#/notifications">View Notifications</a></p>
        
    
        <p>Best regards,<br>DailyCode Team</p>
    `;
    }
  
    // Validate the incoming request body
    if (!body || !body.username) {
        return res.status(400).json({
            message: "Invalid email"
        });
    }
  
    const email = body.username;
    // const code = body.code;
  
    try {
        // Prepare mail options
        const mailOptions = {
            from: {
                name: 'DailyCode',
                address: process.env.GMAIL_USER,
            },
            to: email,
            subject: 'New invitation',
            text: textbodyofemailv(),
            html: htmlbodyofemailv(),
        };
  
        // Send the email using the promisified sendMail
        await sendMail(mailOptions);
        console.log(`Notif email sent to ${email}`);
  
        // Respond with success message
        return res.status(200).json({
            message: 'Notif email sent',
        });
  
    } catch (error) {
        console.error(`Error sending Notif email to ${email}:`, error);
        return res.status(500).json({
            message: 'Error sending email',
            error: error.message,
        });
    }
  });




  app.post('/sendcode', async (req, res) => {
    var body = req.body;
  
    // Helper function for plain text email content
    function textbodyofemailv(code) {
        const current_date = new Date();
        const dateString = current_date.toLocaleDateString();
        const timeString = current_date.toLocaleTimeString();
    
        return `
    Hello,
    
    Email verification was initiated at ${timeString} on ${dateString}.
    If you did not initiate this, please ignore this message.
    
    Your verification code is: ${code}
    
    Please complete the verification process promptly.
    
    Best regards,
    DailyCode Team
        `;
    }
    
    // Helper function for HTML email content
    function htmlbodyofemailv(code) {
        const current_date = new Date();
        const dateString = current_date.toLocaleDateString();
        const timeString = current_date.toLocaleTimeString();
        
        return `
        <p>Hello,</p>
        <p><strong>Email Verification</strong> was initiated at <strong>${timeString}</strong> on <strong>${dateString}</strong>.</p>
        <p><strong>Ignore this</strong> if you didn't initiate the process.</p>
        <br/>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>Please complete the verification process promptly.</p>
        <p>Best regards,<br>DailyCode Team</p>
        `;
    }
  
    // Validate the incoming request body
    if (!body || !body.email) {
        return res.status(400).json({
            message: "Invalid email"
        });
    }
  
    const email = body.email;
    const code = body.code;
  
    try {
        // Prepare mail options
        const mailOptions = {
            from: {
                name: 'DailyCode',
                address: process.env.GMAIL_USER,
            },
            to: email,
            subject: 'Your DailyCode Verification Code',
            text: textbodyofemailv(code),
            html: htmlbodyofemailv(code),
        };
  
        // Send the email using the promisified sendMail
        await sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
  
        // Respond with success message
        return res.status(200).json({
            message: 'Verification email sent',
        });
  
    } catch (error) {
        console.error(`Error sending verification email to ${email}:`, error);
        return res.status(500).json({
            message: 'Error sending email',
            error: error.message,
        });
    }
  });




function htmlbodyofquestionsmail(user, userPosted, randomProblems, implementationProblems, starredProblems) {
    const current_date = new Date();
    const dateString = current_date.toLocaleDateString();

    const renderProblems = (title, problems) => {
        if (!problems || problems.length === 0) return '';
        const listItems = problems.map(p => {
            const tagsHtml = p.tags && p.tags.length > 0 
                ? `<div style="font-size: 12px; color: #666; margin-top: 5px;">
                    ${p.tags.map(tag => `<span style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 4px; margin-right: 5px; display: inline-block; margin-bottom: 2px;">${tag}</span>`).join('')}
                   </div>`
                : '';
            
            return `
            <div style="margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #fff;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">
                    <a href="${p.link}" style="text-decoration: none; color: #2563eb;">${p.title}</a>
                </div>
                ${tagsHtml}
            </div>
        `}).join('');
        
        return `
            <h3 style="color: #1f2937; font-size: 18px; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">${title}</h3>
            <div>${listItems}</div>
        `;
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Code Challenge</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="background-color: #1e293b; padding: 30px 20px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Daily Code Challenge</h1>
                <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">${dateString}</p>
            </div>
            
            <div style="padding: 30px 20px;">
                <p style="font-size: 16px; margin-top: 0;">Hello <strong>${user}</strong>,</p>
                <p style="color: #4b5563;">Here are your selected problems for today. Keep up the momentum!</p>

                ${renderProblems('🎯 Your Posted Problems', userPosted)}
                ${renderProblems('🎲 Random Picks', randomProblems)}
                ${renderProblems('🛠️ Implementation Practice', implementationProblems)}
                ${renderProblems('⭐ Starred Problems', starredProblems)}

                <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
                    <a href="https://sahilcodes2002.github.io/dailycode/#/dashboard" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
                </div>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">Happy Coding!</p>
                <p style="margin: 5px 0 0;">The Daily Code Team</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

app.post('/sendquestionsmail', async (req, res) => {
    const body = req.body;

    if (!body || !body.success || !body.data) {
        return res.status(400).json({ message: "Invalid data" });
    }

    try {
        for (const userData of body.data) {
            const { user, emails, userPosted, randomProblems, implementationProblems, starredProblems } = userData;
            
            const htmlContent = htmlbodyofquestionsmail(user, userPosted, randomProblems, implementationProblems, starredProblems);
            
            // Send to all emails for this user
            for (const email of emails) {
                 const mailOptions = {
                    from: {
                        name: 'Daily Code',
                        address: process.env.GMAIL_USER,
                    },
                    to: email,
                    subject: `Daily Code Challenge for ${user}`,
                    html: htmlContent,
                };
                await sendMail(mailOptions);
                console.log(`Questions email sent to ${email} for user ${user}`);
            }
        }

        res.status(200).json({ message: "All emails sent successfully" });

    } catch (err) {
        console.error("Error sending question emails:", err);
        res.status(500).json({ message: "Error sending emails", error: err.message });
    }
});

module.exports = app;