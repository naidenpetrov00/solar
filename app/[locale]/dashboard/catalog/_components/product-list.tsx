"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/button";
import {
  type CatalogProductPublicationIssue,
  type ManagedCatalogProductDetail,
} from "@/lib/catalog/management-product-types";
import { type Props } from "./product-editor-model";

export function ProductList({
  products,
  categoryId,
  catalogPath,
  canManage,
  labels,
  statusLabels,
}: Props) {
  const base = `${catalogPath}?category=${categoryId}&view=products`;
  return (
    <section
      className="dashboard-catalog-products"
      aria-labelledby="catalog-products-title"
    >
      <div className="dashboard-catalog-panel-heading">
        <div>
          <h2 id="catalog-products-title">{labels.list.title}</h2>
          <p>{labels.editor.editDescription}</p>
        </div>
        {canManage ? (
          <ButtonLink href={`${base}&product=new`}>
            {labels.list.add}
          </ButtonLink>
        ) : null}
      </div>
      {products.length === 0 ? (
        <p className="dashboard-catalog-empty">{labels.list.empty}</p>
      ) : (
        <ul className="dashboard-catalog-product-list">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`${base}&product=${product.id}`}
                aria-label={`${labels.list.open}: ${product.title || labels.list.untitled}`}
              >
                <span className="dashboard-catalog-product-list-copy">
                  <strong>{product.title || labels.list.untitled}</strong>
                  <small>{product.sku}</small>
                </span>
                <span className="dashboard-catalog-product-list-facts">
                  <span
                    className="dashboard-catalog-status"
                    data-status={product.status}
                  >
                    {statusLabels[product.status]}
                  </span>
                  <small>
                    {product.salesMode === "direct_purchase"
                      ? labels.sales.directPurchase
                      : labels.sales.enquiry}
                    {product.availability
                      ? ` · ${product.availability === "in_stock" ? labels.sales.inStock : labels.sales.outOfStock}`
                      : ""}
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function issueText(
  issue: CatalogProductPublicationIssue,
  detail: ManagedCatalogProductDetail,
  props: Props,
) {
  const { labels, languages, categories, locale } = props;
  let text = labels.readiness.messages[issue.code];
  if ("locale" in issue)
    text = text.replace("{{locale}}", languages[issue.locale]);
  if (issue.code === "MISSING_PRODUCT_TRANSLATION_FIELD")
    text = text.replace("{{field}}", labels.readiness.fields[issue.field]);
  if (issue.code === "CATEGORY_NOT_PUBLISHED")
    text = text.replace(
      "{{category}}",
      categories.find(({ id }) => id === issue.categoryId)?.name ??
        issue.categoryId,
    );
  if ("specificationId" in issue) {
    const categorySpecification = detail.specifications.find(
      ({ id }) => id === issue.specificationId,
    );
    const name =
      categorySpecification?.translations.find(
        (translation) => translation.locale === locale,
      )?.label ??
      categorySpecification?.key ??
      issue.specificationId;
    text = text.replace("{{specification}}", name);
  }
  if ("mediaId" in issue) {
    text = text.replace(
      "{{media}}",
      issue.mediaReference ||
        detail.media.find(({ id }) => id === issue.mediaId)?.reference ||
        issue.mediaId,
    );
  }
  return text;
}
