import "server-only";

import nodemailer from "nodemailer";

import type { EmailTransport } from "@/lib/email/delivery";
import { getSmtpEnvironment } from "@/lib/server-env";

export function createSmtpEmailTransport(): EmailTransport {
  const configuration = getSmtpEnvironment();
  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    auth: configuration.credentials,
    logger: false,
    debug: false,
  });

  return {
    kind: "smtp",
    async send(message) {
      try {
        await transporter.sendMail({
          from: configuration.from,
          to: message.recipient,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });

        return true;
      } catch {
        return false;
      }
    },
  };
}
