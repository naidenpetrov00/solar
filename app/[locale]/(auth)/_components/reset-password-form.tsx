"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
} from "@/lib/auth-validation";

type FieldName = "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

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
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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

  const clearFieldError = (field: FieldName) => {
    setFormError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const nextErrors: FieldErrors = {};
    const passwordError = validateNewPassword(password);

    if (passwordError === "required") nextErrors.password = labels.passwordRequired;
    if (passwordError === "length") nextErrors.password = labels.passwordLength;
    if (!confirmPassword || confirmPassword !== password) {
      nextErrors.confirmPassword = labels.passwordMismatch;
    }

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      focusSummary();
      return;
    }

    setPending(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setFormError(
          result.error.status === 429
            ? labels.rateLimited
            : result.error.code === "INVALID_TOKEN"
              ? labels.invalidToken
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
        <Link className="auth-primary-action" href={signInHref}>{labels.signIn}</Link>
      </div>
    );
  }

  const errors = [...Object.values(fieldErrors), ...(formError ? [formError] : [])];

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit} aria-busy={pending}>
      {errors.length > 0 ? (
        <div ref={summaryRef} className="auth-error-summary" role="alert" tabIndex={-1}>
          <p>{labels.validationSummary}</p>
          <ul>{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
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
        <p id="reset-password-hint" className="auth-field-hint">{labels.passwordHint}</p>
        {fieldErrors.password ? <p id="reset-password-error" className="auth-field-error">{fieldErrors.password}</p> : null}
      </div>

      <div className="auth-field">
        <label htmlFor="reset-password-confirmation">{labels.confirmPassword}</label>
        <input
          id="reset-password-confirmation"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          aria-describedby={fieldErrors.confirmPassword ? "reset-password-confirmation-error" : undefined}
          onChange={() => clearFieldError("confirmPassword")}
        />
        {fieldErrors.confirmPassword ? <p id="reset-password-confirmation-error" className="auth-field-error">{fieldErrors.confirmPassword}</p> : null}
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
