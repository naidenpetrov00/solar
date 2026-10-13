"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

function GoogleMark() {
  return (
    <svg
      className="auth-google-mark"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.567 2.683-3.875 2.683-6.614Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.957-2.181l-2.909-2.258c-.806.54-1.836.86-3.048.86-2.345 0-4.329-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.348 2.828.956 4.039l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.442 1.345l2.582-2.582C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.671 5.165 6.655 3.58 9 3.58Z"
      />
    </svg>
  );
}

export type GoogleSignInLabels = {
  continueWithGoogle: string;
  unavailable: string;
  redirecting: string;
  failureTitle: string;
  failureDescription: string;
  accountNotLinkedTitle: string;
  accountNotLinkedDescription: string;
  recoverySteps: {
    resetPassword: string;
    signIn: string;
    verifyEmail: string;
    retry: string;
  };
};

export function GoogleSignIn({
  enabled,
  callbackURL,
  errorCallbackURL,
  errorCode,
  forgotPasswordHref,
  labels,
}: {
  enabled: boolean;
  callbackURL: string;
  errorCallbackURL: string;
  errorCode?: string;
  forgotPasswordHref: string;
  labels: GoogleSignInLabels;
}) {
  const failureRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const failure = requestFailed || Boolean(errorCode);
  const accountNotLinked = errorCode === "account_not_linked";
  const descriptionId = "google-sign-in-unavailable";

  useEffect(() => {
    if (failure) {
      failureRef.current?.focus();
    }
  }, [failure]);

  const handleGoogleSignIn = async () => {
    if (!enabled || pending) {
      return;
    }

    setRequestFailed(false);
    setPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL,
      });

      if (result.error) {
        setRequestFailed(true);
        setPending(false);
      }
    } catch {
      setRequestFailed(true);
      setPending(false);
    }
  };

  return (
    <div className="auth-social" aria-busy={pending}>
      {failure ? (
        <div ref={failureRef} className="auth-oauth-failure" role="alert" tabIndex={-1}>
          <h2>{accountNotLinked ? labels.accountNotLinkedTitle : labels.failureTitle}</h2>
          <p>{accountNotLinked ? labels.accountNotLinkedDescription : labels.failureDescription}</p>
          {accountNotLinked ? (
            <ol>
              <li><Link href={forgotPasswordHref}>{labels.recoverySteps.resetPassword}</Link></li>
              <li>{labels.recoverySteps.signIn}</li>
              <li>{labels.recoverySteps.verifyEmail}</li>
              <li>{labels.recoverySteps.retry}</li>
            </ol>
          ) : null}
        </div>
      ) : null}

      <button
        className="auth-secondary-action auth-google-action"
        type="button"
        disabled={!enabled || pending}
        aria-describedby={!enabled ? descriptionId : undefined}
        onClick={handleGoogleSignIn}
      >
        <GoogleMark />
        {pending ? labels.redirecting : labels.continueWithGoogle}
      </button>
      {!enabled ? <p id={descriptionId} className="auth-inline-status">{labels.unavailable}</p> : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pending ? labels.redirecting : ""}
      </p>
    </div>
  );
}
