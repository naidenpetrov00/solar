import "server-only";
import { catalogLocales } from "./model";
import { getCategoryPublicationAggregate } from "./category-repository";
import { CatalogManagementError } from "./management-errors";
import type { CatalogCategoryPublicationIssue } from "./management-category-types";
export function getCatalogCategoryPublicationIssues(
  aggregate: NonNullable<
    Awaited<ReturnType<typeof getCategoryPublicationAggregate>>
  >,
) {
  const issues: CatalogCategoryPublicationIssue[] = [];

  if (aggregate.parent && aggregate.parent.status !== "published") {
    issues.push({ code: "PARENT_NOT_PUBLISHED" });
  }

  for (const locale of catalogLocales) {
    if (
      !aggregate.translations.some(
        (translation) => translation.locale === locale,
      )
    ) {
      issues.push({ code: "MISSING_CATEGORY_TRANSLATION", locale });
    }
  }

  for (const specification of aggregate.specifications) {
    const translations = aggregate.specificationTranslations.filter(
      ({ specificationId }) => specificationId === specification.id,
    );

    for (const locale of catalogLocales) {
      if (!translations.some((translation) => translation.locale === locale)) {
        issues.push({
          code: "MISSING_SPECIFICATION_TRANSLATION",
          locale,
          specificationKey: specification.key,
        });
      }
    }

    if (specification.valueType === "selection") {
      const options = aggregate.options.filter(
        ({ specificationId }) => specificationId === specification.id,
      );

      if (options.length === 0) {
        issues.push({
          code: "SELECTION_OPTIONS_REQUIRED",
          specificationKey: specification.key,
        });
      }

      for (const option of options) {
        const translations = aggregate.optionTranslations.filter(
          ({ optionId }) => optionId === option.id,
        );

        for (const locale of catalogLocales) {
          if (
            !translations.some((translation) => translation.locale === locale)
          ) {
            issues.push({
              code: "MISSING_OPTION_TRANSLATION",
              locale,
              specificationKey: specification.key,
              optionCode: option.code,
            });
          }
        }
      }
    }
  }

  return issues;
}

export function assertCategoryPublishable(
  aggregate: NonNullable<
    Awaited<ReturnType<typeof getCategoryPublicationAggregate>>
  >,
) {
  const issues = getCatalogCategoryPublicationIssues(aggregate);

  if (issues.length > 0) {
    throw new CatalogManagementError("PUBLICATION_INVALID", issues);
  }
}
