import "server-only";

import type { EmailTransport } from "@/lib/email/delivery";
import { createSmtpEmailTransport } from "@/lib/email/smtp-transport";

export function createEmailTransport(): EmailTransport {
  return createSmtpEmailTransport();
}
