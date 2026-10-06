"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { validateEmail } from "@/lib/auth-validation";

export type ForgotPasswordFormLabels = {
  email: string;
  submit: string;
  submitting: string;
  validationSummary: string;
  emailRequired: string;
  emailInvalid: string;
  rateLimited: string;
  genericError: string;
  successTitle: string;
  successDescription: string;
};

export function ForgotPasswordForm({
  labels,
  resetCallbackURL,
}: {
  labels: ForgotPasswordFormLabels;
  resetCallbackURL: string;
}) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (complete) {
      statusHeadingRef.current?.focus();
    }
  }, [complete]);

  const focusSummary = () => {
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const emailError = validateEmail(email);

    setFieldError(null);
    setFormError(null);

    if (emailError) {
      setFieldError(
        emailError === "required" ? labels.emailRequired : labels.emailInvalid,
      );
      focusSummary();
      return;
    }

    setPending(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: resetCallbackURL,
      });

      if (result.error) {
        setFormError(
          result.error.status === 429
            ? labels.rateLimited
            : labels.genericError,
        );
        focusSummary();
        return;
      }

      setComplete(true);
    } catch {
      setFormError(labels.genericError);
      focusSummary();
    } finally {
      setPending(false);
    }
  };

  if (complete) {
    return (
      <div className="auth-state" data-tone="success" role="status">
        <span className="auth-state-mark" aria-hidden="true" />
        <div>
          <h2 ref={statusHeadingRef} tabIndex={-1}>{labels.successTitle}</h2>
          <p>{labels.successDescription}</p>
        </div>
      </div>
    );
  }

  const errors = [fieldError, formError].filter(
    (error): error is string => Boolean(error),
  );

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit} aria-busy={pending}>
      {errors.length > 0 ? (
        <div ref={summaryRef} className="auth-error-summary" role="alert" tabIndex={-1}>
          <p>{labels.validationSummary}</p>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      ) : null}

      <div className="auth-field">
        <label htmlFor="forgot-password-email">{labels.email}</label>
        <input
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "forgot-password-email-error" : undefined}
          onChange={() => {
            setFieldError(null);
            setFormError(null);
          }}
        />
        {fieldError ? (
          <p id="forgot-password-email-error" className="auth-field-error">{fieldError}</p>
        ) : null}
      </div>

      <button className="auth-primary-action" type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </button>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {pending ? labels.submitting : ""}
      </p>
    </form>
  );
}
