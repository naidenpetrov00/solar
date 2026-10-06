"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { validateEmail } from "@/lib/auth-validation";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

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
};

export function SignInForm({
  labels,
  returnTo,
}: {
  labels: SignInFormLabels;
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
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const nextErrors: FieldErrors = {};
    const emailError = validateEmail(email);

    if (emailError === "required") nextErrors.email = labels.emailRequired;
    if (emailError === "invalid") nextErrors.email = labels.emailInvalid;
    if (!password) nextErrors.password = labels.passwordRequired;

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      focusSummary();
      return;
    }

    setPending(true);

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        const invalidCredentials =
          result.error.status === 401 &&
          result.error.code === "INVALID_EMAIL_OR_PASSWORD";

        setFormError(
          result.error.status === 429
            ? labels.rateLimited
            : invalidCredentials
              ? labels.invalidCredentials
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
        <div
          ref={summaryRef}
          className="auth-error-summary"
          role="alert"
          tabIndex={-1}
        >
          <p>{labels.validationSummary}</p>
          <ul>
            {errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
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
          aria-describedby={fieldErrors.email ? "sign-in-email-error" : undefined}
          onChange={() => clearFieldError("email")}
        />
        {fieldErrors.email ? <p id="sign-in-email-error" className="auth-field-error">{fieldErrors.email}</p> : null}
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
          aria-describedby={fieldErrors.password ? "sign-in-password-error" : undefined}
          onChange={() => clearFieldError("password")}
        />
        {fieldErrors.password ? <p id="sign-in-password-error" className="auth-field-error">{fieldErrors.password}</p> : null}
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
