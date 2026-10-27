import "server-only";
import { catalogLocales } from "@/lib/catalog/model";
import {
  normalizeBrand,
  normalizeRequiredText,
  validateSlug,
} from "@/lib/catalog/text-validation";
import { validateCommerceInput } from "@/lib/catalog/commerce";
import { getProductPublicationAggregate } from "@/lib/catalog/product-repository";
import { CatalogManagementError } from "@/lib/catalog/management-errors";
import type { CatalogProductPublicationIssue } from "@/lib/catalog/management-product-types";
import {
  catalogSalesMode,
  catalogAvailability,
} from "@/lib/catalog/management-access";
import { specificationIssues } from "./management-product-specification-readiness";

type PublicationAggregate = NonNullable<
  Awaited<ReturnType<typeof getProductPublicationAggregate>>
>;

function productAndCategoryIssues(
  aggregate: PublicationAggregate,
  issues: CatalogProductPublicationIssue[],
) {
  const product = aggregate.product;
  try {
    validateSlug(product.bgSlug);
    validateSlug(product.enSlug);
    if (product.trSlug) validateSlug(product.trSlug);
    if (product.ukSlug) validateSlug(product.ukSlug);
    normalizeBrand(product.brand);
    validateCommerceInput({
      salesMode: catalogSalesMode(product.salesMode),
      availability: catalogAvailability(product.availability),
      price:
        product.pricePresentation === "on_request"
          ? { presentation: "on_request", entryBasis: null, inputMinor: null }
          : {
              presentation: product.pricePresentation as "exact" | "from",
              entryBasis: product.priceEntryBasis as
                "vat_inclusive" | "vat_exclusive",
              inputMinor: product.priceInputMinor ?? BigInt(0),
            },
    });
  } catch {
    issues.push({ code: "INVALID_COMMERCE" });
  }
  try {
    normalizeRequiredText(product.mpn ?? "", 100);
  } catch {
    issues.push({ code: "MODEL_REQUIRED" });
  }

  const expectedCategoryIds = [
    product.primaryCategoryId,
    ...aggregate.additionalCategories.map(({ categoryId }) => categoryId),
  ];
  for (const categoryId of expectedCategoryIds) {
    if (
      !aggregate.categories.some(
        (category) =>
          category.id === categoryId && category.status === "published",
      )
    ) {
      issues.push({ code: "CATEGORY_NOT_PUBLISHED", categoryId });
    }
  }

  for (const locale of catalogLocales) {
    const translation = aggregate.translations.find(
      (candidate) => candidate.locale === locale,
    );
    for (const field of [
      "title",
      "shortDescription",
      "fullDescription",
    ] as const) {
      if (!translation?.[field]?.trim()) {
        issues.push({
          code: "MISSING_PRODUCT_TRANSLATION_FIELD",
          locale,
          field,
        });
      }
    }
  }
}

function mediaIssues(
  aggregate: PublicationAggregate,
  issues: CatalogProductPublicationIssue[],
) {
  if (aggregate.media.filter(({ isPrimary }) => isPrimary).length !== 1) {
    issues.push({ code: "PRIMARY_IMAGE_REQUIRED" });
  }
  if (aggregate.media.filter(({ isSocialImage }) => isSocialImage).length > 1) {
    issues.push({ code: "SOCIAL_IMAGE_LIMIT" });
  }
  for (const media of aggregate.media) {
    for (const locale of catalogLocales) {
      if (
        !aggregate.mediaTranslations.some(
          (translation) =>
            translation.productMediaId === media.id &&
            translation.locale === locale &&
            translation.altText.trim(),
        )
      ) {
        issues.push({
          code: "MISSING_MEDIA_ALT",
          mediaId: media.id,
          mediaReference: media.reference,
          locale,
        });
      }
    }
  }
}

export function getCatalogProductPublicationIssues(
  aggregate: PublicationAggregate,
) {
  const issues: CatalogProductPublicationIssue[] = [];
  productAndCategoryIssues(aggregate, issues);
  specificationIssues(aggregate, issues);
  mediaIssues(aggregate, issues);
  return issues;
}

export function assertProductPublishable(aggregate: PublicationAggregate) {
  const issues = getCatalogProductPublicationIssues(aggregate);
  if (issues.length > 0) {
    throw new CatalogManagementError("PUBLICATION_INVALID", issues);
  }
}
