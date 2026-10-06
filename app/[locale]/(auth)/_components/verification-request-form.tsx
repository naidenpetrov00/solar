"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { validateEmail } from "@/lib/auth-validation";

export type VerificationRequestLabels = {
  email: string;
  submit: string;
  submitting: string;
  accepted: string;
  validationSummary: string;
  emailRequired: string;
  emailInvalid: string;
  rateLimited: string;
  genericError: string;
};

export function VerificationRequestForm({
  callbackURL,
  initialEmail,
  labels,
}: {
  callbackURL: string;
  initialEmail?: string;
  labels: VerificationRequestLabels;
}) {
  const id = useId();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const focusSummary = () => {
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = (initialEmail ?? String(data.get("email") ?? "")).trim();
    const emailError = validateEmail(email);

    setFieldError(null);
    setFormError(null);
    setStatus(null);

    if (emailError) {
      setFieldError(
        emailError === "required" ? labels.emailRequired : labels.emailInvalid,
      );
      focusSummary();
      return;
    }

    setPending(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL,
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

      setStatus(labels.accepted);
    } catch {
      setFormError(labels.genericError);
      focusSummary();
    } finally {
      setPending(false);
    }
  };

  const errors = [fieldError, formError].filter(
    (error): error is string => Boolean(error),
  );
  const emailId = `${id}-verification-email`;
  const errorId = `${id}-verification-email-error`;

  return (
    <form
      className="auth-compact-form"
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
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      {initialEmail ? null : (
        <div className="auth-field">
          <label htmlFor={emailId}>{labels.email}</label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? errorId : undefined}
            onChange={() => {
              setFieldError(null);
              setFormError(null);
              setStatus(null);
            }}
          />
          {fieldError ? (
            <p id={errorId} className="auth-field-error">{fieldError}</p>
          ) : null}
        </div>
      )}

      <button className="auth-secondary-action" type="submit" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </button>
      <p className="auth-inline-status" role="status" aria-live="polite" aria-atomic="true">
        {status ?? (pending ? labels.submitting : "")}
      </p>
    </form>
  );
}
