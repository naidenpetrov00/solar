"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import type { CartItem } from "../_components/cart-store";
import { submitCheckoutOrderAction } from "./actions";
import { CheckoutFields } from "./checkout-fields";
import { initialCheckoutActionResult } from "./checkout-action-model";
import type { CheckoutLabels } from "./checkout-labels";
import {
  checkoutSubmissionKey,
  clearCheckoutStorage,
  emptyCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from "./checkout-storage";

export function CheckoutForm({
  locale,
  cartHref,
  items,
  labels,
  privacyHref,
  termsHref,
  onCartStale,
  onSuccess,
}: {
  locale: string;
  cartHref: string;
  items: CartItem[];
  labels: CheckoutLabels;
  privacyHref: string;
  termsHref: string;
  onCartStale: () => void;
  onSuccess: (items: CartItem[]) => void;
}) {
  const router = useRouter();
  const [result, action, pending] = useActionState(submitCheckoutOrderAction, initialCheckoutActionResult);
  const [draft, setDraft] = useState<CheckoutDraft>(emptyCheckoutDraft);
  const [draftReady, setDraftReady] = useState(false);
  const [submissionKey, setSubmissionKey] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);
  const handledSuccess = useRef<string | null>(null);
  const submittedItems = useRef<CartItem[]>([]);

  useEffect(() => {
    if (result.status !== "idle" || pending) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDraft(loadCheckoutDraft());
      setSubmissionKey(checkoutSubmissionKey(items));
      setDraftReady(true);
    });
    return () => { active = false; };
  }, [items, pending, result.status]);

  useEffect(() => {
    if (draftReady) saveCheckoutDraft(draft);
  }, [draft, draftReady]);

  useEffect(() => {
    if (result.status === "success" && handledSuccess.current !== result.submissionKey) {
      handledSuccess.current = result.submissionKey;
      onSuccess(submittedItems.current.length ? submittedItems.current : items);
      clearCheckoutStorage(result.submissionKey);
      router.replace(result.confirmationHref);
      return;
    }
    if (result.status === "cart_stale") onCartStale();
    if (result.status === "invalid") {
      const first = Object.keys(result.fieldErrors)[0];
      document.getElementById(`checkout-${first}`)?.focus();
      if (!first) summaryRef.current?.focus();
    } else if (result.status !== "idle") {
      summaryRef.current?.focus();
    }
  }, [items, onCartStale, onSuccess, result, router]);

  const update = <Key extends keyof CheckoutDraft>(key: Key, value: CheckoutDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const fieldErrors = result.status === "invalid" ? result.fieldErrors : {};
  const formError = result.status === "cart_stale"
    ? labels.errors.cartStale
    : result.status === "possible_duplicate"
      ? labels.errors.possibleDuplicate
      : result.status === "temporary_failure"
        ? labels.errors.temporaryFailure
        : null;
  const requiredDetailsComplete =
    draft.name.trim().length > 0 &&
    draft.phone.trim().length > 0 &&
    draft.email.trim().length > 0 &&
    draft.city.trim().length > 0 &&
    draft.deliveryAddress.trim().length > 0 &&
    draft.privacyAcknowledged;

  if (!draftReady || !submissionKey) return <p className="checkout-state" role="status">{labels.loading}</p>;

  return (
    <form
      action={action}
      className="checkout-form"
      noValidate
      aria-busy={pending}
      onSubmit={(event) => {
        if (!requiredDetailsComplete) {
          event.preventDefault();
          return;
        }
        submittedItems.current = items.map((item) => ({ ...item }));
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="submissionKey" value={submissionKey} />
      {items.map((item) => <span key={item.id}>
        <input type="hidden" name="productId" value={item.id} />
        <input type="hidden" name="quantity" value={item.quantity} />
      </span>)}
      {formError || Object.keys(fieldErrors).length ? (
        <div ref={summaryRef} className="checkout-error-summary" role="alert" tabIndex={-1}>
          <p>{labels.errors.summary}</p>
          {Object.keys(fieldErrors).length ? <ul>
            {Object.keys(fieldErrors).map((field) => <li key={field}>{labels.errors[field as keyof typeof labels.errors]}</li>)}
          </ul> : null}
          {formError ? <p>{formError}</p> : null}
          {result.status === "cart_stale" ? <p><Link href={cartHref}>{labels.backToCart}</Link></p> : null}
        </div>
      ) : null}
      <div className="checkout-form-heading">
        <h2>{labels.form.title}</h2>
        <p>{labels.form.description}</p>
      </div>
      <fieldset className="checkout-fields" disabled={pending}>
        <CheckoutFields draft={draft} errors={fieldErrors} labels={labels} privacyHref={privacyHref} termsHref={termsHref} update={update} />
        <div className="checkout-submit">
          <p>{labels.form.pendingConfirmation}</p>
          <Button type="submit" disabled={pending || !requiredDetailsComplete} fullWidth>
            {pending ? labels.form.placingOrder : labels.form.placeOrder}
          </Button>
          <span className="sr-only" role="status" aria-live="polite">
            {pending ? labels.form.placingOrder : ""}
          </span>
        </div>
      </fieldset>
    </form>
  );
}
