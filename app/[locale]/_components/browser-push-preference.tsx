"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/button";
import type { useBrowserPush } from "./use-browser-push";

type BrowserPush = ReturnType<typeof useBrowserPush>;

export function BrowserPushPreference({
  push,
  fallbackFocusRef,
}: {
  push: BrowserPush;
  fallbackFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useTranslation("notifications");
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const previousState = useRef(push.state);
  useEffect(() => {
    let focusFrame: number | undefined;
    if (previousState.current !== "checking" && previousState.current !== push.state) {
      focusFrame = requestAnimationFrame(() => {
        (actionRef.current ?? fallbackFocusRef.current)?.focus();
      });
    }
    previousState.current = push.state;
    return () => {
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
    };
  }, [fallbackFocusRef, push.state]);
  const canEnable = ["permission_default", "disabled", "expired", "ownership_mismatch"].includes(push.state);
  const error = push.state === "failure" || push.state === "unconfigured";
  return (
    <section className="site-push-preference" aria-labelledby="browser-push-title" aria-busy={push.busy}>
      <div>
        <h3 id="browser-push-title">{t("push.settings.title")}</h3>
        <p role={error ? "alert" : undefined}>{t(`push.states.${push.state}`)}</p>
      </div>
      {canEnable ? (
        <Button ref={actionRef} type="button" disabled={push.busy} onClick={() => void push.enable()}>
          {push.busy ? t("push.actions.enabling") : t("push.actions.enable")}
        </Button>
      ) : push.state === "enabled" ? (
        <Button ref={actionRef} type="button" variant="secondary" disabled={push.busy} onClick={() => void push.disable()}>
          {push.busy ? t("push.actions.disabling") : t("push.actions.disable")}
        </Button>
      ) : error ? (
        <Button ref={actionRef} type="button" variant="secondary" disabled={push.busy} onClick={() => void push.retry()}>
          {t("actions.retry")}
        </Button>
      ) : null}
    </section>
  );
}
