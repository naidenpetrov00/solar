import "server-only";

import { getT } from "@/i18n.server";
import type { EmailMessage } from "@/lib/email/delivery";
import { resolveAuthEmailLocale } from "@/lib/email/auth-email-locale";
import { createEmailTransport } from "@/lib/email/transport";
import {
  escapeEmailHtml,
  renderEmailFrame,
} from "@/lib/email/template-frame";
import { requireServerEnvironmentVariable } from "@/lib/server-env";

type AuthEmailPurpose = "verification" | "password_reset";

export class EmailDeliveryError extends Error {
  constructor(readonly purpose: AuthEmailPurpose) {
    super("EMAIL_DELIVERY_FAILED");
    this.name = "EmailDeliveryError";
  }
}

const emailTransport = createEmailTransport();
const applicationUrl = requireServerEnvironmentVariable("BETTER_AUTH_URL");

async function buildAuthEmail(
  purpose: AuthEmailPurpose,
  url: string,
): Promise<Omit<EmailMessage, "recipient">> {
  const callbackRoute =
    purpose === "verification" ? "verify-email" : "reset-password";
  const locale = resolveAuthEmailLocale(url, callbackRoute, applicationUrl);
  const { t } = await getT(["common", "emails"], { lng: locale });
  const key =
    purpose === "verification"
      ? "emails:emails.verification"
      : "emails:emails.passwordReset";
  const subject = t(`${key}.subject`);
  const title = t(`${key}.title`);
  const introduction = t(`${key}.introduction`);
  const action = t(`${key}.action`);
  const expiry = t(`${key}.expiry`);
  const ignore = t(`${key}.ignore`);
  const safeUrl = escapeEmailHtml(url);

  return {
    subject,
    text: [
      title,
      "",
      introduction,
      `${action}: ${url}`,
      "",
      expiry,
      ignore,
    ].join("\n"),
    html: renderEmailFrame([
      `<h1 style="margin:0 0 20px;font-size:30px;line-height:1.1">${escapeEmailHtml(title)}</h1>`,
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escapeEmailHtml(introduction)}</p>`,
      `<p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;background:#fcd34d;color:#11130f;padding:13px 18px;text-decoration:none;font-weight:700">${escapeEmailHtml(action)}</a></p>`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#5d625a">${escapeEmailHtml(expiry)}</p>`,
      `<p style="margin:0;font-size:14px;line-height:1.6;color:#5d625a">${escapeEmailHtml(ignore)}</p>`,
    ].join("")),
  };
}

async function deliverAuthEmail(
  purpose: AuthEmailPurpose,
  recipient: string,
  url: string,
  throwOnFailure = false,
) {
  try {
    const message = await buildAuthEmail(purpose, url);
    const delivery = await emailTransport.send({ recipient, ...message });

    if (delivery.status === "sent") {
      return true;
    }
  } catch {
    // Deliberately handled below without retaining provider or message details.
  }

  console.error({
    event: "email_delivery_failed",
    purpose,
    transport: emailTransport.kind,
  });

  if (throwOnFailure) {
    throw new EmailDeliveryError(purpose);
  }

  return false;
}

export async function sendVerificationEmail(recipient: string, url: string) {
  await deliverAuthEmail("verification", recipient, url);
}

export async function sendPasswordResetEmail(recipient: string, url: string) {
  return deliverAuthEmail("password_reset", recipient, url, true);
}
