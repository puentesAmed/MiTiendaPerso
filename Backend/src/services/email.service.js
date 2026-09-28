import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const emailTransporter = nodemailer.createTransport({
  host: env.SMTP.host,
  port: env.SMTP.port,
  secure: env.SMTP.secure,
  auth: {
    user: env.SMTP.user,
    pass: env.SMTP.pass,
  },
});

export async function sendEmail({ to, subject, html }) {
  if (!env.SMTP.configured) {
    throw new Error("SMTP no configurado");
  }

  return emailTransporter.sendMail({
    from: env.SMTP.from,
    to,
    subject,
    html,
  });
}
