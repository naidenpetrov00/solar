"use client";

import { Button, ButtonLink } from "@/components/button";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-validation";
import { useResetPasswordSubmission } from "./use-reset-password-submission";
export type ResetPasswordFormLabels = {
  password: string;
  passwordHint: string;
  confirmPassword: string;
  submit: string;
  submitting: string;
  validationSummary: string;
  passwordRequired: string;
  passwordLength: string;
  passwordMismatch: string;
  invalidToken: string;
  rateLimited: string;
  genericError: string;
  successTitle: string;
  successDescription: string;
  signIn: string;
};

export function ResetPasswordForm({
  labels,
  token,
  signInHref,
}: {
  labels: ResetPasswordFormLabels;
  token: string;
  signInHref: string;
}) {
  const {
    summaryRef,
    statusHeadingRef,
    fieldErrors,
    formError,
    pending,
    complete,
    clearFieldError,
    handleSubmit,
  } = useResetPasswordSubmission(labels, token);

  if (complete) {
    return (
      <div className="auth-state" data-tone="success" role="status">
        <span className="auth-state-mark" aria-hidden="true" />
        <div>
          <h2 ref={statusHeadingRef} tabIndex={-1}>
            {labels.successTitle}
          </h2>
          <p>{labels.successDescription}</p>
        </div>
        <ButtonLink href={signInHref}>{labels.signIn}</ButtonLink>
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
        <label htmlFor="reset-password">{labels.password}</label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={`reset-password-hint${fieldErrors.password ? " reset-password-error" : ""}`}
          onChange={() => clearFieldError("password")}
        />
        <p id="reset-password-hint" className="auth-field-hint">
          {labels.passwordHint}
        </p>
        {fieldErrors.password ? (
          <p id="reset-password-error" className="auth-field-error">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="auth-field">
        <label htmlFor="reset-password-confirmation">
          {labels.confirmPassword}
        </label>
        <input
          id="reset-password-confirmation"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          aria-describedby={
            fieldErrors.confirmPassword
              ? "reset-password-confirmation-error"
              : undefined
          }
          onChange={() => clearFieldError("confirmPassword")}
        />
        {fieldErrors.confirmPassword ? (
          <p
            id="reset-password-confirmation-error"
            className="auth-field-error"
          >
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pending ? labels.submitting : ""}
      </p>
    </form>
  );
}
