import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT });

export const smtpMailer: Mailer = {
  async send(message) {
    await transport.sendMail({ from: env.MAIL_FROM, ...message });
  },
};
