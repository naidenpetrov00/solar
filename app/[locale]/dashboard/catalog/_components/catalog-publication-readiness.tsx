"use client";

import {
  type CatalogCategoryPublicationIssue,
  type ManagedCatalogCategoryDetail,
} from "@/lib/catalog/management-category-types";
import { type CatalogLocale } from "@/lib/catalog/model";
import { type CatalogLabels } from "./catalog-labels";
import { localizedTranslationLabel } from "./catalog-specification-draft";

function issueMessage(
  issue: CatalogCategoryPublicationIssue,
  labels: CatalogLabels,
  detail: ManagedCatalogCategoryDetail,
  activeLocale: CatalogLocale,
) {
  const specification =
    "specificationKey" in issue
      ? detail.specifications.find(
          (candidate) => candidate.key === issue.specificationKey,
        )
      : undefined;
  const specificationName = specification
    ? localizedTranslationLabel(specification.translations, activeLocale)
    : labels.specifications.item;
  const option =
    specification && "optionCode" in issue
      ? specification.options.find(
          (candidate) => candidate.code === issue.optionCode,
        )
      : undefined;
  const optionName = option
    ? localizedTranslationLabel(option.translations, activeLocale)
    : labels.specifications.options;

  return labels.readiness.messages[issue.code]
    .replace(
      "{{locale}}",
      "locale" in issue ? labels.languages[issue.locale] : "",
    )
    .replace(
      "{{specification}}",
      "specificationKey" in issue ? specificationName : "",
    )
    .replace("{{option}}", "optionCode" in issue ? optionName : "");
}

export function PublicationReadiness({
  issues,
  labels,
  detail,
  activeLocale,
}: {
  issues: CatalogCategoryPublicationIssue[];
  labels: CatalogLabels;
  detail: ManagedCatalogCategoryDetail;
  activeLocale: CatalogLocale;
}) {
  return (
    <section
      id="catalog-publication-readiness"
      className="dashboard-catalog-readiness"
      aria-labelledby="catalog-readiness-title"
      data-ready={issues.length === 0 ? "true" : "false"}
      tabIndex={-1}
    >
      <div>
        <h3 id="catalog-readiness-title">{labels.readiness.title}</h3>
        <p>
          {issues.length === 0
            ? labels.readiness.ready
            : labels.readiness.blocked}
        </p>
      </div>
      {issues.length > 0 ? (
        <ul>
          {issues.map((issue, index) => (
            <li
              key={`${issue.code}-${index}`}
              id={index === 0 ? "catalog-publication-issue-first" : undefined}
              tabIndex={index === 0 ? -1 : undefined}
            >
              {issueMessage(issue, labels, detail, activeLocale)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
