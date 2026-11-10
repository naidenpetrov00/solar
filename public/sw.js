/* A deliberately narrow service worker: push display and safe click routing only. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function validPayload(value) {
  if (!value || typeof value !== "object" || value.version !== 1) return null;
  const fields = [value.title, value.body, value.tag, value.targetPath];
  if (fields.some((field) => typeof field !== "string" || !field || field.length > 512)) return null;
  try {
    const target = new URL(value.targetPath, self.location.origin);
    if (target.origin !== self.location.origin || !value.targetPath.startsWith("/")) return null;
    return { ...value, target: target.href };
  } catch { return null; }
}

self.addEventListener("push", (event) => {
  let payload = null;
  try { payload = validPayload(event.data?.json()); } catch { payload = null; }
  if (!payload) return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    renotify: false,
    data: { target: payload.target },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawTarget = event.notification.data?.target;
  event.waitUntil((async () => {
    let target;
    try {
      target = new URL(rawTarget, self.location.origin);
      if (target.origin !== self.location.origin) return;
    } catch { return; }
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const exact = windows.find((client) => client.url === target.href);
    if (exact) { await exact.focus(); return; }
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target.href); await existing.focus(); return; }
    await self.clients.openWindow(target.href);
  })());
});
