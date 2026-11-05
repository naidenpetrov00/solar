import Link from "next/link";
import type { CheckoutActionResult, CheckoutField } from "./checkout-action-model";
import type { CheckoutLabels } from "./checkout-labels";
import type { CheckoutDraft } from "./checkout-storage";

type Props = {
  draft: CheckoutDraft;
  errors: Extract<CheckoutActionResult, { status: "invalid" }>["fieldErrors"];
  labels: CheckoutLabels;
  privacyHref: string;
  termsHref: string;
  update: <Key extends keyof CheckoutDraft>(key: Key, value: CheckoutDraft[Key]) => void;
};

function describedBy(field: CheckoutField, invalid: boolean, help?: boolean) {
  return [help ? `checkout-${field}-help` : null, invalid ? `checkout-${field}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

export function CheckoutFields({ draft, errors, labels, privacyHref, termsHref, update }: Props) {
  const error = (field: CheckoutField) => errors[field] ? labels.errors[field] : null;
  const field = (name: "name" | "phone" | "email" | "city" | "deliveryAddress") => (
    <div className="checkout-field">
      <label htmlFor={`checkout-${name}`}>{labels.form[name]}</label>
      {name === "deliveryAddress" ? <textarea
        id={`checkout-${name}`}
        name={name}
        autoComplete="street-address"
        maxLength={500}
        required
        rows={3}
        value={draft[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={describedBy(name, Boolean(errors[name]))}
      /> : <input
        id={`checkout-${name}`}
        name={name}
        type={name === "email" ? "email" : name === "phone" ? "tel" : "text"}
        inputMode={name === "email" ? "email" : name === "phone" ? "tel" : undefined}
        autoComplete={name === "city" ? "address-level2" : name === "phone" ? "tel" : name}
        maxLength={name === "name" ? 100 : name === "email" ? 320 : name === "city" ? 120 : 32}
        required
        value={draft[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={describedBy(name, Boolean(errors[name]))}
      />}
      {error(name) ? <p id={`checkout-${name}-error`} className="checkout-field-error">{error(name)}</p> : null}
    </div>
  );
  return (
    <>
      {field("name")}{field("phone")}{field("email")}{field("city")}{field("deliveryAddress")}
      <div className="checkout-field">
        <label htmlFor="checkout-note">{labels.form.note} <span>{labels.form.noteOptional}</span></label>
        <textarea id="checkout-note" name="note" maxLength={2000} rows={4} value={draft.note} onChange={(event) => update("note", event.target.value)} aria-invalid={Boolean(errors.note)} aria-describedby={describedBy("note", Boolean(errors.note))} />
        {error("note") ? <p id="checkout-note-error" className="checkout-field-error">{error("note")}</p> : null}
      </div>
      <fieldset className="checkout-payment" aria-describedby={errors.paymentMethod ? "checkout-paymentMethod-error" : undefined}>
        <legend>{labels.form.paymentLegend}</legend>
        {(["cash_on_delivery", "bank_transfer", "arranged_by_phone"] as const).map((method) => (
          <label key={method}><input id={method === "cash_on_delivery" ? "checkout-paymentMethod" : undefined} type="radio" name="paymentMethod" value={method} checked={draft.paymentMethod === method} onChange={() => update("paymentMethod", method)} required />{labels.form[method === "cash_on_delivery" ? "cashOnDelivery" : method === "bank_transfer" ? "bankTransfer" : "arrangedByPhone"]}</label>
        ))}
        {error("paymentMethod") ? <p id="checkout-paymentMethod-error" className="checkout-field-error">{error("paymentMethod")}</p> : null}
      </fieldset>
      <div className="checkout-acknowledgement">
        <label htmlFor="checkout-privacyAcknowledged">
          <input id="checkout-privacyAcknowledged" name="privacyAcknowledged" type="checkbox" value="true" checked={draft.privacyAcknowledged} onChange={(event) => update("privacyAcknowledged", event.target.checked)} required aria-invalid={Boolean(errors.privacyAcknowledged)} aria-describedby={errors.privacyAcknowledged ? "checkout-privacyAcknowledged-error" : undefined} />
          <span>{labels.form.privacyBefore} <Link href={privacyHref}>{labels.form.privacyLink}</Link>{labels.form.privacyAfter}</span>
        </label>
        {error("privacyAcknowledged") ? <p id="checkout-privacyAcknowledged-error" className="checkout-field-error">{error("privacyAcknowledged")}</p> : null}
      </div>
      <p className="checkout-terms-link">{labels.form.termsBefore} <Link href={termsHref}>{labels.form.termsLink}</Link>{labels.form.termsAfter}</p>
    </>
  );
}
