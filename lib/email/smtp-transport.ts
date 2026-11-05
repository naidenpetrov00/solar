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
        const result = await transporter.sendMail({
          from: configuration.from,
          to: message.recipient,
          messageId: message.messageId,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });

        return {
          status: "sent",
          providerMessageId:
            typeof result.messageId === "string" ? result.messageId : null,
        };
      } catch (error) {
        const responseCode =
          error &&
          typeof error === "object" &&
          "responseCode" in error &&
          typeof error.responseCode === "number"
            ? error.responseCode
            : null;
        const providerCode =
          error &&
          typeof error === "object" &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : null;
        const command =
          error &&
          typeof error === "object" &&
          "command" in error &&
          typeof error.command === "string"
            ? error.command.toUpperCase()
            : null;
        const permanent =
          providerCode === "EADDRESS" ||
          (providerCode === "EENVELOPE" &&
            (responseCode === null || responseCode >= 500)) ||
          (command === "RCPT TO" &&
            responseCode !== null &&
            responseCode >= 500);
        return {
          status: "failed",
          errorCode: permanent ? "SMTP_PERMANENT" : "SMTP_TEMPORARY",
          retryable: !permanent,
        };
      }
    },
  };
}
