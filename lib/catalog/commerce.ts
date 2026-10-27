import { CatalogValidationError } from "@/lib/catalog/model";
import type {
  CatalogAvailability,
  CatalogSalesMode,
} from "@/lib/catalog/model";
import type {
  CatalogPriceInput,
  CatalogPricedInput,
} from "@/lib/catalog/catalog-inputs";

export function publicVatInclusiveMinor(price: CatalogPricedInput) {
  if (price.inputMinor <= BigInt(0)) {
    throw new CatalogValidationError("INVALID_PRICE");
  }

  return price.entryBasis === "vat_inclusive"
    ? price.inputMinor
    : (price.inputMinor * BigInt(120) + BigInt(50)) / BigInt(100);
}

export function priceCounterpartMinor(price: CatalogPricedInput) {
  if (price.inputMinor <= BigInt(0)) {
    throw new CatalogValidationError("INVALID_PRICE");
  }

  return price.entryBasis === "vat_inclusive"
    ? (price.inputMinor * BigInt(100) + BigInt(60)) / BigInt(120)
    : publicVatInclusiveMinor(price);
}

export function validateCommerceInput(input: {
  salesMode: CatalogSalesMode;
  availability: CatalogAvailability | null;
  price: CatalogPriceInput;
}) {
  if (input.salesMode === "direct_purchase") {
    if (input.price.presentation !== "exact" || input.availability === null) {
      throw new CatalogValidationError("INVALID_AVAILABILITY");
    }

    publicVatInclusiveMinor(input.price);
    return;
  }

  if (input.availability !== null) {
    throw new CatalogValidationError("INVALID_AVAILABILITY");
  }

  if (input.price.presentation !== "on_request") {
    publicVatInclusiveMinor(input.price);
  }
}
