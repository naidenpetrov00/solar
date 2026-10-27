import "server-only";
import { isCatalogLocale } from "@/lib/catalog/model";
import type {
  CatalogProductSpecificationConfigurationInput,
  CatalogProductSpecificationValueInput,
} from "@/lib/catalog/catalog-inputs";
import { getProductPublicationAggregate } from "@/lib/catalog/product-repository";
import { getCatalogProductPublicationIssues } from "@/lib/catalog/management-product-readiness";
import type { ManagedCatalogProductWorkspace } from "@/lib/catalog/management-product-types";

export function mapManagedProductDetail(
  aggregate: NonNullable<
    Awaited<ReturnType<typeof getProductPublicationAggregate>>
  >,
  summary: ManagedCatalogProductWorkspace["products"][number],
  productCategoryConfiguration: ManagedCatalogProductWorkspace["categoryConfigurations"][number],
): NonNullable<ManagedCatalogProductWorkspace["selected"]> {
  const specifications = productCategoryConfiguration.specifications;
  const specificationValues: CatalogProductSpecificationValueInput[] = [];
  for (const value of aggregate.specificationValues) {
    const specification = specifications.find(
      ({ id }) => id === value.specificationId,
    );
    if (!specification) continue;
    if (specification.valueType === "text" && value.textValue !== null) {
      specificationValues.push({
        specificationId: value.specificationId,
        type: "text",
        value: value.textValue,
      });
    } else if (
      specification.valueType === "number" &&
      value.numberValue !== null
    ) {
      specificationValues.push({
        specificationId: value.specificationId,
        type: "number",
        value: value.numberValue,
      });
    } else if (
      specification.valueType === "boolean" &&
      value.booleanValue !== null
    ) {
      specificationValues.push({
        specificationId: value.specificationId,
        type: "boolean",
        value: value.booleanValue,
      });
    } else if (
      specification.valueType === "selection" &&
      value.selectionOptionId
    ) {
      specificationValues.push({
        specificationId: value.specificationId,
        type: "selection",
        optionId: value.selectionOptionId,
      });
    }
  }
  const media = aggregate.media
    .toSorted(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.id.localeCompare(right.id),
    )
    .map((item) => ({
      id: item.id,
      reference: item.reference,
      displayOrder: item.displayOrder,
      isPrimary: item.isPrimary,
      isSocialImage: item.isSocialImage,
      translations: aggregate.mediaTranslations.flatMap((translation) =>
        translation.productMediaId === item.id &&
        isCatalogLocale(translation.locale)
          ? [{ locale: translation.locale, altText: translation.altText }]
          : [],
      ),
    }));

  return {
    ...summary,
    brand: aggregate.product.brand,
    bgSlug: aggregate.product.bgSlug,
    enSlug: aggregate.product.enSlug,
    trSlug: aggregate.product.trSlug,
    ukSlug: aggregate.product.ukSlug,
    primaryCategoryId: aggregate.product.primaryCategoryId,
    additionalCategoryIds: aggregate.additionalCategories.map(
      ({ categoryId: additionalCategoryId }) => additionalCategoryId,
    ),
    mpn: aggregate.product.mpn,
    pricePresentation: aggregate.product.pricePresentation as
      "exact" | "from" | "on_request",
    priceEntryBasis: aggregate.product.priceEntryBasis as
      "vat_inclusive" | "vat_exclusive" | null,
    priceInputMinor: aggregate.product.priceInputMinor?.toString() ?? null,
    publishedAt: aggregate.product.publishedAt?.toISOString() ?? null,
    archivedAt: aggregate.product.archivedAt?.toISOString() ?? null,
    translations: aggregate.translations.flatMap((translation) =>
      isCatalogLocale(translation.locale)
        ? [
            {
              locale: translation.locale,
              title: translation.title,
              shortDescription: translation.shortDescription,
              fullDescription: translation.fullDescription,
              marketingLabel: translation.marketingLabel,
              seoTitle: translation.seoTitle,
              metaDescription: translation.metaDescription,
            },
          ]
        : [],
    ),
    titleGuidance: productCategoryConfiguration.titleGuidance,
    specifications,
    specificationValues,
    specificationConfiguration: aggregate.product
      .specificationConfiguration as CatalogProductSpecificationConfigurationInput,
    media,
    publicationIssues: getCatalogProductPublicationIssues(aggregate),
  };
}
