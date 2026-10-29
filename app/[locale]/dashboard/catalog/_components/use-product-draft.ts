import { useCallback, useState } from "react";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type {
  CatalogAvailability,
  CatalogLocale,
  CatalogPriceEntryBasis,
  CatalogPricePresentation,
  CatalogSalesMode,
} from "@/lib/catalog/model";
import type { CatalogProductSpecificationValueInput } from "@/lib/catalog/catalog-inputs";
import type { DocumentDraft, MediaDraft } from "./product-editor-model";
import {
  translationsFromDetail,
  safeSlug,
  minorToInput,
  mediaFromDetail,
  documentsFromDetail,
} from "./product-editor-draft";

export function useProductDraft(
  detail: ManagedCatalogProductDetail | null,
  categoryId: string,
) {
  const creating = detail === null;
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>("bg");
  const [brand, setBrand] = useState(detail?.brand ?? "");
  const [mpn, setMpn] = useState(detail?.mpn ?? "");
  const [translations, setTranslations] = useState(() =>
    translationsFromDetail(detail),
  );
  const [bgSlug, setBgSlug] = useState(detail?.bgSlug ?? "");
  const [enSlug, setEnSlug] = useState(detail?.enSlug ?? "");
  const [trSlug, setTrSlug] = useState(detail?.trSlug ?? "");
  const [ukSlug, setUkSlug] = useState(detail?.ukSlug ?? "");
  const [bgSlugAutoManaged, setBgSlugAutoManaged] = useState(
    creating ||
      detail?.bgSlug === safeSlug(translationsFromDetail(detail).bg.title),
  );
  const [enSlugAutoManaged, setEnSlugAutoManaged] = useState(
    creating ||
      detail?.enSlug ===
        safeSlug(
          translationsFromDetail(detail).en.title ||
            translationsFromDetail(detail).bg.title,
        ),
  );
  const [trSlugAutoManaged, setTrSlugAutoManaged] = useState(
    !detail?.trSlug ||
      detail.trSlug === safeSlug(translationsFromDetail(detail).tr.title),
  );
  const [ukSlugAutoManaged, setUkSlugAutoManaged] = useState(
    !detail?.ukSlug ||
      detail.ukSlug === safeSlug(translationsFromDetail(detail).uk.title),
  );
  const [primaryCategoryId, setPrimaryCategoryId] = useState(
    detail?.primaryCategoryId ?? categoryId,
  );
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState(
    detail?.additionalCategoryIds ?? [],
  );
  const [salesMode, setSalesMode] = useState<CatalogSalesMode>(
    detail?.salesMode ?? "direct_purchase",
  );
  const [presentation, setPresentation] = useState<CatalogPricePresentation>(
    detail?.pricePresentation ?? "exact",
  );
  const [basis, setBasis] = useState<CatalogPriceEntryBasis>(
    detail?.priceEntryBasis ?? "vat_inclusive",
  );
  const [price, setPrice] = useState(
    minorToInput(detail?.priceInputMinor ?? null),
  );
  const [availability, setAvailability] = useState<CatalogAvailability>(
    detail?.availability ?? "in_stock",
  );
  const [specValues, setSpecValues] = useState<
    CatalogProductSpecificationValueInput[]
  >(detail?.specificationValues ?? []);
  const [excludedSpecificationIds, setExcludedSpecificationIds] = useState(
    detail?.specificationConfiguration.excludedSpecificationIds ?? [],
  );
  const [media, setMedia] = useState<MediaDraft[]>(() =>
    mediaFromDetail(detail),
  );
  const [documents, setDocuments] = useState<DocumentDraft[]>(() =>
    documentsFromDetail(detail),
  );
  const [assetsUpdatedAt, setAssetsUpdatedAt] = useState(
    detail?.assetsUpdatedAt ?? "",
  );
  const [isPreviewing, setIsPreviewing] = useState(false);

  const resetFromDetail = useCallback(
    (nextDetail: ManagedCatalogProductDetail, preserveAssets = false) => {
      setIsPreviewing(false);
      setBrand(nextDetail.brand ?? "");
      setMpn(nextDetail.mpn ?? "");
      const nextTranslations = translationsFromDetail(nextDetail);
      setTranslations(nextTranslations);
      setBgSlug(nextDetail.bgSlug);
      setEnSlug(nextDetail.enSlug);
      setTrSlug(nextDetail.trSlug ?? "");
      setUkSlug(nextDetail.ukSlug ?? "");
      setBgSlugAutoManaged(
        nextDetail.bgSlug === safeSlug(nextTranslations.bg.title),
      );
      setEnSlugAutoManaged(
        nextDetail.enSlug ===
          safeSlug(nextTranslations.en.title || nextTranslations.bg.title),
      );
      setTrSlugAutoManaged(
        !nextDetail.trSlug ||
          nextDetail.trSlug === safeSlug(nextTranslations.tr.title),
      );
      setUkSlugAutoManaged(
        !nextDetail.ukSlug ||
          nextDetail.ukSlug === safeSlug(nextTranslations.uk.title),
      );
      setPrimaryCategoryId(nextDetail.primaryCategoryId);
      setAdditionalCategoryIds(nextDetail.additionalCategoryIds);
      setSalesMode(nextDetail.salesMode);
      setPresentation(nextDetail.pricePresentation);
      setBasis(nextDetail.priceEntryBasis ?? "vat_inclusive");
      setPrice(minorToInput(nextDetail.priceInputMinor));
      setAvailability(nextDetail.availability ?? "in_stock");
      setSpecValues(nextDetail.specificationValues);
      setExcludedSpecificationIds(
        nextDetail.specificationConfiguration.excludedSpecificationIds,
      );
      if (!preserveAssets) {
        setMedia(mediaFromDetail(nextDetail));
        setDocuments(documentsFromDetail(nextDetail));
        setAssetsUpdatedAt(nextDetail.assetsUpdatedAt);
      }
    },
    [],
  );

  return {
    activeLocale,
    setActiveLocale,
    brand,
    setBrand,
    mpn,
    setMpn,
    translations,
    setTranslations,
    bgSlug,
    setBgSlug,
    enSlug,
    setEnSlug,
    trSlug,
    setTrSlug,
    ukSlug,
    setUkSlug,
    bgSlugAutoManaged,
    setBgSlugAutoManaged,
    enSlugAutoManaged,
    setEnSlugAutoManaged,
    trSlugAutoManaged,
    setTrSlugAutoManaged,
    ukSlugAutoManaged,
    setUkSlugAutoManaged,
    primaryCategoryId,
    setPrimaryCategoryId,
    additionalCategoryIds,
    setAdditionalCategoryIds,
    salesMode,
    setSalesMode,
    presentation,
    setPresentation,
    basis,
    setBasis,
    price,
    setPrice,
    availability,
    setAvailability,
    specValues,
    setSpecValues,
    excludedSpecificationIds,
    setExcludedSpecificationIds,
    media,
    setMedia,
    documents,
    setDocuments,
    assetsUpdatedAt,
    setAssetsUpdatedAt,
    isPreviewing,
    setIsPreviewing,
    resetFromDetail,
  };
}
