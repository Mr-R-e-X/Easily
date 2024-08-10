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

export async function sendMailFunction(userMail, emailSubject, emailBody) {
  try {
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: userMail,
      subject: emailSubject,
      html: emailBody,
    };
    const info = await transporter.sendMail(mailOptions);
    return info.response;
  } catch (error) {
    console.error("Error sending email: ", error);
    throw new ApiError(500, "Something went wrong while sending email");
  }
}
