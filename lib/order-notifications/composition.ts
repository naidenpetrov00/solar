import "server-only";

import { eq } from "drizzle-orm";
import type { TFunction } from "i18next";

import { db } from "@/db";
import { orderNotificationOutbox, salesOrder } from "@/db/schema";
import { getT } from "@/i18n.server";
import type { EmailMessage } from "@/lib/email/delivery";
import {
  escapeEmailHtml,
  renderEmailFrame,
} from "@/lib/email/template-frame";
import { isCatalogLocale } from "@/lib/catalog/model";
import {
  isOrderNotificationKind,
  type OrderNotificationErrorCode,
} from "@/lib/order-notifications/model";
import { isOrderPaymentMethod } from "@/lib/orders/model";
import { OrderError } from "@/lib/orders/errors";
import { loadOrderRevisionAggregate } from "@/lib/orders/order-repository";
import { getPublicSiteUrl } from "@/lib/server-env";

type OutboxRow = typeof orderNotificationOutbox.$inferSelect;

export class NotificationCompositionError extends Error {
  constructor(
    readonly code: Extract<
      OrderNotificationErrorCode,
      "TEMPLATE_UNSUPPORTED" | "SNAPSHOT_INVALID" | "COMPOSITION_FAILED"
    >,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "NotificationCompositionError";
  }
}

function money(minor: bigint) {
  const sign = minor < BigInt(0) ? "−" : "";
  const absolute = minor < BigInt(0) ? -minor : minor;
  return `${sign}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")} EUR`;
}

function paragraph(value: string) {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${escapeEmailHtml(value)}</p>`;
}

function row(label: string, value: string) {
  return `<tr><th scope="row" style="padding:8px 12px 8px 0;text-align:left;vertical-align:top">${escapeEmailHtml(label)}</th><td style="padding:8px 0;vertical-align:top">${escapeEmailHtml(value)}</td></tr>`;
}

function translationValue(
  translate: TFunction,
  key: string,
  options?: Record<string, unknown>,
) {
  const value = translate(key, options);
  if (typeof value !== "string" || !value || value === key) {
    throw new NotificationCompositionError("TEMPLATE_UNSUPPORTED", false);
  }
  return value;
}

function validateIntent(row: OutboxRow) {
  if (
    !isOrderNotificationKind(row.notificationKind) ||
    !isCatalogLocale(row.locale) ||
    (row.recipientType === "internal" && row.templateVersion !== 1) ||
    (row.recipientType === "customer" &&
      row.templateVersion !== 1 &&
      row.templateVersion !== 2) ||
    (row.recipientType !== "customer" && row.recipientType !== "internal") ||
    (row.templateVersion === 1 && row.customerViewOrderUrl !== null) ||
    (row.recipientType === "internal" && row.customerViewOrderUrl !== null)
  ) {
    throw new NotificationCompositionError("TEMPLATE_UNSUPPORTED", false);
  }
  const customer = row.recipientType === "customer";
  const internal = row.recipientType === "internal";
  if (
    (customer &&
      (!row.customerRecipientName ||
        !row.customerRecipientEmail ||
        row.internalRecipientName ||
        row.internalRecipientEmail ||
        row.recipientConfigurationId)) ||
    (internal &&
      (!row.internalRecipientName ||
        !row.internalRecipientEmail ||
        !row.recipientConfigurationId ||
        row.customerRecipientName ||
        row.customerRecipientEmail)) ||
    (!customer && !internal)
  ) {
    throw new NotificationCompositionError("SNAPSHOT_INVALID", false);
  }
}

export async function composeOrderNotification(
  intent: OutboxRow,
): Promise<EmailMessage> {
  validateIntent(intent);
  let aggregate: Awaited<ReturnType<typeof loadOrderRevisionAggregate>>;
  let orderRows: Array<{ orderNumber: string }>;
  try {
    [aggregate, orderRows] = await Promise.all([
      loadOrderRevisionAggregate(db, intent.orderId, intent.revisionNumber),
      db
        .select({ orderNumber: salesOrder.orderNumber })
        .from(salesOrder)
        .where(eq(salesOrder.id, intent.orderId))
        .limit(1),
    ]);
  } catch (error) {
    if (error instanceof OrderError && error.code === "NOT_FOUND") {
      throw new NotificationCompositionError("SNAPSHOT_INVALID", false);
    }
    throw error;
  }
  const { revision, items } = aggregate;
  const order = orderRows[0];
  if (
    !order ||
    revision.id !== intent.revisionId ||
    revision.revisionNumber !== intent.revisionNumber ||
    revision.locale !== intent.locale ||
    !isOrderPaymentMethod(revision.paymentMethod) ||
    !items.length ||
    items.some(
      (item) =>
        !item.localizedTitle ||
        !item.sku ||
        !isCatalogLocale(item.titleLocale) ||
        item.titleLocale !== intent.locale ||
        item.quantity < 1 ||
        item.finalUnitGrossMinor <= BigInt(0) ||
        item.lineGrossMinor <= BigInt(0),
    ) ||
    revision.totalGrossMinor <= BigInt(0)
  ) {
    throw new NotificationCompositionError("SNAPSHOT_INVALID", false);
  }
  if (
    intent.recipientType === "customer" &&
    (intent.customerRecipientName !== revision.customerName ||
      intent.customerRecipientEmail !== revision.customerEmail)
  ) {
    throw new NotificationCompositionError("SNAPSHOT_INVALID", false);
  }

  const language = intent.recipientType === "internal" ? "bg" : intent.locale;
  let translate: TFunction;
  try {
    ({ t: translate } = await getT(["emails"], { lng: language }));
  } catch {
    throw new NotificationCompositionError("COMPOSITION_FAILED", true);
  }
  const base = `emails:emails.orderNotifications.v${intent.templateVersion}`;
  const kindBase = `${base}.${intent.notificationKind}`;
  const tr = (key: string, options?: Record<string, unknown>) =>
    translationValue(translate, key, options);
  const subject = tr(`${kindBase}.subject`, { orderNumber: order.orderNumber });
  const title = tr(`${kindBase}.title`);
  const introduction = tr(`${kindBase}.introduction`);
  const recipient =
    intent.recipientType === "customer"
      ? intent.customerRecipientEmail!
      : intent.internalRecipientEmail!;
  const itemPlain = items.map((item) => {
    const promotion = item.promotionPublicLabel
      ? ` — ${tr(`${base}.common.promotion`)}: ${item.promotionPublicLabel}`
      : "";
    return `- ${item.localizedTitle} (${item.sku}) — ${tr(`${base}.common.quantity`)}: ${item.quantity}; ${tr(`${base}.common.unitPrice`)}: ${money(item.finalUnitGrossMinor)}; ${tr(`${base}.common.lineTotal`)}: ${money(item.lineGrossMinor)}${promotion}`;
  });
  const itemHtml = items
    .map((item) => {
      const promotion = item.promotionPublicLabel
        ? `<br><span style="color:#5d625a">${escapeEmailHtml(tr(`${base}.common.promotion`))}: ${escapeEmailHtml(item.promotionPublicLabel)}</span>`
        : "";
      return `<tr><td style="padding:10px 12px 10px 0">${escapeEmailHtml(item.localizedTitle)}<br><span style="color:#5d625a">${escapeEmailHtml(item.sku)}</span>${promotion}</td><td style="padding:10px 12px;text-align:center">${item.quantity}</td><td style="padding:10px 12px;text-align:right">${escapeEmailHtml(money(item.finalUnitGrossMinor))}</td><td style="padding:10px 0;text-align:right">${escapeEmailHtml(money(item.lineGrossMinor))}</td></tr>`;
    })
    .join("");
  const summary = [
    [tr(`${base}.common.subtotal`), money(revision.catalogSubtotalGrossMinor)],
    [tr(`${base}.common.promotionDiscount`), money(-revision.promotionDiscountGrossMinor)],
    [tr(`${base}.common.itemAdjustments`), money(revision.itemAdjustmentGrossMinor)],
    [tr(`${base}.common.orderAdjustments`), money(revision.orderAdjustmentGrossMinor)],
    [tr(`${base}.common.net`), money(revision.totalNetMinor)],
    [tr(`${base}.common.vat`), money(revision.totalVatMinor)],
    [tr(`${base}.common.total`), money(revision.totalGrossMinor)],
  ] as const;
  const paymentMethod = tr(
    `${base}.common.paymentMethods.${revision.paymentMethod}`,
  );
  const plain = [
    title,
    "",
    introduction,
    `${tr(`${base}.common.orderNumber`)}: ${order.orderNumber}`,
    `${tr(`${base}.common.paymentMethod`)}: ${paymentMethod}`,
    "",
    tr(`${base}.common.items`),
    ...itemPlain,
    "",
    ...summary.map(([label, value]) => `${label}: ${value}`),
  ];
  const html = [
    `<h1 style="margin:0 0 20px;font-size:30px;line-height:1.1">${escapeEmailHtml(title)}</h1>`,
    paragraph(introduction),
    `<table style="width:100%;border-collapse:collapse;margin:0 0 20px"><tbody>${row(tr(`${base}.common.orderNumber`), order.orderNumber)}${row(tr(`${base}.common.paymentMethod`), paymentMethod)}</tbody></table>`,
    `<h2 style="margin:24px 0 8px;font-size:21px">${escapeEmailHtml(tr(`${base}.common.items`))}</h2>`,
    `<table style="width:100%;border-collapse:collapse;margin:0 0 20px"><thead><tr><th scope="col" style="padding:8px 12px 8px 0;text-align:left">${escapeEmailHtml(tr(`${base}.common.product`))}</th><th scope="col" style="padding:8px 12px;text-align:center">${escapeEmailHtml(tr(`${base}.common.quantity`))}</th><th scope="col" style="padding:8px 12px;text-align:right">${escapeEmailHtml(tr(`${base}.common.unitPrice`))}</th><th scope="col" style="padding:8px 0;text-align:right">${escapeEmailHtml(tr(`${base}.common.lineTotal`))}</th></tr></thead><tbody>${itemHtml}</tbody></table>`,
    `<table style="width:100%;border-collapse:collapse;margin:0 0 20px"><tbody>${summary.map(([label, value]) => row(label, value)).join("")}</tbody></table>`,
  ];

  if (intent.recipientType === "customer") {
    if (intent.templateVersion === 2 && intent.customerViewOrderUrl) {
      const viewOrder = tr(`${base}.common.viewOrder`);
      plain.push("", `${viewOrder}: ${intent.customerViewOrderUrl}`);
      html.push(
        `<p style="margin:24px 0 0"><a href="${escapeEmailHtml(intent.customerViewOrderUrl)}" style="display:inline-block;background:#fcd34d;color:#11130f;padding:13px 18px;text-decoration:none;font-weight:700">${escapeEmailHtml(viewOrder)}</a></p>`,
      );
    }
    plain.push("", tr(`${kindBase}.closing`));
    html.push(paragraph(tr(`${kindBase}.closing`)));
  } else {
    const details = [
      [tr(`${base}.internal.customerName`), revision.customerName],
      [tr(`${base}.internal.phone`), revision.customerPhone],
      [tr(`${base}.internal.email`), revision.customerEmail],
      [tr(`${base}.internal.city`), revision.city],
      [tr(`${base}.internal.deliveryAddress`), revision.deliveryAddress],
      [tr(`${base}.internal.note`), revision.customerNote ?? tr(`${base}.internal.noNote`)],
    ] as const;
    const dashboardUrl = new URL(
      `/dashboard/orders/${intent.orderId}`,
      getPublicSiteUrl(),
    ).toString();
    plain.push(
      "",
      ...details.map(([label, value]) => `${label}: ${value}`),
      "",
      `${tr(`${base}.internal.openOrder`)}: ${dashboardUrl}`,
    );
    html.push(
      `<h2 style="margin:24px 0 8px;font-size:21px">${escapeEmailHtml(tr(`${base}.internal.customerDetails`))}</h2>`,
      `<table style="width:100%;border-collapse:collapse;margin:0 0 20px"><tbody>${details.map(([label, value]) => row(label, value)).join("")}</tbody></table>`,
      `<p style="margin:24px 0 0"><a href="${escapeEmailHtml(dashboardUrl)}" style="display:inline-block;background:#fcd34d;color:#11130f;padding:13px 18px;text-decoration:none;font-weight:700">${escapeEmailHtml(tr(`${base}.internal.openOrder`))}</a></p>`,
    );
  }
  const host = getPublicSiteUrl().hostname.replace(/[^a-z0-9.-]/giu, "") || "localhost";
  return {
    recipient,
    messageId: `<order-notification-${intent.id}@${host}>`,
    subject,
    text: plain.join("\n"),
    html: renderEmailFrame(html.join(""), 640),
  };
}
