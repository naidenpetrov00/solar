import "server-only";

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderEmailFrame(content: string, maxWidth = 560) {
  return [
    '<div style="margin:0;background:#f4f3ee;padding:32px 20px;color:#11130f;font-family:Arial,Helvetica,sans-serif">',
    `<div style="margin:0 auto;max-width:${maxWidth}px;background:#ffffff;padding:32px">`,
    content,
    "</div>",
    "</div>",
  ].join("");
}
