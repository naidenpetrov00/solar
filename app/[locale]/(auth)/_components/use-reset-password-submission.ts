import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { validateNewPassword } from "@/lib/auth-validation";

type FieldName = "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

type SubmissionLabels = {
  passwordRequired: string;
  passwordLength: string;
  passwordMismatch: string;
  invalidToken: string;
  rateLimited: string;
  genericError: string;
};

export function useResetPasswordSubmission(
  labels: SubmissionLabels,
  token: string,
) {
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
  return {
    summaryRef,
    statusHeadingRef,
    fieldErrors,
    formError,
    pending,
    complete,
    clearFieldError,
    handleSubmit,
  };
}
