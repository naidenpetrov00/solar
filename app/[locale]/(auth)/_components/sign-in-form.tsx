"use client";

import Link from "next/link";
import { Button } from "@/components/button";
import { useSignInSubmission } from "./use-sign-in-submission";
import {
  VerificationRequestForm,
  type VerificationRequestLabels,
} from "./verification-request-form";
import {
  type SocialSignInConfig,
  type SocialSignInLabels,
} from "./social-sign-in";
import { SocialSignInOptions } from "./social-sign-in-options";

export type SignInFormLabels = {
  email: string;
  password: string;
  submit: string;
  submitting: string;
  validationSummary: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  invalidCredentials: string;
  rateLimited: string;
  genericError: string;
  forgotPassword: string;
  unverifiedTitle: string;
  unverifiedDescription: string;
  tryAnotherEmail: string;
  google: SocialSignInLabels;
  facebook: SocialSignInLabels;
  verificationRequest: VerificationRequestLabels;
};

export function SignInForm({
  labels,
  returnTo,
  forgotPasswordHref,
  verificationCallbackURL,
  socialSignIn,
}: {
  labels: SignInFormLabels;
  returnTo: string;
  forgotPasswordHref: string;
  verificationCallbackURL: string;
  socialSignIn: {
    google: SocialSignInConfig;
    facebook: SocialSignInConfig;
  };
}) {
  const {
    summaryRef,
    statusHeadingRef,
    fieldErrors,
    formError,
    pending,
    unverifiedEmail,
    setUnverifiedEmail,
    clearFieldError,
    handleSubmit,
  } = useSignInSubmission(labels, returnTo);

  if (unverifiedEmail) {
    return (
      <div className="auth-state" data-tone="neutral" role="status">
        <span className="auth-state-mark" aria-hidden="true" />
        <div>
          <h2 ref={statusHeadingRef} tabIndex={-1}>
            {labels.unverifiedTitle}
          </h2>
          <p>{labels.unverifiedDescription}</p>
        </div>
        <div className="auth-state-content">
          <VerificationRequestForm
            callbackURL={verificationCallbackURL}
            initialEmail={unverifiedEmail}
            labels={labels.verificationRequest}
          />
          <Button
            variant="informational"
            type="button"
            onClick={() => setUnverifiedEmail(null)}
          >
            {labels.tryAnotherEmail}
          </Button>
        </div>
      </div>
    );
  }

  const errors = [
    ...Object.values(fieldErrors),
    ...(formError ? [formError] : []),
  ];

  return (
    <form
      className="auth-form"
      noValidate
      onSubmit={handleSubmit}
      aria-busy={pending}
    >
      {errors.length > 0 ? (
        <div
          ref={summaryRef}
          className="auth-error-summary"
          role="alert"
          tabIndex={-1}
        >
          <p>{labels.validationSummary}</p>
          <ul>
            {errors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="auth-field">
        <label htmlFor="sign-in-email">{labels.email}</label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={
            fieldErrors.email ? "sign-in-email-error" : undefined
          }
          onChange={() => clearFieldError("email")}
        />
        {fieldErrors.email ? (
          <p id="sign-in-email-error" className="auth-field-error">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="auth-field">
        <label htmlFor="sign-in-password">{labels.password}</label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={
            fieldErrors.password ? "sign-in-password-error" : undefined
          }
          onChange={() => clearFieldError("password")}
        />
        {fieldErrors.password ? (
          <p id="sign-in-password-error" className="auth-field-error">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Link className="auth-form-link" href={forgotPasswordHref}>
        {labels.forgotPassword}
      </Link>

      <Button type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
      <SocialSignInOptions
        socialSignIn={socialSignIn}
        labels={labels}
        forgotPasswordHref={forgotPasswordHref}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pending ? labels.submitting : ""}
      </p>
    </form>
  );
}
