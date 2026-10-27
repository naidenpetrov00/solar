import type {
  CatalogAvailability,
  CatalogPriceEntryBasis,
  CatalogPricePresentation,
  CatalogSalesMode,
} from "@/lib/catalog/model";
import type { ProductLabels } from "./product-labels";

export type CommerceFieldProps = {
  salesMode: CatalogSalesMode;
  setSalesMode: (value: CatalogSalesMode) => void;
  presentation: CatalogPricePresentation;
  setPresentation: (value: CatalogPricePresentation) => void;
  basis: CatalogPriceEntryBasis;
  setBasis: (value: CatalogPriceEntryBasis) => void;
  price: string;
  setPrice: (value: string) => void;
  availability: CatalogAvailability;
  setAvailability: (value: CatalogAvailability) => void;
  labels: ProductLabels;
  errors: Record<string, string>;
  disabled: boolean;
};
