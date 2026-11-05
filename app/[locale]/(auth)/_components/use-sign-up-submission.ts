import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import {
  normalizeCustomerName,
  validateCustomerName,
  validateEmail,
  validateNewPassword,
} from "@/lib/auth-validation";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

type SubmissionLabels = {
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

export function useSignUpSubmission(
  labels: SubmissionLabels,
  verificationCallbackURL: string,
) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  useEffect(() => {
    if (registeredEmail) {
      statusHeadingRef.current?.focus();
    }
  }, [registeredEmail]);

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
    if (passwordError === "required")
      nextErrors.password = labels.passwordRequired;
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
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: verificationCallbackURL,
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

      setRegisteredEmail(email);
    } catch {
      setFormError(labels.genericError);
      focusSummary();
    } finally {
      setPending(false);
    }
  };
  return {
    summaryRef,
    statusHeadingRef,
    fieldErrors,
    formError,
    pending,
    registeredEmail,
    clearFieldError,
    handleSubmit,
  };
}
