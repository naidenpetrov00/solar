import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { validateEmail } from "@/lib/auth-validation";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

type SubmissionLabels = {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  invalidCredentials: string;
  rateLimited: string;
  genericError: string;
};

export function useSignInSubmission(
  labels: SubmissionLabels,
  returnTo: string,
) {
  const router = useRouter();
  const summaryRef = useRef<HTMLDivElement>(null);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (unverifiedEmail) {
      statusHeadingRef.current?.focus();
    }
  }, [unverifiedEmail]);

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
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email);
          return;
        }

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
  return {
    summaryRef,
    statusHeadingRef,
    fieldErrors,
    formError,
    pending,
    unverifiedEmail,
    setUnverifiedEmail,
    clearFieldError,
    handleSubmit,
  };
}
