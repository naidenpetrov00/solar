"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import {
  normalizeCustomerName,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateCustomerName,
  validateEmail,
  validateNewPassword,
} from "@/lib/auth-validation";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

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
};

export function SignUpForm({
  labels,
  returnTo,
}: {
  labels: SignUpFormLabels;
  returnTo: string;
}) {
  const router = useRouter();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    const name = normalizeCustomerName(String(data.get("name") ?? ""));
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const nextErrors: FieldErrors = {};
    const nameError = validateCustomerName(name);
    const emailError = validateEmail(email);
    const passwordError = validateNewPassword(password);

    if (nameError === "required") nextErrors.name = labels.nameRequired;
    if (nameError === "length") nextErrors.name = labels.nameLength;
    if (emailError === "required") nextErrors.email = labels.emailRequired;
    if (emailError === "invalid") nextErrors.email = labels.emailInvalid;
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
      const result = await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setFormError(
          result.error.status === 429
            ? labels.rateLimited
            : labels.genericError,
        );
        focusSummary();
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setFormError(labels.genericError);
      focusSummary();
    } finally {
      setPending(false);
    }
  };

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
        {fieldErrors.name ? <p id="sign-up-name-error" className="auth-field-error">{fieldErrors.name}</p> : null}
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
          aria-describedby={fieldErrors.email ? "sign-up-email-error" : undefined}
          onChange={() => clearFieldError("email")}
        />
        {fieldErrors.email ? <p id="sign-up-email-error" className="auth-field-error">{fieldErrors.email}</p> : null}
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
        <p id="sign-up-password-hint" className="auth-field-hint">{labels.passwordHint}</p>
        {fieldErrors.password ? <p id="sign-up-password-error" className="auth-field-error">{fieldErrors.password}</p> : null}
      </div>

      <div className="auth-field">
        <label htmlFor="sign-up-password-confirmation">{labels.confirmPassword}</label>
        <input
          id="sign-up-password-confirmation"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
          aria-describedby={fieldErrors.confirmPassword ? "sign-up-password-confirmation-error" : undefined}
          onChange={() => clearFieldError("confirmPassword")}
        />
        {fieldErrors.confirmPassword ? <p id="sign-up-password-confirmation-error" className="auth-field-error">{fieldErrors.confirmPassword}</p> : null}
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
