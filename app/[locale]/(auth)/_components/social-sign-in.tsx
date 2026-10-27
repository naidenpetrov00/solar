"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";

import { authClient } from "@/lib/auth-client";

import { ProviderMark, type SocialProvider } from "./social-provider-marks";

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
        <div
          ref={failureRef}
          className="auth-oauth-failure"
          role="alert"
          tabIndex={-1}
        >
          <h2>{errorContent.title}</h2>
          <p>{errorContent.description}</p>
          {errorContent.showGoogleRecovery && labels.recoverySteps ? (
            <ol>
              <li>
                <Link href={forgotPasswordHref}>
                  {labels.recoverySteps.resetPassword}
                </Link>
              </li>
              <li>{labels.recoverySteps.signIn}</li>
              <li>{labels.recoverySteps.verifyEmail}</li>
              <li>{labels.recoverySteps.retry}</li>
            </ol>
          ) : errorCode === "account_not_linked" ? (
            <p>
              <Link href={forgotPasswordHref}>{labels.passwordRecovery}</Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        className="auth-social-action"
        variant="secondary"
        type="button"
        disabled={!enabled || pending}
        aria-describedby={!enabled ? descriptionId : undefined}
        onClick={handleSocialSignIn}
      >
        <ProviderMark provider={provider} />
        {pending ? labels.redirecting : labels.continue}
      </Button>
      {!enabled ? (
        <p id={descriptionId} className="auth-inline-status">
          {labels.unavailable}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pending ? labels.redirecting : ""}
      </p>
    </div>
  );
}
