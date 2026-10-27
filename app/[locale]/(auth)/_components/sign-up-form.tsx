"use client";

import { Button } from "@/components/button";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-validation";
import { useSignUpSubmission } from "./use-sign-up-submission";
import { type VerificationRequestLabels } from "./verification-request-form";
import {
  type SocialSignInConfig,
  type SocialSignInLabels,
} from "./social-sign-in";
import { SocialSignInOptions } from "./social-sign-in-options";
import { SignUpConfirmation } from "./sign-up-confirmation";

export type SignUpFormLabels = {
  name: string;
  email: string;
  password: string;
  passwordHint: string;
  confirmPassword: string;
  submit: string;
  submitting: string;
  validationSummary: string;
  nameRequired: string;
  nameLength: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordLength: string;
  passwordMismatch: string;
  rateLimited: string;
  genericError: string;
  checkEmailTitle: string;
  checkEmailDescription: string;
  deliveryHelp: string;
  google: SocialSignInLabels;
  facebook: SocialSignInLabels;
  verificationRequest: VerificationRequestLabels;
};

export function SignUpForm({
  labels,
  verificationCallbackURL,
  forgotPasswordHref,
  socialSignIn,
}: {
  labels: SignUpFormLabels;
  verificationCallbackURL: string;
  forgotPasswordHref: string;
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
    registeredEmail,
    clearFieldError,
    handleSubmit,
  } = useSignUpSubmission(labels, verificationCallbackURL);

  if (registeredEmail) {
    return (
      <SignUpConfirmation
        email={registeredEmail}
        callbackURL={verificationCallbackURL}
        headingRef={statusHeadingRef}
        labels={labels}
      />
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
        <label htmlFor="sign-up-name">{labels.name}</label>
        <input
          id="sign-up-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? "sign-up-name-error" : undefined}
          onChange={() => clearFieldError("name")}
        />
        {fieldErrors.name ? (
          <p id="sign-up-name-error" className="auth-field-error">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="auth-field">
        <label htmlFor="sign-up-email">{labels.email}</label>
        <input
          id="sign-up-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={
            fieldErrors.email ? "sign-up-email-error" : undefined
          }
          onChange={() => clearFieldError("email")}
        />
        {fieldErrors.email ? (
          <p id="sign-up-email-error" className="auth-field-error">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="auth-field">
        <label htmlFor="sign-up-password">{labels.password}</label>
        <input
          id="sign-up-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={`sign-up-password-hint${fieldErrors.password ? " sign-up-password-error" : ""}`}
          onChange={() => clearFieldError("password")}
        />
        <p id="sign-up-password-hint" className="auth-field-hint">
          {labels.passwordHint}
        </p>
        {fieldErrors.password ? (
          <p id="sign-up-password-error" className="auth-field-error">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="auth-field">
        <label htmlFor="sign-up-password-confirmation">
          {labels.confirmPassword}
        </label>
        <input
          id="sign-up-password-confirmation"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          aria-describedby={
            fieldErrors.confirmPassword
              ? "sign-up-password-confirmation-error"
              : undefined
          }
          onChange={() => clearFieldError("confirmPassword")}
        />
        {fieldErrors.confirmPassword ? (
          <p
            id="sign-up-password-confirmation-error"
            className="auth-field-error"
          >
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

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
