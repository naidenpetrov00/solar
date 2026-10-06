import "server-only";

import { getT } from "@/i18n.server";
import type { EmailMessage } from "@/lib/email/delivery";
import { resolveAuthEmailLocale } from "@/lib/email/auth-email-locale";
import { createSmtpEmailTransport } from "@/lib/email/smtp-transport";
import { requireServerEnvironmentVariable } from "@/lib/server-env";

type AuthEmailPurpose = "verification" | "password_reset";

const emailTransport = createSmtpEmailTransport();
const applicationUrl = requireServerEnvironmentVariable("BETTER_AUTH_URL");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function buildAuthEmail(
  purpose: AuthEmailPurpose,
  url: string,
): Promise<Omit<EmailMessage, "recipient">> {
  const callbackRoute =
    purpose === "verification" ? "verify-email" : "reset-password";
  const locale = resolveAuthEmailLocale(url, callbackRoute, applicationUrl);
  const { t } = await getT("common", { lng: locale });
  const key =
    purpose === "verification"
      ? "emails.verification"
      : "emails.passwordReset";
  const subject = t(`${key}.subject`);
  const title = t(`${key}.title`);
  const introduction = t(`${key}.introduction`);
  const action = t(`${key}.action`);
  const expiry = t(`${key}.expiry`);
  const ignore = t(`${key}.ignore`);
  const safeUrl = escapeHtml(url);

  return {
    subject,
    text: [title, "", introduction, `${action}: ${url}`, "", expiry, ignore].join(
      "\n",
    ),
    html: [
      '<div style="margin:0;background:#f4f3ee;padding:32px 20px;color:#11130f;font-family:Arial,Helvetica,sans-serif">',
      '<div style="margin:0 auto;max-width:560px;background:#ffffff;padding:32px">',
      `<h1 style="margin:0 0 20px;font-size:30px;line-height:1.1">${escapeHtml(title)}</h1>`,
      `<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${escapeHtml(introduction)}</p>`,
      `<p style="margin:0 0 24px"><a href="${safeUrl}" style="display:inline-block;background:#fcd34d;color:#11130f;padding:13px 18px;text-decoration:none;font-weight:700">${escapeHtml(action)}</a></p>`,
      `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#5d625a">${escapeHtml(expiry)}</p>`,
      `<p style="margin:0;font-size:14px;line-height:1.6;color:#5d625a">${escapeHtml(ignore)}</p>`,
      "</div>",
      "</div>",
    ].join(""),
  };
}

async function deliverAuthEmail(
  purpose: AuthEmailPurpose,
  recipient: string,
  url: string,
) {
  try {
    const message = await buildAuthEmail(purpose, url);
    const delivered = await emailTransport.send({ recipient, ...message });

    if (delivered) {
      return;
    }
  } catch {
    // Deliberately handled below without retaining provider or message details.
  }

  console.error({
    event: "email_delivery_failed",
    purpose,
    transport: emailTransport.kind,
  });
}

export async function sendVerificationEmail(
  recipient: string,
  url: string,
) {
  await deliverAuthEmail("verification", recipient, url);
}

export async function sendPasswordResetEmail(
  recipient: string,
  url: string,
) {
  await deliverAuthEmail("password_reset", recipient, url);
}
