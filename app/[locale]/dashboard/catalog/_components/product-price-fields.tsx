import type { CatalogPriceEntryBasis } from "@/lib/catalog/model";
import { DashboardSelect } from "../../_components/dashboard-select";
import { priceCounterpart } from "./product-editor-draft";
import { Field, fieldAria } from "./product-editor-fields";
import type { CommerceFieldProps } from "./product-commerce-model";
export function ProductPriceFields({ props }: { props: CommerceFieldProps }) {
  const {
    salesMode,
    presentation,
    basis,
    setBasis,
    price,
    setPrice,
    labels,
    errors,
    disabled,
  } = props;
  const counterpart =
    presentation === "on_request" ? null : priceCounterpart(price, basis);
  return (
    <>
      {presentation !== "on_request" || salesMode === "direct_purchase" ? (
        <>
          <Field
            id="catalog-product-price"
            copy={labels.fields.price}
            error={errors.price ? labels.validation.invalid : undefined}
          >
            <input
              id="catalog-product-price"
              name="price"
              value={price}
              disabled={disabled}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              {...fieldAria(
                "catalog-product-price",
                errors.price ? labels.validation.invalid : undefined,
              )}
            />
            {counterpart ? (
              <small
                className="dashboard-catalog-price-counterpart"
                id="catalog-product-price-counterpart"
              >
                {basis === "vat_inclusive"
                  ? labels.sales.counterpartExclusive
                  : labels.sales.counterpartInclusive}
                : {counterpart} EUR
              </small>
            ) : null}
          </Field>
          <Field
            id="catalog-product-price-basis"
            copy={labels.fields.priceEntryBasis}
            error={
              errors.priceEntryBasis ? labels.validation.required : undefined
            }
          >
            <DashboardSelect
              id="catalog-product-price-basis"
              name="priceEntryBasis"
              value={basis}
              disabled={disabled}
              onChange={(event) =>
                setBasis(event.target.value as CatalogPriceEntryBasis)
              }
              {...fieldAria(
                "catalog-product-price-basis",
                errors.priceEntryBasis ? labels.validation.required : undefined,
              )}
            >
              <option value="vat_inclusive">{labels.sales.vatInclusive}</option>
              <option value="vat_exclusive">{labels.sales.vatExclusive}</option>
            </DashboardSelect>
          </Field>
        </>
      ) : (
        <>
          <input type="hidden" name="price" value="" />
          <input type="hidden" name="priceEntryBasis" value="" />
        </>
      )}
    </>
  );
}
