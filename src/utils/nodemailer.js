import nodemailer from "nodemailer";
import { ApiError } from "./apiError.js";
import { ApiResponse } from "./apiResponse.js";
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVICE,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_EMAIL_PASSWORD,
  },
});

async function sendMailFunction(userMail, emailSubject, emailBody) {
  try {
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: userMail,
      subject: emailSubject,
      HTML: emailBody,
    };
    transporter.sendMail(mailOpts, (err, info) => {
      if (err) {
        console.error("Error sending email: ", err);
        return new ApiError(
          400,
          err.message || "Something went wrong while sending email"
        );
      } else {
        console.log("Mail sent successfully: " + info.response);
        return new ApiResponse(200, info.response, "Email sent successfully");
      }
    });

    return;
  } catch (error) {}
}
