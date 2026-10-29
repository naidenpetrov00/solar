import type { ReactNode } from "react";

import {
  CatalogProductGallery,
  type CatalogProductGalleryItem,
} from "./catalog-product-gallery";

export type CatalogProductDetailView = {
  title: string;
  marketingLabel?: string | null;
  brand: string | null;
  model: string | null;
  shortDescription: string;
  fullDescription: string;
  price: string | null;
  availability: string | null;
  vatInformation?: string | null;
  primaryMedia: CatalogProductGalleryItem | null;
  gallery: CatalogProductGalleryItem[];
  specifications: Array<{ label: string; value: string }>;
  documents?: Array<{
    url: string;
    title: string;
    description: string | null;
    originalFilename: string;
    byteSize: number;
  }>;
};

export type CatalogProductDetailLabels = {
  brand: string;
  model: string;
  specifications: string;
  gallery: string;
  previousImage: string;
  nextImage: string;
  imagePosition: string;
  selectImage: string;
  noImage: string;
  documents?: string;
  downloadDocument?: string;
};

type Props = {
  product: CatalogProductDetailView;
  labels: CatalogProductDetailLabels;
  actions?: ReactNode;
  locale?: string;
};

/**
 * Pure product presentation shared by the administrator preview and the
 * public catalog route. It deliberately has no editor or data-fetching
 * dependencies, so either surface supplies its own view model.
 */
export function CatalogProductDetail({ product, labels, actions, locale = "en" }: Props) {
  const secondaryMedia = product.gallery.filter(
    (item) => item.reference !== product.primaryMedia?.reference,
  );
  const media = product.primaryMedia
    ? [product.primaryMedia, ...secondaryMedia]
    : secondaryMedia;

  return (
    <article className="catalog-product-detail">
      <div className="catalog-product-detail-media">
        {media.length > 0 ? (
          <CatalogProductGallery media={media} labels={labels} />
        ) : (
          <div className="catalog-product-detail-empty-media" role="img" aria-label={labels.noImage} />
        )}
      </div>

      <div className="catalog-product-detail-copy">
        <header>
          {product.marketingLabel ? (
            <p className="catalog-marketing-label">{product.marketingLabel}</p>
          ) : null}
          <h1>{product.title}</h1>
          {product.shortDescription ? <p className="catalog-product-detail-summary">{product.shortDescription}</p> : null}
        </header>

        {product.price || product.availability ? (
          <div className="catalog-product-detail-commerce">
            {product.price ? <strong>{product.price}</strong> : null}
            {product.vatInformation ? <small>{product.vatInformation}</small> : null}
            {product.availability ? (
              <span className="catalog-product-detail-availability">
                {product.availability}
              </span>
            ) : null}
            {actions ? <div className="catalog-product-detail-actions">{actions}</div> : null}
          </div>
        ) : null}

        {product.brand || product.model ? (
          <dl className="catalog-product-detail-facts">
            {product.brand ? <div><dt>{labels.brand}</dt><dd>{product.brand}</dd></div> : null}
            {product.model ? <div><dt>{labels.model}</dt><dd>{product.model}</dd></div> : null}
          </dl>
        ) : null}

        {product.fullDescription ? <div className="catalog-product-detail-description">{product.fullDescription}</div> : null}

        {product.specifications.length > 0 ? (
          <section className="catalog-product-detail-specifications" aria-labelledby="catalog-product-detail-specifications">
            <h2 id="catalog-product-detail-specifications">{labels.specifications}</h2>
            <dl>
              {product.specifications.map((specification) => (
                <div key={`${specification.label}-${specification.value}`}>
                  <dt>{specification.label}</dt>
                  <dd>{specification.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>

      {product.documents?.length ? (
        <section
          className="catalog-product-detail-documents"
          aria-labelledby="catalog-product-detail-documents"
        >
          <h2 id="catalog-product-detail-documents">{labels.documents}</h2>
          <ul>
            {product.documents.map((document) => (
              <li key={document.url}>
                <a
                  href={document.url}
                  aria-label={`${labels.downloadDocument ?? "Download"}: ${document.title} (PDF)`}
                >
                  <strong>{document.title}</strong>
                  <span>
                    PDF · {new Intl.NumberFormat(locale, {
                      maximumFractionDigits: 1,
                    }).format(document.byteSize / 1024 / 1024)} MB
                  </span>
                  <small>{document.originalFilename}</small>
                </a>
                {document.description ? <p>{document.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
