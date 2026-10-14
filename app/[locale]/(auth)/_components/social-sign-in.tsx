"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

type SocialProvider = "google" | "facebook";

function GoogleMark() {
  return (
    <svg
      className="auth-social-mark"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.567 2.683-3.875 2.683-6.614Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.957-2.181l-2.909-2.258c-.806.54-1.836.86-3.048.86-2.345 0-4.329-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.168.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.348 2.828.956 4.039l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.442 1.345l2.582-2.582C13.463.891 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.671 5.165 6.655 3.58 9 3.58Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg
      className="auth-social-mark"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.03 4.39 11.03 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.97.94-1.97 1.9v2.28h3.35l-.54 3.49h-2.81V24C19.61 23.1 24 18.1 24 12.07Z" />
      <path fill="#fff" d="m16.68 15.56.54-3.49h-3.35V9.79c0-.95.47-1.87 1.97-1.87h1.52V4.95s-1.38-.24-2.69-.24c-2.75 0-4.54 1.67-4.54 4.7v2.66H7.08v3.49h3.05V24a12.4 12.4 0 0 0 3.74 0v-8.44h2.81Z" />
    </svg>
  );
}

function ProviderMark({ provider }: { provider: SocialProvider }) {
  return provider === "google" ? <GoogleMark /> : <FacebookMark />;
}

export type SocialSignInLabels = {
  continue: string;
  unavailable: string;
  redirecting: string;
  failureTitle: string;
  failureDescription: string;
  emailNotFoundTitle: string;
  emailNotFoundDescription: string;
  emailNotVerifiedTitle: string;
  emailNotVerifiedDescription: string;
  accountNotLinkedTitle: string;
  accountNotLinkedDescription: string;
  passwordRecovery: string;
  recoverySteps?: {
    resetPassword: string;
    signIn: string;
    verifyEmail: string;
    retry: string;
  };
};

export type SocialSignInConfig = {
  enabled: boolean;
  callbackURL: string;
  errorCallbackURL: string;
  errorCode?: string;
};

export function SocialSignIn({
  provider,
  enabled,
  callbackURL,
  errorCallbackURL,
  errorCode,
  forgotPasswordHref,
  labels,
}: SocialSignInConfig & {
  provider: SocialProvider;
  forgotPasswordHref: string;
  labels: SocialSignInLabels;
}) {
  const failureRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const failure = requestFailed || Boolean(errorCode);
  const descriptionId = `${provider}-sign-in-unavailable`;

  const errorContent = (() => {
    switch (errorCode) {
      case "account_not_linked":
        return {
          title: labels.accountNotLinkedTitle,
          description: labels.accountNotLinkedDescription,
          showGoogleRecovery: provider === "google",
        };
      case "email_not_found":
        return {
          title: labels.emailNotFoundTitle,
          description: labels.emailNotFoundDescription,
          showGoogleRecovery: false,
        };
      case "email_not_verified":
        return {
          title: labels.emailNotVerifiedTitle,
          description: labels.emailNotVerifiedDescription,
          showGoogleRecovery: false,
        };
      default:
        return {
          title: labels.failureTitle,
          description: labels.failureDescription,
          showGoogleRecovery: false,
        };
    }
  })();

  useEffect(() => {
    if (failure) {
      failureRef.current?.focus();
    }
  }, [failure]);

  const handleSocialSignIn = async () => {
    if (!enabled || pending) {
      return;
    }

    setRequestFailed(false);
    setPending(true);

    try {
      const result = await authClient.signIn.social({
        provider,
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
    <div className="auth-social-option" aria-busy={pending}>
      {failure ? (
        <div ref={failureRef} className="auth-oauth-failure" role="alert" tabIndex={-1}>
          <h2>{errorContent.title}</h2>
          <p>{errorContent.description}</p>
          {errorContent.showGoogleRecovery && labels.recoverySteps ? (
            <ol>
              <li><Link href={forgotPasswordHref}>{labels.recoverySteps.resetPassword}</Link></li>
              <li>{labels.recoverySteps.signIn}</li>
              <li>{labels.recoverySteps.verifyEmail}</li>
              <li>{labels.recoverySteps.retry}</li>
            </ol>
          ) : errorCode === "account_not_linked" ? (
            <p><Link href={forgotPasswordHref}>{labels.passwordRecovery}</Link></p>
          ) : null}
        </div>
      ) : null}

      <button
        className="auth-secondary-action auth-social-action"
        type="button"
        disabled={!enabled || pending}
        aria-describedby={!enabled ? descriptionId : undefined}
        onClick={handleSocialSignIn}
      >
        <ProviderMark provider={provider} />
        {pending ? labels.redirecting : labels.continue}
      </button>
      {!enabled ? <p id={descriptionId} className="auth-inline-status">{labels.unavailable}</p> : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pending ? labels.redirecting : ""}
      </p>
    </div>
  );
}
