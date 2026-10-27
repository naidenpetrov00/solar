import type {
  CatalogSalesMode,
  CatalogPricePresentation,
  CatalogAvailability,
} from "@/lib/catalog/model";
import { DashboardSelect } from "../../_components/dashboard-select";
import { Field, fieldAria } from "./product-editor-fields";
import { ProductPriceFields } from "./product-price-fields";
import type { CommerceFieldProps } from "./product-commerce-model";
export function CommerceFields(props: CommerceFieldProps) {
  const {
    salesMode,
    setSalesMode,
    presentation,
    setPresentation,
    availability,
    setAvailability,
    labels,
    errors,
    disabled,
  } = props;
  return (
    <div className="dashboard-catalog-product-commerce-grid">
      <Field
        id="catalog-product-sales-mode"
        copy={labels.fields.salesMode}
        error={errors.salesMode ? labels.validation.required : undefined}
      >
        <DashboardSelect
          id="catalog-product-sales-mode"
          name="salesMode"
          value={salesMode}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value as CatalogSalesMode;
            setSalesMode(value);
            if (value === "direct_purchase") setPresentation("exact");
          }}
          {...fieldAria(
            "catalog-product-sales-mode",
            errors.salesMode ? labels.validation.required : undefined,
          )}
        >
          <option value="direct_purchase">{labels.sales.directPurchase}</option>
          <option value="enquiry">{labels.sales.enquiry}</option>
        </DashboardSelect>
      </Field>
      <Field
        id="catalog-product-price-presentation"
        copy={labels.fields.pricePresentation}
        error={errors.pricePresentation ? labels.validation.invalid : undefined}
      >
        <DashboardSelect
          id="catalog-product-price-presentation"
          name="pricePresentation"
          value={salesMode === "direct_purchase" ? "exact" : presentation}
          disabled={disabled || salesMode === "direct_purchase"}
          onChange={(event) =>
            setPresentation(event.target.value as CatalogPricePresentation)
          }
          {...fieldAria(
            "catalog-product-price-presentation",
            errors.pricePresentation ? labels.validation.invalid : undefined,
          )}
        >
          <option value="exact">{labels.sales.exact}</option>
          {salesMode === "enquiry" ? (
            <>
              <option value="from">{labels.sales.from}</option>
              <option value="on_request">{labels.sales.onRequest}</option>
            </>
          ) : null}
        </DashboardSelect>
        {salesMode === "direct_purchase" ? (
          <input type="hidden" name="pricePresentation" value="exact" />
        ) : null}
      </Field>
      <ProductPriceFields props={props} />
      {salesMode === "direct_purchase" ? (
        <Field
          id="catalog-product-availability"
          copy={labels.fields.availability}
          error={errors.availability ? labels.validation.required : undefined}
        >
          <DashboardSelect
            id="catalog-product-availability"
            name="availability"
            value={availability}
            disabled={disabled}
            onChange={(event) =>
              setAvailability(event.target.value as CatalogAvailability)
            }
            {...fieldAria(
              "catalog-product-availability",
              errors.availability ? labels.validation.required : undefined,
            )}
          >
            <option value="in_stock">{labels.sales.inStock}</option>
            <option value="out_of_stock">{labels.sales.outOfStock}</option>
          </DashboardSelect>
        </Field>
      ) : (
        <input type="hidden" name="availability" value="" />
      )}
    </div>
  );
}
