import type { PublicCatalogPrice } from "@/lib/catalog/public-types";
import { formatCurrencyMinor } from "../_lib/catalog-format";

export function CatalogPrice({
  locale,
  price,
  fromLabel,
  saveLabel,
  vatLabel,
}: {
  locale: string;
  price: PublicCatalogPrice;
  fromLabel: string;
  saveLabel: string;
  vatLabel: string;
}) {
  const original = formatCurrencyMinor(
    locale,
    price.originalVatInclusiveMinor,
    price.currency,
  );
  const effective = formatCurrencyMinor(
    locale,
    price.effectiveVatInclusiveMinor,
    price.currency,
  );
  const saving = price.promotion?.savingsBasisPoints
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
        price.promotion.savingsBasisPoints / 100,
      )
    : null;

  return (
    <span className="catalog-price">
      {price.presentation === "from" ? (
        <span className="catalog-price-from">{fromLabel}</span>
      ) : null}
      {price.promotion ? (
        <>
          {price.promotion.label ? (
            <span className="catalog-promotion-label">
              {price.promotion.label}
            </span>
          ) : null}
          <del className="catalog-price-original">{original}</del>
        </>
      ) : null}
      <strong className="catalog-price-effective">{effective}</strong>
      {saving ? (
        <span className="catalog-price-saving">
          {saveLabel.replace("{percentage}", saving)}
        </span>
      ) : null}
      <small>{vatLabel}</small>
    </span>
  );
}
