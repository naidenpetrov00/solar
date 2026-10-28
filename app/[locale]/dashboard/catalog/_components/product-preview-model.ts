import type { CatalogProductDetailView } from "../../../_components/catalog-product-detail";
import type {
  CatalogAvailability,
  CatalogLocale,
  CatalogPricePresentation,
  CatalogSalesMode,
} from "@/lib/catalog/model";
import type { CatalogProductSpecificationValueInput } from "@/lib/catalog/catalog-inputs";
import type {
  MediaDraft,
  ProductTranslationDraft,
  Props,
} from "./product-editor-model";
import type { ProductLabels } from "./product-labels";

export function createProductPreview({
  translations,
  activeLocale,
  visibleInheritedSpecifications,
  specValues,
  media,
  labels,
  brand,
  mpn,
  salesMode,
  presentation,
  price,
  availability,
}: {
  translations: Record<CatalogLocale, ProductTranslationDraft>;
  activeLocale: CatalogLocale;
  visibleInheritedSpecifications: Props["categoryConfigurations"][number]["specifications"];
  specValues: CatalogProductSpecificationValueInput[];
  media: MediaDraft[];
  labels: ProductLabels;
  brand: string;
  mpn: string;
  salesMode: CatalogSalesMode;
  presentation: CatalogPricePresentation;
  price: string;
  availability: CatalogAvailability;
}): CatalogProductDetailView {
  const content = translations[activeLocale];
  const inherited = visibleInheritedSpecifications.flatMap((specification) => {
    const value = specValues.find(
      (item) => item.specificationId === specification.id,
    );
    if (!value) return [];
    const label =
      specification.translations.find((item) => item.locale === activeLocale)
        ?.label ??
      specification.translations.find((item) => item.locale === "bg")?.label ??
      specification.key;
    const renderedValue =
      value.type === "text" || value.type === "number"
        ? `${value.value}${value.type === "number" && specification.unit ? ` ${specification.unit}` : ""}`
        : value.type === "boolean"
          ? value.value
            ? labels.specifications.yes
            : labels.specifications.no
          : (specification.options
              .find((option) => option.id === value.optionId)
              ?.translations.find((item) => item.locale === activeLocale)
              ?.label ??
            specification.options
              .find((option) => option.id === value.optionId)
              ?.translations.find((item) => item.locale === "bg")?.label ??
            "");
    return renderedValue ? [{ label, value: renderedValue }] : [];
  });
  const previewMedia = media
    .filter((item) => item.reference.trim())
    .map((item) => ({
      reference: item.reference.trim(),
      altText:
        item.translations[activeLocale].trim() ||
        item.translations.bg.trim() ||
        "",
      isPrimary: item.isPrimary,
    }));
  const primary = previewMedia.find((item) => item.isPrimary) ?? null;
  const presentationLabel =
    salesMode === "enquiry" && presentation === "from"
      ? `${labels.sales.from} `
      : "";

  return {
    title: content.title.trim() || labels.preview.emptyTitle,
    marketingLabel: content.marketingLabel.trim() || null,
    brand: brand.trim() || null,
    model: mpn.trim() || null,
    shortDescription: content.shortDescription.trim(),
    fullDescription: content.fullDescription.trim(),
    price:
      presentation === "on_request"
        ? labels.sales.onRequest
        : price.trim()
          ? `${presentationLabel}${price.trim()} EUR`
          : null,
    availability:
      salesMode === "direct_purchase"
        ? availability === "in_stock"
          ? labels.sales.inStock
          : labels.sales.outOfStock
        : null,
    primaryMedia: primary,
    gallery: previewMedia,
    specifications: inherited,
  };
}
