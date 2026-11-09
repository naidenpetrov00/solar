"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { WebPushPublicConfig } from "@/lib/web-push/model";
import {
  disableBrowserPushSubscriptionAction,
  enableBrowserPushSubscriptionAction,
  inspectBrowserPushSubscriptionAction,
  syncBrowserPushLocaleAction,
} from "./web-push-actions";

export type BrowserPushUiState =
  | "checking" | "unsupported" | "unconfigured" | "permission_default"
  | "enabled" | "denied" | "disabled" | "expired"
  | "ownership_mismatch" | "failure";

type LocalState = {
  subscriptionId: string;
  keyFingerprint: string;
  invitationId: string;
};

const storageKey = "solar:web-push:v1";
const invitationPrefix = "solar:web-push-invitation:v1:";

function readLocalState(): LocalState | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<LocalState>;
    return candidate.subscriptionId && candidate.keyFingerprint && candidate.invitationId
      ? candidate as LocalState : null;
  } catch { return null; }
}

function writeLocalState(value: LocalState | null) {
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  } catch { /* Storage can be unavailable in private browsing. */ }
}

function supported() {
  return window.isSecureContext && "serviceWorker" in navigator &&
    "PushManager" in window && "Notification" in window;
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const bytes = atob((value + padding).replace(/-/gu, "+").replace(/_/gu, "/"));
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

function subscriptionInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("INVALID");
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

async function unsubscribeCurrent(
  registration: ServiceWorkerRegistration,
  subscription: PushSubscription,
) {
  await subscription.unsubscribe();
  if (await registration.pushManager.getSubscription()) {
    throw new Error("SUBSCRIPTION_STILL_ACTIVE");
  }
}

export function useBrowserPush(locale: string, config?: WebPushPublicConfig) {
  const [state, setState] = useState<BrowserPushUiState>("checking");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"enabled" | "disabled" | null>(null);
  const [invitationDismissed, setInvitationDismissed] = useState(true);
  const localRef = useRef<LocalState | null>(null);

  const inspect = useCallback(async () => {
    setFeedback(null);
    if (config === undefined) {
      if (supported()) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (registration && subscription) {
          await unsubscribeCurrent(registration, subscription).catch(() => undefined);
        }
        writeLocalState(null); localRef.current = null;
      }
      setState("unconfigured");
      return;
    }
    if (!config.configured) { setState("unconfigured"); return; }
    if (!supported()) { setState("unsupported"); return; }
    localRef.current = readLocalState();
    try {
      setInvitationDismissed(
        localStorage.getItem(invitationPrefix + config.invitationId) === "dismissed",
      );
    } catch { setInvitationDismissed(false); }
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription() ?? null;
    if (!subscription) {
      setState(Notification.permission === "denied" ? "denied" :
        Notification.permission === "default" ? "permission_default" :
        localRef.current ? "expired" : "disabled");
      return;
    }
    await registration?.update().catch(() => undefined);
    const result = await inspectBrowserPushSubscriptionAction(subscription.endpoint);
    if (result.status === "error") {
      setState(result.code === "FORBIDDEN" ? "disabled" : "failure");
      return;
    }
    const inspection = result.inspection;
    if (inspection.state === "ownership_mismatch" || inspection.state === "unknown") {
      if (registration) await unsubscribeCurrent(registration, subscription);
      writeLocalState(null);
      localRef.current = null;
      setState(inspection.state === "ownership_mismatch" ? "ownership_mismatch" : "disabled");
      return;
    }
    if (Notification.permission === "denied") {
      await disableBrowserPushSubscriptionAction(inspection.subscriptionId).catch(() => undefined);
      if (registration) await unsubscribeCurrent(registration, subscription).catch(() => undefined);
      writeLocalState(null); localRef.current = null;
      setState("denied");
      return;
    }
    localRef.current = {
      subscriptionId: inspection.subscriptionId,
      keyFingerprint: config.keyFingerprint,
      invitationId: config.invitationId,
    };
    writeLocalState(localRef.current);
    setState(
      inspection.state === "owned_active" ? "enabled" :
        inspection.state === "owned_disabled" ? "disabled" : "expired",
    );
  }, [config]);

  const retry = useCallback(async () => {
    try { await inspect(); }
    catch { setState("failure"); }
  }, [inspect]);

  useEffect(() => { void retry(); }, [retry]);

  useEffect(() => {
    const subscriptionId = localRef.current?.subscriptionId;
    if (state === "enabled" && subscriptionId) {
      void syncBrowserPushLocaleAction(subscriptionId, locale);
    }
  }, [locale, state]);

  const enable = useCallback(async () => {
    if (!config?.configured || !supported()) return;
    setBusy(true); setFeedback(null);
    try {
      let registration = await navigator.serviceWorker.getRegistration("/");
      let previous = await registration?.pushManager.getSubscription() ?? null;
      if (state === "expired" && previous) {
        if (!registration) throw new Error("REGISTRATION_MISSING");
        await unsubscribeCurrent(registration, previous);
        previous = null;
      }
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/", updateViaCache: "none",
      });
      await registration.update();
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") { setState(permission === "denied" ? "denied" : "permission_default"); return; }
      }
      if (Notification.permission !== "granted") { setState("denied"); return; }
      const subscription = previous ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(config.publicKey),
      });
      const result = await enableBrowserPushSubscriptionAction({
        subscription: subscriptionInput(subscription),
        locale,
        previousSubscriptionId: localRef.current?.subscriptionId,
      });
      if (result.status === "error") {
        await unsubscribeCurrent(registration, subscription).catch(() => undefined);
        writeLocalState(null); localRef.current = null;
        setState(result.code === "OWNERSHIP_MISMATCH" ? "ownership_mismatch" : "failure");
        return;
      }
      localRef.current = {
        subscriptionId: result.subscriptionId!,
        keyFingerprint: config.keyFingerprint,
        invitationId: config.invitationId,
      };
      writeLocalState(localRef.current);
      setInvitationDismissed(true); setState("enabled"); setFeedback("enabled");
    } catch { setState("failure"); }
    finally { setBusy(false); }
  }, [config, locale, state]);

  const disable = useCallback(async () => {
    setBusy(true); setFeedback(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      const id = localRef.current?.subscriptionId;
      const result = id ? await disableBrowserPushSubscriptionAction(id) : { status: "success" as const };
      if (registration && subscription) {
        await unsubscribeCurrent(registration, subscription).catch(() => undefined);
      }
      writeLocalState(null); localRef.current = null;
      if (result.status === "error") setState("failure");
      else { setState("disabled"); setFeedback("disabled"); }
    } catch { setState("failure"); }
    finally { setBusy(false); }
  }, []);

  const cleanupForLogout = useCallback(async () => {
    try {
      if (!supported()) return;
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      const id = localRef.current?.subscriptionId ?? readLocalState()?.subscriptionId;
      if (id) await disableBrowserPushSubscriptionAction(id).catch(() => undefined);
      if (registration && subscription) {
        await unsubscribeCurrent(registration, subscription).catch(() => undefined);
      }
    } catch {
      // Sign-out must continue; an invalidated local endpoint cannot display pushes.
    } finally {
      writeLocalState(null); localRef.current = null;
    }
  }, []);

  const dismissInvitation = useCallback(() => {
    if (config?.configured) {
      try { localStorage.setItem(invitationPrefix + config.invitationId, "dismissed"); }
      catch { /* The invitation remains dismissed for this mounted shell. */ }
    }
    setInvitationDismissed(true);
  }, [config]);

  return {
    state, busy, feedback, enable, disable, retry,
    cleanupForLogout, dismissInvitation,
    invitationVisible: state === "permission_default" && !invitationDismissed,
  };
}
