"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/button";
import {
  CatalogProductDetail,
  type CatalogProductDetailLabels,
  type CatalogProductDetailView,
} from "../../../_components/catalog-product-detail";

import type {
  CatalogProductPublicationIssue,
  ManagedCatalogCategoryTreeItem,
  ManagedCatalogProductDetail,
  ManagedCatalogProductSummary,
  ManagedCatalogProductWorkspace,
} from "@/lib/catalog/management";
import {
  catalogLocales,
  catalogProductSlugForLocale,
  catalogSlugFromName,
  type CatalogAvailability,
  type CatalogLocale,
  type CatalogPriceEntryBasis,
  type CatalogPricePresentation,
  type CatalogProductCustomSpecificationInput,
  type CatalogProductSpecificationValueInput,
  type CatalogSalesMode,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import { DashboardSelect } from "../../_components/dashboard-select";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import {
  manageCatalogProductAction,
  saveCatalogProductAction,
  type ProductActionResult,
} from "../product-actions";

type ProductStatus = "draft" | "published" | "archived";
type LifecycleIntent = "publish" | "unpublish" | "archive" | "restore";
export type ProductEditorSection =
  | "general"
  | "content"
  | "specifications"
  | "media";

type FieldCopy = { label: string; help: string; example?: string };

export type ProductLabels = {
  views: { category: string; products: string; ariaLabel: string };
  list: {
    title: string;
    empty: string;
    add: string;
    open: string;
    untitled: string;
  };
  editor: {
    newTitle: string;
    newDescription: string;
    editDescription: string;
    back: string;
    readOnly: string;
    skuPending: string;
    complete: string;
    incomplete: string;
    unsaved: string;
  };
  preview: CatalogProductDetailLabels & {
    open: string;
    back: string;
    title: string;
    emptyTitle: string;
  };
  sections: Record<ProductEditorSection, string>;
  fields: {
    sku: FieldCopy;
    bgSlug: FieldCopy;
    enSlug: FieldCopy;
    trSlug: FieldCopy;
    ukSlug: FieldCopy;
    brand: FieldCopy;
    mpn: FieldCopy;
    primaryCategory: FieldCopy;
    additionalCategories: FieldCopy;
    salesMode: FieldCopy;
    pricePresentation: FieldCopy;
    price: FieldCopy;
    priceEntryBasis: FieldCopy;
    availability: FieldCopy;
    title: FieldCopy;
    shortDescription: FieldCopy;
    fullDescription: FieldCopy;
    metaDescription: FieldCopy;
    mediaReference: FieldCopy;
    altText: FieldCopy;
  };
  categories: {
    title: string;
    help: string;
    primaryHelp: string;
    additionalHelp: string;
    setPrimary: string;
    addAdditional: string;
    removeAdditional: string;
    primary: string;
    additional: string;
    expand: string;
    collapse: string;
  };
  sales: {
    directPurchase: string;
    enquiry: string;
    exact: string;
    from: string;
    onRequest: string;
    vatInclusive: string;
    vatExclusive: string;
    counterpartInclusive: string;
    counterpartExclusive: string;
    inStock: string;
    outOfStock: string;
  };
  content: {
    titleGuidance: string;
    titleStructure: string;
    updateSlug: string;
    seoGroup: string;
    previewTitle: string;
    previewNote: string;
    emptyProductTitle: string;
    emptyMetaDescription: string;
  };
  specifications: {
    empty: string;
    required: string;
    yes: string;
    no: string;
    choose: string;
    removeInherited: string;
    restoreInherited: string;
    removed: string;
    addCustom: string;
    customTitle: string;
    customHelp: string;
    customName: FieldCopy;
    customType: FieldCopy;
    customUnit: FieldCopy;
    customValue: FieldCopy;
    customOption: FieldCopy;
    addOption: string;
    removeOption: string;
    removeCustom: string;
    categoryChangePending: string;
    types: Record<CatalogSpecificationValueType, string>;
  };
  media: {
    empty: string;
    add: string;
    remove: string;
    moveUp: string;
    moveDown: string;
    primary: string;
    social: string;
    languageLabel: string;
  };
  actions: {
    create: string;
    creating: string;
    save: string;
    saving: string;
    publish: string;
    unpublish: string;
    archive: string;
    restore: string;
    working: string;
    cancel: string;
    reload: string;
  };
  lifecycle: Record<LifecycleIntent, { title: string; description: string; confirm: string }>;
  readiness: {
    title: string;
    ready: string;
    blocked: string;
    fields: Record<"title" | "shortDescription" | "fullDescription", string>;
    messages: Record<CatalogProductPublicationIssue["code"], string>;
  };
  validation: { required: string; invalid: string; slug: string; conflict: string };
  results: Record<string, string>;
  primaryCategoryChange: string;
};

type Props = {
  locale: string;
  catalogPath: string;
  categoryId: string;
  categories: ManagedCatalogCategoryTreeItem[];
  categoryConfigurations: ManagedCatalogProductWorkspace["categoryConfigurations"];
  products: ManagedCatalogProductSummary[];
  requestedProduct: string | null;
  selectedProduct: ManagedCatalogProductDetail | null;
  canManage: boolean;
  labels: ProductLabels;
  languages: Record<CatalogLocale, string>;
  statusLabels: Record<ProductStatus, string>;
  dirtySections: Set<ProductEditorSection>;
  onDirty: (section: ProductEditorSection) => void;
  clearAllDirty: () => void;
  confirmDiscard: () => boolean;
};

type ProductTranslationDraft = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  metaDescription: string;
};

type MediaDraft = {
  clientId: string;
  reference: string;
  isPrimary: boolean;
  isSocialImage: boolean;
  translations: Record<CatalogLocale, string>;
};

type CustomSpecificationDraft = Omit<
  CatalogProductCustomSpecificationInput,
  "translations" | "options"
> & {
  labels: Record<CatalogLocale, string>;
  options: Array<{
    id: string;
    labels: Record<CatalogLocale, string>;
  }>;
};

const initialResult: ProductActionResult = { status: "idle" };

const DashboardButton = ({ variant, ...props }: ComponentProps<typeof Button>) => (
  <Button {...props} variant={variant ?? (props.type === "submit" ? "primary" : "secondary")} />
);

function emptyLocalizedText() {
  return Object.fromEntries(catalogLocales.map((locale) => [locale, ""])) as Record<
    CatalogLocale,
    string
  >;
}

function emptyTranslations() {
  return Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      {
        title: "",
        shortDescription: "",
        fullDescription: "",
        metaDescription: "",
      },
    ]),
  ) as Record<CatalogLocale, ProductTranslationDraft>;
}

function translationsFromDetail(detail: ManagedCatalogProductDetail | null) {
  const drafts = emptyTranslations();
  for (const translation of detail?.translations ?? []) {
    drafts[translation.locale] = {
      title: translation.title,
      shortDescription: translation.shortDescription,
      fullDescription: translation.fullDescription,
      metaDescription: translation.metaDescription ?? "",
    };
  }
  return drafts;
}

function mediaFromDetail(detail: ManagedCatalogProductDetail | null) {
  return (detail?.media ?? []).map((item): MediaDraft => ({
    clientId: item.id,
    reference: item.reference,
    isPrimary: item.isPrimary,
    isSocialImage: item.isSocialImage,
    translations: Object.fromEntries(
      catalogLocales.map((locale) => [
        locale,
        item.translations.find((translation) => translation.locale === locale)?.altText ?? "",
      ]),
    ) as Record<CatalogLocale, string>,
  }));
}

function customSpecificationsFromDetail(detail: ManagedCatalogProductDetail | null) {
  return (detail?.specificationConfiguration.customSpecifications ?? []).map(
    (specification): CustomSpecificationDraft => ({
      id: specification.id,
      valueType: specification.valueType,
      unit: specification.unit,
      displayOrder: specification.displayOrder,
      value: specification.value,
      labels: Object.fromEntries(
        catalogLocales.map((locale) => [
          locale,
          specification.translations.find((translation) => translation.locale === locale)?.label ?? "",
        ]),
      ) as Record<CatalogLocale, string>,
      options: specification.options.map((option) => ({
        id: option.id,
        labels: Object.fromEntries(
          catalogLocales.map((locale) => [
            locale,
            option.translations.find((translation) => translation.locale === locale)?.label ?? "",
          ]),
        ) as Record<CatalogLocale, string>,
      })),
    }),
  );
}

function customScalarValue(
  value: CatalogProductCustomSpecificationInput["value"],
) {
  return value?.type === "text" || value?.type === "number" ? value.value : "";
}

function safeSlug(value: string) {
  try {
    return catalogSlugFromName(value);
  } catch {
    return "";
  }
}

function minorToInput(value: string | null) {
  if (!value) return "";
  const minor = BigInt(value);
  return `${minor / BigInt(100)}.${String(minor % BigInt(100)).padStart(2, "0")}`;
}

function priceCounterpart(value: string, basis: CatalogPriceEntryBasis) {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (minor <= BigInt(0)) return null;
  const counterpart = basis === "vat_inclusive"
    ? (minor * BigInt(100) + BigInt(60)) / BigInt(120)
    : (minor * BigInt(120) + BigInt(50)) / BigInt(100);
  return `${counterpart / BigInt(100)}.${String(counterpart % BigInt(100)).padStart(2, "0")}`;
}

function Field({ id, copy, error, children }: { id: string; copy: FieldCopy; error?: string; children: ReactNode }) {
  return (
    <div className="dashboard-catalog-field">
      <div className="dashboard-catalog-field-heading"><label htmlFor={id}>{copy.label}</label></div>
      {children}
      <small id={`${id}-help`}>{copy.help}</small>
      {error ? <small id={`${id}-error`} className="dashboard-catalog-field-error" role="alert">{error}</small> : null}
    </div>
  );
}

function fieldAria(id: string, error?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${id}-help${error ? ` ${id}-error` : ""}`,
  };
}

function ResultMessage({ result, labels, reload }: { result: ProductActionResult; labels: ProductLabels; reload: () => void }) {
  if (result.status === "idle" || !result.code) return null;
  return (
    <div className="dashboard-catalog-action-message" data-status={result.status} role={result.status === "error" ? "alert" : "status"}>
      <p>{labels.results[result.code] ?? labels.validation.invalid}</p>
      {result.code === "STALE" ? <DashboardButton type="button" onClick={reload}>{labels.actions.reload}</DashboardButton> : null}
    </div>
  );
}

function categoryAncestorIds(
  categories: ManagedCatalogCategoryTreeItem[],
  categoryIds: string[],
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ancestors = new Set<string>();

  for (const categoryId of categoryIds) {
    let parentId = byId.get(categoryId)?.parentId ?? null;
    const seen = new Set<string>();

    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      ancestors.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
  }

  return ancestors;
}

function categoryPublicPath(
  categories: ManagedCatalogCategoryTreeItem[],
  categoryId: string,
  locale: CatalogLocale,
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const segments: string[] = [];
  let currentId: string | null = categoryId;
  const seen = new Set<string>();

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const category = byId.get(currentId);
    if (!category) break;
    segments.push(locale === "bg" ? category.bgSlug : category.enSlug);
    currentId = category.parentId;
  }

  return segments.reverse().join("/");
}

function productPublicPath(
  categories: ManagedCatalogCategoryTreeItem[],
  primaryCategoryId: string,
  locale: CatalogLocale,
  bgSlug: string,
  enSlug: string,
  trSlug: string | null,
  ukSlug: string | null,
) {
  const localePrefix = locale === "bg" ? "" : `/${locale}`;
  const categoryPath = categoryPublicPath(categories, primaryCategoryId, locale);
  const productSlug = catalogProductSlugForLocale(
    { bgSlug, enSlug, trSlug, ukSlug },
    locale,
  );
  return `${localePrefix}/shop/${[categoryPath, productSlug].filter(Boolean).join("/")}`;
}

function categoryDisclosureIcon(expanded: boolean) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <path
        d={expanded ? "M5 7.5l5 5 5-5" : "M7.5 5l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CategoryPickerBranch({
  parentId,
  childrenByParent,
  primaryCategoryId,
  additionalCategoryIds,
  expanded,
  toggleExpanded,
  setPrimary,
  toggleAdditional,
  labels,
  disabled,
}: {
  parentId: string | null;
  childrenByParent: Map<string | null, ManagedCatalogCategoryTreeItem[]>;
  primaryCategoryId: string;
  additionalCategoryIds: string[];
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
  setPrimary: (id: string) => void;
  toggleAdditional: (id: string) => void;
  labels: ProductLabels;
  disabled: boolean;
}) {
  const categories = childrenByParent.get(parentId) ?? [];
  if (categories.length === 0) return null;

  return (
    <ul className="dashboard-catalog-category-tree-list">
      {categories.map((category) => {
        const childCategories = childrenByParent.get(category.id) ?? [];
        const hasChildren = childCategories.length > 0;
        const isExpanded = expanded.has(category.id);
        const primary = category.id === primaryCategoryId;
        const additional = additionalCategoryIds.includes(category.id);
        const childrenId = `catalog-product-category-children-${category.id}`;
        const toggleLabel = (isExpanded
          ? labels.categories.collapse
          : labels.categories.expand
        ).replace("{{category}}", category.name);

        return (
          <li
            key={category.id}
            className="dashboard-catalog-category-tree-item"
            data-has-children={hasChildren ? "true" : undefined}
          >
            <div
              className="dashboard-catalog-category-picker-row"
              data-primary={primary ? "true" : undefined}
              data-additional={additional ? "true" : undefined}
            >
              <div className="dashboard-catalog-category-node">
                {hasChildren ? (
                  <DashboardButton
                    type="button"
                    className="dashboard-catalog-category-toggle"
                    aria-expanded={isExpanded}
                    aria-controls={childrenId}
                    aria-label={toggleLabel}
                    onClick={() => toggleExpanded(category.id)}
                  >
                    {categoryDisclosureIcon(isExpanded)}
                  </DashboardButton>
                ) : (
                  <span className="dashboard-catalog-category-toggle-spacer" aria-hidden="true" />
                )}
                <span className="dashboard-catalog-category-name">{category.name}</span>
              </div>
              <div className="dashboard-catalog-category-actions">
                {primary ? (
                  <strong className="dashboard-catalog-category-role dashboard-catalog-category-role-primary">
                    {labels.categories.primary}
                  </strong>
                ) : (
                  <DashboardButton
                    type="button"
                    className="dashboard-catalog-category-role-action"
                    disabled={disabled || category.status === "archived"}
                    onClick={() => setPrimary(category.id)}
                  >
                    {labels.categories.setPrimary}
                  </DashboardButton>
                )}
                {!primary ? (
                  <DashboardButton
                    type="button"
                    className="dashboard-catalog-category-role-action dashboard-catalog-category-role-additional"
                    disabled={disabled || category.status === "archived"}
                    aria-pressed={additional}
                    onClick={() => toggleAdditional(category.id)}
                  >
                    {additional
                      ? labels.categories.removeAdditional
                      : labels.categories.addAdditional}
                  </DashboardButton>
                ) : null}
              </div>
            </div>
            {hasChildren ? (
              <div
                id={childrenId}
                className="dashboard-catalog-category-children"
                hidden={!isExpanded}
              >
                <CategoryPickerBranch
                  parentId={category.id}
                  childrenByParent={childrenByParent}
                  primaryCategoryId={primaryCategoryId}
                  additionalCategoryIds={additionalCategoryIds}
                  expanded={expanded}
                  toggleExpanded={toggleExpanded}
                  setPrimary={setPrimary}
                  toggleAdditional={toggleAdditional}
                  labels={labels}
                  disabled={disabled}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function CategorySelector({ categories, primaryCategoryId, additionalCategoryIds, setPrimary, toggleAdditional, labels, disabled, error }: {
  categories: ManagedCatalogCategoryTreeItem[];
  primaryCategoryId: string;
  additionalCategoryIds: string[];
  setPrimary: (id: string) => void;
  toggleAdditional: (id: string) => void;
  labels: ProductLabels;
  disabled: boolean;
  error?: string;
}) {
  const childrenByParent = useMemo(() => {
    const grouped = new Map<string | null, ManagedCatalogCategoryTreeItem[]>();
    for (const category of categories) {
      const siblings = grouped.get(category.parentId) ?? [];
      siblings.push(category);
      grouped.set(category.parentId, siblings);
    }
    return grouped;
  }, [categories]);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    categoryAncestorIds(categories, [primaryCategoryId, ...additionalCategoryIds]),
  );

  useEffect(() => {
    const requiredAncestors = categoryAncestorIds(categories, [
      primaryCategoryId,
      ...additionalCategoryIds,
    ]);
    setExpanded((current) => {
      const next = new Set(current);
      let changed = false;
      for (const categoryId of requiredAncestors) {
        if (!next.has(categoryId)) {
          next.add(categoryId);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [categories, primaryCategoryId, additionalCategoryIds]);

  const toggleExpanded = (categoryId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  return (
    <details id="catalog-product-categories" className="dashboard-catalog-product-categories" tabIndex={-1} open={error ? true : undefined}>
      <summary>{labels.categories.title}</summary>
      <div className="dashboard-catalog-product-categories-body">
        <p id="catalog-product-categories-help">{labels.categories.help}</p>
        <div className="dashboard-catalog-category-role-help">
          <p><strong>{labels.categories.primary}</strong> {labels.categories.primaryHelp}</p>
          <p><strong>{labels.categories.additional}</strong> {labels.categories.additionalHelp}</p>
        </div>
        <div className="dashboard-catalog-category-picker" role="group" aria-label={labels.categories.title} aria-describedby={`catalog-product-categories-help${error ? " catalog-product-categories-error" : ""}`} aria-invalid={error ? true : undefined}>
          <CategoryPickerBranch
            parentId={null}
            childrenByParent={childrenByParent}
            primaryCategoryId={primaryCategoryId}
            additionalCategoryIds={additionalCategoryIds}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            setPrimary={setPrimary}
            toggleAdditional={toggleAdditional}
            labels={labels}
            disabled={disabled}
          />
        </div>
        {error ? <small id="catalog-product-categories-error" className="dashboard-catalog-field-error" role="alert">{error}</small> : null}
      </div>
    </details>
  );
}

function CommerceFields({ salesMode, setSalesMode, presentation, setPresentation, basis, setBasis, price, setPrice, availability, setAvailability, labels, errors, disabled }: {
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
}) {
  const counterpart = presentation === "on_request" ? null : priceCounterpart(price, basis);
  return (
    <div className="dashboard-catalog-product-commerce-grid">
      <Field id="catalog-product-sales-mode" copy={labels.fields.salesMode} error={errors.salesMode ? labels.validation.required : undefined}>
        <DashboardSelect id="catalog-product-sales-mode" name="salesMode" value={salesMode} disabled={disabled} onChange={(event) => { const value = event.target.value as CatalogSalesMode; setSalesMode(value); if (value === "direct_purchase") setPresentation("exact"); }} {...fieldAria("catalog-product-sales-mode", errors.salesMode ? labels.validation.required : undefined)}>
          <option value="direct_purchase">{labels.sales.directPurchase}</option><option value="enquiry">{labels.sales.enquiry}</option>
        </DashboardSelect>
      </Field>
      <Field id="catalog-product-price-presentation" copy={labels.fields.pricePresentation} error={errors.pricePresentation ? labels.validation.invalid : undefined}>
        <DashboardSelect id="catalog-product-price-presentation" name="pricePresentation" value={salesMode === "direct_purchase" ? "exact" : presentation} disabled={disabled || salesMode === "direct_purchase"} onChange={(event) => setPresentation(event.target.value as CatalogPricePresentation)} {...fieldAria("catalog-product-price-presentation", errors.pricePresentation ? labels.validation.invalid : undefined)}>
          <option value="exact">{labels.sales.exact}</option>{salesMode === "enquiry" ? <><option value="from">{labels.sales.from}</option><option value="on_request">{labels.sales.onRequest}</option></> : null}
        </DashboardSelect>
        {salesMode === "direct_purchase" ? <input type="hidden" name="pricePresentation" value="exact" /> : null}
      </Field>
      {presentation !== "on_request" || salesMode === "direct_purchase" ? <>
        <Field id="catalog-product-price" copy={labels.fields.price} error={errors.price ? labels.validation.invalid : undefined}>
          <input id="catalog-product-price" name="price" value={price} disabled={disabled} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="0.00" {...fieldAria("catalog-product-price", errors.price ? labels.validation.invalid : undefined)} />
          {counterpart ? <small className="dashboard-catalog-price-counterpart" id="catalog-product-price-counterpart">{basis === "vat_inclusive" ? labels.sales.counterpartExclusive : labels.sales.counterpartInclusive}: {counterpart} EUR</small> : null}
        </Field>
        <Field id="catalog-product-price-basis" copy={labels.fields.priceEntryBasis} error={errors.priceEntryBasis ? labels.validation.required : undefined}>
          <DashboardSelect id="catalog-product-price-basis" name="priceEntryBasis" value={basis} disabled={disabled} onChange={(event) => setBasis(event.target.value as CatalogPriceEntryBasis)} {...fieldAria("catalog-product-price-basis", errors.priceEntryBasis ? labels.validation.required : undefined)}><option value="vat_inclusive">{labels.sales.vatInclusive}</option><option value="vat_exclusive">{labels.sales.vatExclusive}</option></DashboardSelect>
        </Field>
      </> : <><input type="hidden" name="price" value="" /><input type="hidden" name="priceEntryBasis" value="" /></>}
      {salesMode === "direct_purchase" ? <Field id="catalog-product-availability" copy={labels.fields.availability} error={errors.availability ? labels.validation.required : undefined}>
        <DashboardSelect id="catalog-product-availability" name="availability" value={availability} disabled={disabled} onChange={(event) => setAvailability(event.target.value as CatalogAvailability)} {...fieldAria("catalog-product-availability", errors.availability ? labels.validation.required : undefined)}><option value="in_stock">{labels.sales.inStock}</option><option value="out_of_stock">{labels.sales.outOfStock}</option></DashboardSelect>
      </Field> : <input type="hidden" name="availability" value="" />}
    </div>
  );
}

function ProductList({ products, categoryId, catalogPath, canManage, labels, statusLabels }: Props) {
  const base = `${catalogPath}?category=${categoryId}&view=products`;
  return (
    <section className="dashboard-catalog-products" aria-labelledby="catalog-products-title">
      <div className="dashboard-catalog-panel-heading"><div><h2 id="catalog-products-title">{labels.list.title}</h2><p>{labels.editor.editDescription}</p></div>{canManage ? <ButtonLink href={`${base}&product=new`}>{labels.list.add}</ButtonLink> : null}</div>
      {products.length === 0 ? <p className="dashboard-catalog-empty">{labels.list.empty}</p> : <ul className="dashboard-catalog-product-list">{products.map((product) => <li key={product.id}><Link href={`${base}&product=${product.id}`} aria-label={`${labels.list.open}: ${product.title || labels.list.untitled}`}><span className="dashboard-catalog-product-list-copy"><strong>{product.title || labels.list.untitled}</strong><small>{product.sku}</small></span><span className="dashboard-catalog-product-list-facts"><span className="dashboard-catalog-status" data-status={product.status}>{statusLabels[product.status]}</span><small>{product.salesMode === "direct_purchase" ? labels.sales.directPurchase : labels.sales.enquiry}{product.availability ? ` · ${product.availability === "in_stock" ? labels.sales.inStock : labels.sales.outOfStock}` : ""}</small></span></Link></li>)}</ul>}
    </section>
  );
}

function issueText(issue: CatalogProductPublicationIssue, detail: ManagedCatalogProductDetail, props: Props) {
  const { labels, languages, categories, locale } = props;
  let text = labels.readiness.messages[issue.code];
  if ("locale" in issue) text = text.replace("{{locale}}", languages[issue.locale]);
  if (issue.code === "MISSING_PRODUCT_TRANSLATION_FIELD") text = text.replace("{{field}}", labels.readiness.fields[issue.field]);
  if (issue.code === "CATEGORY_NOT_PUBLISHED") text = text.replace("{{category}}", categories.find(({ id }) => id === issue.categoryId)?.name ?? issue.categoryId);
  if ("specificationId" in issue) {
    const categorySpecification = detail.specifications.find(({ id }) => id === issue.specificationId);
    const customSpecification = detail.specificationConfiguration.customSpecifications.find(({ id }) => id === issue.specificationId);
    const name = categorySpecification?.translations.find((translation) => translation.locale === locale)?.label ?? categorySpecification?.key ?? customSpecification?.translations.find((translation) => translation.locale === locale)?.label ?? customSpecification?.translations.find((translation) => translation.locale === "bg")?.label ?? issue.specificationId;
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

function ProductEditor(props: Props & { detail: ManagedCatalogProductDetail | null }) {
  const { detail, labels, locale, languages, categories, canManage, categoryId, catalogPath, dirtySections, onDirty, clearAllDirty } = props;
  const router = useRouter();
  const creating = detail === null;
  const [saveResult, saveAction, savePending] = useActionState(saveCatalogProductAction, initialResult);
  const [creationSubmissionLocked, setCreationSubmissionLocked] = useState(false);
  const [lifecycleResult, setLifecycleResult] = useState<ProductActionResult>(initialResult);
  const [lifecyclePending, startLifecycle] = useTransition();
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>("bg");
  const [origin, setOrigin] = useState("");
  const [brand, setBrand] = useState(detail?.brand ?? "");
  const [mpn, setMpn] = useState(detail?.mpn ?? "");
  const [translations, setTranslations] = useState(() => translationsFromDetail(detail));
  const [bgSlug, setBgSlug] = useState(detail?.bgSlug ?? "");
  const [enSlug, setEnSlug] = useState(detail?.enSlug ?? "");
  const [trSlug, setTrSlug] = useState(detail?.trSlug ?? "");
  const [ukSlug, setUkSlug] = useState(detail?.ukSlug ?? "");
  const [bgSlugAutoManaged, setBgSlugAutoManaged] = useState(
    creating || detail?.bgSlug === safeSlug(translationsFromDetail(detail).bg.title),
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
    !detail?.trSlug || detail.trSlug === safeSlug(translationsFromDetail(detail).tr.title),
  );
  const [ukSlugAutoManaged, setUkSlugAutoManaged] = useState(
    !detail?.ukSlug || detail.ukSlug === safeSlug(translationsFromDetail(detail).uk.title),
  );
  const [primaryCategoryId, setPrimaryCategoryId] = useState(detail?.primaryCategoryId ?? categoryId);
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState(detail?.additionalCategoryIds ?? []);
  const [salesMode, setSalesMode] = useState<CatalogSalesMode>(detail?.salesMode ?? "direct_purchase");
  const [presentation, setPresentation] = useState<CatalogPricePresentation>(detail?.pricePresentation ?? "exact");
  const [basis, setBasis] = useState<CatalogPriceEntryBasis>(detail?.priceEntryBasis ?? "vat_inclusive");
  const [price, setPrice] = useState(minorToInput(detail?.priceInputMinor ?? null));
  const [availability, setAvailability] = useState<CatalogAvailability>(detail?.availability ?? "in_stock");
  const [specValues, setSpecValues] = useState<CatalogProductSpecificationValueInput[]>(detail?.specificationValues ?? []);
  const [excludedSpecificationIds, setExcludedSpecificationIds] = useState(detail?.specificationConfiguration.excludedSpecificationIds ?? []);
  const [customSpecifications, setCustomSpecifications] = useState<CustomSpecificationDraft[]>(() => customSpecificationsFromDetail(detail));
  const [media, setMedia] = useState<MediaDraft[]>(() => mediaFromDetail(detail));
  const [isPreviewing, setIsPreviewing] = useState(false);
  const revisionRef = useRef(0);
  const submittedRevisionRef = useRef<number | null>(null);
  const acceptedSaveRef = useRef<string | null>(null);
  const reloadRequestedRef = useRef<string | null>(null);
  const lifecycleDialog = useRef<HTMLDialogElement>(null);
  const lifecycleInvoker = useRef<HTMLButtonElement | null>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const saveIssuesRef = useRef<HTMLDivElement | null>(null);
  const restorePreviewFocusRef = useRef(false);
  const [lifecycleIntent, setLifecycleIntent] = useState<LifecycleIntent | null>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const markDirty = (section: ProductEditorSection) => {
    revisionRef.current += 1;
    onDirty(section);
  };

  const resetFromDetail = (nextDetail: ManagedCatalogProductDetail) => {
    setIsPreviewing(false);
    setBrand(nextDetail.brand ?? "");
    setMpn(nextDetail.mpn ?? "");
    const nextTranslations = translationsFromDetail(nextDetail);
    setTranslations(nextTranslations);
    setBgSlug(nextDetail.bgSlug);
    setEnSlug(nextDetail.enSlug);
    setTrSlug(nextDetail.trSlug ?? "");
    setUkSlug(nextDetail.ukSlug ?? "");
    setBgSlugAutoManaged(nextDetail.bgSlug === safeSlug(nextTranslations.bg.title));
    setEnSlugAutoManaged(
      nextDetail.enSlug === safeSlug(nextTranslations.en.title || nextTranslations.bg.title),
    );
    setTrSlugAutoManaged(
      !nextDetail.trSlug || nextDetail.trSlug === safeSlug(nextTranslations.tr.title),
    );
    setUkSlugAutoManaged(
      !nextDetail.ukSlug || nextDetail.ukSlug === safeSlug(nextTranslations.uk.title),
    );
    setPrimaryCategoryId(nextDetail.primaryCategoryId);
    setAdditionalCategoryIds(nextDetail.additionalCategoryIds);
    setSalesMode(nextDetail.salesMode);
    setPresentation(nextDetail.pricePresentation);
    setBasis(nextDetail.priceEntryBasis ?? "vat_inclusive");
    setPrice(minorToInput(nextDetail.priceInputMinor));
    setAvailability(nextDetail.availability ?? "in_stock");
    setSpecValues(nextDetail.specificationValues);
    setExcludedSpecificationIds(nextDetail.specificationConfiguration.excludedSpecificationIds);
    setCustomSpecifications(customSpecificationsFromDetail(nextDetail));
    setMedia(mediaFromDetail(nextDetail));
  };

  useEffect(() => {
    if (isPreviewing) {
      requestAnimationFrame(() => previewHeadingRef.current?.focus());
      return;
    }
    if (restorePreviewFocusRef.current) {
      restorePreviewFocusRef.current = false;
      requestAnimationFrame(() => previewTriggerRef.current?.focus());
    }
  }, [isPreviewing]);

  const reloadFromServer = () => {
    reloadRequestedRef.current = detail?.updatedAt ?? null;
    router.refresh();
  };

  useEffect(() => {
    if (
      !detail ||
      !reloadRequestedRef.current ||
      reloadRequestedRef.current === detail.updatedAt
    ) return;
    reloadRequestedRef.current = null;
    resetFromDetail(detail);
    clearAllDirty();
  }, [detail, clearAllDirty]);

  useEffect(() => {
    if (saveResult.status !== "success" || !saveResult.updatedAt) return;
    if (creating && saveResult.targetId) {
      clearAllDirty();
      router.replace(`${catalogPath}?category=${categoryId}&view=products&product=${saveResult.targetId}`);
      return;
    }
    if (!detail || detail.updatedAt !== saveResult.updatedAt || acceptedSaveRef.current === saveResult.updatedAt) return;
    acceptedSaveRef.current = saveResult.updatedAt;
    if (submittedRevisionRef.current === revisionRef.current) {
      resetFromDetail(detail);
      clearAllDirty();
    }
  }, [saveResult, detail, creating, clearAllDirty, router, catalogPath, categoryId]);

  useEffect(() => {
    if (saveResult.status !== "error") return;
    if (creating) setCreationSubmissionLocked(false);
    const ids: Record<string, string> = {
      "content.bg.title": "catalog-product-title-bg",
      bgSlug: "catalog-product-bg-slug",
      enSlug: "catalog-product-en-slug",
      trSlug: "catalog-product-tr-slug",
      ukSlug: "catalog-product-uk-slug",
      mpn: "catalog-product-mpn",
      primaryCategoryId: "catalog-product-categories",
      additionalCategoryIds: "catalog-product-categories",
      salesMode: "catalog-product-sales-mode",
      pricePresentation: "catalog-product-price-presentation",
      price: "catalog-product-price",
      priceEntryBasis: "catalog-product-price-basis",
      availability: "catalog-product-availability",
    };
    const firstField = Object.keys(saveResult.fieldErrors ?? {}).find((key) => ids[key]);
    const first = firstField ? ids[firstField] : undefined;
    if (firstField === "content.bg.title" || firstField === "bgSlug") setActiveLocale("bg");
    if (firstField === "enSlug") setActiveLocale("en");
    if (firstField === "trSlug") setActiveLocale("tr");
    if (firstField === "ukSlug") setActiveLocale("uk");
    if (first) {
      requestAnimationFrame(() => document.getElementById(first)?.focus());
      return;
    }
    if (saveResult.publicationIssues?.length) {
      requestAnimationFrame(() => saveIssuesRef.current?.focus());
    }
  }, [saveResult, creating]);

  const initialPrimaryCategoryId = detail?.primaryCategoryId ?? categoryId;
  const primaryCategoryConfiguration = props.categoryConfigurations.find(
    ({ categoryId: configuredCategoryId }) =>
      configuredCategoryId === primaryCategoryId,
  );
  const inheritedSpecifications =
    primaryCategoryConfiguration?.specifications ?? [];
  const visibleInheritedSpecifications = inheritedSpecifications.filter(({ id }) => !excludedSpecificationIds.includes(id));
  const removedInheritedSpecifications = inheritedSpecifications.filter(({ id }) => excludedSpecificationIds.includes(id));
  const titleGuidance = primaryCategoryConfiguration?.titleGuidance ?? [];
  const contentComplete = Object.fromEntries(catalogLocales.map((contentLocale) => {
    const draft = translations[contentLocale];
    return [contentLocale, Boolean(draft.title.trim() && draft.shortDescription.trim() && draft.fullDescription.trim())];
  })) as Record<CatalogLocale, boolean>;
  const errors = saveResult.fieldErrors ?? {};
  const editorDisabled = !canManage || (creating && creationSubmissionLocked);
  const bgSlugError = errors.bgSlug ? errors.bgSlug === "CONFLICT" ? labels.validation.conflict : labels.validation.slug : undefined;
  const enSlugError = errors.enSlug ? errors.enSlug === "CONFLICT" ? labels.validation.conflict : labels.validation.slug : undefined;
  const trSlugError = errors.trSlug ? errors.trSlug === "CONFLICT" ? labels.validation.conflict : labels.validation.slug : undefined;
  const ukSlugError = errors.ukSlug ? errors.ukSlug === "CONFLICT" ? labels.validation.conflict : labels.validation.slug : undefined;
  const mpnError = errors.mpn ? labels.validation.required : undefined;
  const categoryError = errors.primaryCategoryId || errors.additionalCategoryIds ? labels.validation.invalid : undefined;
  const bgTitleError = errors["content.bg.title"] ? labels.validation.required : undefined;
  const updateTranslation = (contentLocale: CatalogLocale, field: keyof ProductTranslationDraft, value: string) => {
    setTranslations((current) => ({ ...current, [contentLocale]: { ...current[contentLocale], [field]: value } }));
    if (field === "title" && creating) {
      if (contentLocale === "bg") {
        if (bgSlugAutoManaged) setBgSlug(safeSlug(value));
        if (enSlugAutoManaged && !translations.en.title.trim()) setEnSlug(safeSlug(value));
      }
      if (contentLocale === "en" && enSlugAutoManaged) {
        setEnSlug(safeSlug(value || translations.bg.title));
      }
    }
    markDirty(field === "title" ? "general" : "content");
  };

  const productSlugs: Record<CatalogLocale, string> = {
    bg: bgSlug,
    en: enSlug,
    tr: trSlug,
    uk: ukSlug,
  };
  const slugErrors: Partial<Record<CatalogLocale, string>> = {
    bg: bgSlugError,
    en: enSlugError,
    tr: trSlugError,
    uk: ukSlugError,
  };
  const slugCopyByLocale: Record<CatalogLocale, FieldCopy> = {
    bg: labels.fields.bgSlug,
    en: labels.fields.enSlug,
    tr: labels.fields.trSlug,
    uk: labels.fields.ukSlug,
  };
  const slugAutoManaged: Record<CatalogLocale, boolean> = {
    bg: bgSlugAutoManaged,
    en: enSlugAutoManaged,
    tr: trSlugAutoManaged,
    uk: ukSlugAutoManaged,
  };
  const updateProductSlug = (
    contentLocale: CatalogLocale,
    value: string,
    manual: boolean,
  ) => {
    if (contentLocale === "bg") {
      setBgSlug(value);
      if (manual) setBgSlugAutoManaged(false);
    } else if (contentLocale === "en") {
      setEnSlug(value);
      if (manual) setEnSlugAutoManaged(false);
    } else if (contentLocale === "tr") {
      setTrSlug(value);
      if (manual) setTrSlugAutoManaged(false);
    } else {
      setUkSlug(value);
      if (manual) setUkSlugAutoManaged(false);
    }
    markDirty("content");
  };

  const setInheritedValue = (specificationId: string, value: CatalogProductSpecificationValueInput | null) => {
    setSpecValues((current) => value ? [...current.filter((item) => item.specificationId !== specificationId), value] : current.filter((item) => item.specificationId !== specificationId));
    markDirty("specifications");
  };

  const setPrimary = (nextCategoryId: string) => {
    if (nextCategoryId === primaryCategoryId) return;
    if ((specValues.length > 0 || excludedSpecificationIds.length > 0) && !window.confirm(labels.primaryCategoryChange)) return;
    setPrimaryCategoryId(nextCategoryId);
    setAdditionalCategoryIds((current) => current.filter((id) => id !== nextCategoryId));
    setSpecValues([]);
    setExcludedSpecificationIds([]);
    markDirty("general");
    markDirty("specifications");
  };

  const openLifecycle = (intent: LifecycleIntent, button: HTMLButtonElement) => {
    if (dirtySections.size > 0 && !props.confirmDiscard()) return;
    if (detail) resetFromDetail(detail);
    clearAllDirty();
    setLifecycleResult(initialResult);
    setLifecycleIntent(intent);
    lifecycleInvoker.current = button;
    lifecycleDialog.current?.showModal();
  };

  const serializeConfiguration = JSON.stringify({
    excludedSpecificationIds,
    customSpecifications: customSpecifications.map((specification, displayOrder) => ({
      id: specification.id,
      valueType: specification.valueType,
      unit: specification.unit,
      displayOrder,
      translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, label: specification.labels[contentLocale] })),
      options: specification.options.map((option, optionOrder) => ({ id: option.id, displayOrder: optionOrder, translations: catalogLocales.map((contentLocale) => ({ locale: contentLocale, label: option.labels[contentLocale] })) })),
      value: specification.value,
    })),
  });

  const previewProduct = useMemo<CatalogProductDetailView>(() => {
    const content = translations[activeLocale];
    const inherited = visibleInheritedSpecifications.flatMap((specification) => {
      const value = specValues.find((item) => item.specificationId === specification.id);
      if (!value) return [];
      const label = specification.translations.find((item) => item.locale === activeLocale)?.label
        ?? specification.translations.find((item) => item.locale === "bg")?.label
        ?? specification.key;
      const renderedValue = value.type === "text" || value.type === "number"
        ? `${value.value}${value.type === "number" && specification.unit ? ` ${specification.unit}` : ""}`
        : value.type === "boolean"
          ? value.value ? labels.specifications.yes : labels.specifications.no
          : specification.options.find((option) => option.id === value.optionId)?.translations.find((item) => item.locale === activeLocale)?.label
            ?? specification.options.find((option) => option.id === value.optionId)?.translations.find((item) => item.locale === "bg")?.label
            ?? "";
      return renderedValue ? [{ label, value: renderedValue }] : [];
    });
    const custom = customSpecifications.flatMap((specification) => {
      if (!specification.value) return [];
      const label = specification.labels[activeLocale] || specification.labels.bg;
      if (!label) return [];
      const renderedValue = specification.value.type === "text" || specification.value.type === "number"
        ? `${specification.value.value}${specification.value.type === "number" && specification.unit ? ` ${specification.unit}` : ""}`
        : specification.value.type === "boolean"
          ? specification.value.value ? labels.specifications.yes : labels.specifications.no
          : specification.options.find((option) => option.id === specification.value.optionId)?.labels[activeLocale]
            || specification.options.find((option) => option.id === specification.value.optionId)?.labels.bg
            || "";
      return renderedValue ? [{ label, value: renderedValue }] : [];
    });
    const previewMedia = media
      .filter((item) => item.reference.trim())
      .map((item) => ({
        reference: item.reference.trim(),
        altText: item.translations[activeLocale].trim() || item.translations.bg.trim() || "",
        isPrimary: item.isPrimary,
      }));
    const primary = previewMedia.find((item) => item.isPrimary) ?? null;
    const presentationLabel = salesMode === "enquiry" && presentation === "from"
      ? `${labels.sales.from} `
      : "";

    return {
      title: content.title.trim() || labels.preview.emptyTitle,
      brand: brand.trim() || null,
      model: mpn.trim() || null,
      shortDescription: content.shortDescription.trim(),
      fullDescription: content.fullDescription.trim(),
      price: presentation === "on_request"
        ? labels.sales.onRequest
        : price.trim() ? `${presentationLabel}${price.trim()} EUR` : null,
      availability: salesMode === "direct_purchase"
        ? availability === "in_stock" ? labels.sales.inStock : labels.sales.outOfStock
        : null,
      primaryMedia: primary,
      gallery: previewMedia,
      specifications: [...inherited, ...custom],
    };
  }, [activeLocale, availability, brand, customSpecifications, labels, media, mpn, presentation, price, salesMode, specValues, translations, visibleInheritedSpecifications]);

  return (
    <article className="dashboard-catalog-editor dashboard-catalog-product-editor">
      {isPreviewing ? (
        <section className="dashboard-catalog-product-detail-preview" aria-labelledby="catalog-product-preview-title">
          <div className="dashboard-catalog-product-detail-preview-toolbar">
            <DashboardButton
              type="button"
              onClick={() => {
                restorePreviewFocusRef.current = true;
                setIsPreviewing(false);
              }}
            >
              {labels.preview.back}
            </DashboardButton>
          </div>
          <h2 id="catalog-product-preview-title" ref={previewHeadingRef} tabIndex={-1}>
            {labels.preview.title}
          </h2>
          <CatalogProductDetail product={previewProduct} labels={labels.preview} />
        </section>
      ) : null}
      <div hidden={isPreviewing}>
      <ButtonLink variant="informational" href={`${catalogPath}?category=${categoryId}&view=products`}>{labels.editor.back}</ButtonLink>
      <header className="dashboard-catalog-editor-header">
        <div>{detail ? <span className="dashboard-catalog-status" data-status={detail.status}>{props.statusLabels[detail.status]}</span> : null}<h2>{creating ? labels.editor.newTitle : translations[locale as CatalogLocale]?.title || translations.bg.title || labels.list.untitled}</h2><p>{creating ? labels.editor.newDescription : labels.editor.editDescription}</p>{detail ? <small>{detail.sku}</small> : null}</div>
        {detail && canManage ? <div className="dashboard-catalog-lifecycle-actions">
          {detail.status === "draft" ? <><DashboardButton type="button" onClick={(event) => openLifecycle("publish", event.currentTarget)}>{labels.actions.publish}</DashboardButton><DashboardButton type="button" onClick={(event) => openLifecycle("archive", event.currentTarget)}>{labels.actions.archive}</DashboardButton></> : null}
          {detail.status === "published" ? <><DashboardButton type="button" onClick={(event) => openLifecycle("unpublish", event.currentTarget)}>{labels.actions.unpublish}</DashboardButton><DashboardButton type="button" onClick={(event) => openLifecycle("archive", event.currentTarget)}>{labels.actions.archive}</DashboardButton></> : null}
          {detail.status === "archived" ? <DashboardButton type="button" onClick={(event) => openLifecycle("restore", event.currentTarget)}>{labels.actions.restore}</DashboardButton> : null}
        </div> : null}
      </header>
      {!canManage ? <p className="dashboard-catalog-read-only">{labels.editor.readOnly}</p> : null}
      {detail ? <section className="dashboard-catalog-readiness" aria-labelledby="product-readiness-title"><h3 id="product-readiness-title">{labels.readiness.title}</h3><p>{detail.publicationIssues.length === 0 ? labels.readiness.ready : labels.readiness.blocked}</p>{detail.publicationIssues.length ? <ul>{detail.publicationIssues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issueText(issue, detail, props)}</li>)}</ul> : null}</section> : null}

      <form action={saveAction} aria-busy={savePending} onSubmit={() => {
        submittedRevisionRef.current = revisionRef.current;
        if (creating) setCreationSubmissionLocked(true);
      }}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productId" value={detail?.id ?? ""} />
        <input type="hidden" name="expectedUpdatedAt" value={detail?.updatedAt ?? ""} />
        <input type="hidden" name="discardSpecificationValues" value={primaryCategoryId !== initialPrimaryCategoryId ? "true" : "false"} />
        <input type="hidden" name="primaryCategoryId" value={primaryCategoryId} />
        <input type="hidden" name="specificationValues" value={JSON.stringify(specValues.filter(({ specificationId }) => !excludedSpecificationIds.includes(specificationId)))} />
        <input type="hidden" name="specificationConfiguration" value={serializeConfiguration} />
        <input type="hidden" name="media" value={JSON.stringify(media)} />
        {additionalCategoryIds.map((id) => <input key={id} type="hidden" name="additionalCategoryIds" value={id} />)}

        <details className="dashboard-catalog-section" open><summary>{labels.sections.general}</summary>
          <LocalizedEditorSwitch
            idPrefix="product-title"
            variant="selector"
            activeLocale={activeLocale}
            onChange={setActiveLocale}
            languageNames={languages}
            statusByLocale={Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, Boolean(translations[contentLocale].title.trim())])) as Record<CatalogLocale, boolean>}
            completeLabel={labels.editor.complete}
            incompleteLabel={labels.editor.incomplete}
            ariaLabel={labels.fields.title.label}
          />
          <fieldset disabled={editorDisabled} className="dashboard-catalog-product-fieldset" onChange={() => markDirty("general")}>
            <div className="dashboard-catalog-product-title-editor">
              {catalogLocales.map((contentLocale) => {
                const values = translations[contentLocale];
                const guidance = titleGuidance.find((item) => item.locale === contentLocale)?.value ?? titleGuidance.find((item) => item.locale === "bg")?.value;
                const titleError = contentLocale === "bg" ? bgTitleError : undefined;

                return (
                  <div key={contentLocale} hidden={activeLocale !== contentLocale}>
                    <Field id={`catalog-product-title-${contentLocale}`} copy={labels.fields.title} error={titleError}>
                      <input
                        id={`catalog-product-title-${contentLocale}`}
                        name={`content.${contentLocale}.title`}
                        value={values.title}
                        onChange={(event) => updateTranslation(contentLocale, "title", event.target.value)}
                        required={contentLocale === "bg"}
                        maxLength={200}
                        {...fieldAria(`catalog-product-title-${contentLocale}`, titleError)}
                      />
                    </Field>
                    <aside className="dashboard-catalog-title-guidance">
                      <strong>{labels.content.titleGuidance}</strong>
                      <p>{guidance || labels.content.titleStructure}</p>
                      {guidance ? <small>{labels.content.titleStructure}</small> : null}
                    </aside>
                  </div>
                );
              })}
            </div>
            <div className="dashboard-catalog-product-form-grid">
              <Field id="catalog-product-sku" copy={labels.fields.sku}><input id="catalog-product-sku" value={detail?.sku ?? labels.editor.skuPending} readOnly aria-describedby="catalog-product-sku-help" /></Field>
              <Field id="catalog-product-brand" copy={labels.fields.brand}><input id="catalog-product-brand" name="brand" value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={120} aria-describedby="catalog-product-brand-help" /></Field>
              <Field id="catalog-product-mpn" copy={labels.fields.mpn} error={mpnError}><input id="catalog-product-mpn" name="mpn" value={mpn} onChange={(event) => setMpn(event.target.value)} required maxLength={100} {...fieldAria("catalog-product-mpn", mpnError)} /></Field>
            </div>
          </fieldset>
          <CategorySelector categories={categories} primaryCategoryId={primaryCategoryId} additionalCategoryIds={additionalCategoryIds} setPrimary={setPrimary} toggleAdditional={(id) => { setAdditionalCategoryIds((current) => current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]); markDirty("general"); }} labels={labels} disabled={editorDisabled} error={categoryError} />
          <fieldset disabled={editorDisabled} className="dashboard-catalog-product-fieldset" onChange={() => markDirty("general")}>
            <CommerceFields salesMode={salesMode} setSalesMode={setSalesMode} presentation={presentation} setPresentation={setPresentation} basis={basis} setBasis={setBasis} price={price} setPrice={setPrice} availability={availability} setAvailability={setAvailability} labels={labels} errors={errors} disabled={editorDisabled} />
          </fieldset>
        </details>

        <details className="dashboard-catalog-section" open><summary>{labels.sections.specifications}</summary>
          <fieldset disabled={editorDisabled} className="dashboard-catalog-product-fieldset dashboard-catalog-product-specifications" onChange={() => markDirty("specifications")}>
            {primaryCategoryId !== initialPrimaryCategoryId ? <p>{labels.specifications.categoryChangePending}</p> : null}
            {visibleInheritedSpecifications.length === 0 && customSpecifications.length === 0 ? <p>{labels.specifications.empty}</p> : null}
            {visibleInheritedSpecifications.map((specification) => {
              const label = specification.translations.find((item) => item.locale === locale)?.label ?? specification.translations.find((item) => item.locale === "bg")?.label ?? specification.key;
              const value = specValues.find((item) => item.specificationId === specification.id);
              return <div key={specification.id} className="dashboard-catalog-product-specification"><div className="dashboard-catalog-product-specification-heading"><label htmlFor={`product-spec-${specification.id}`}>{label}{specification.unit ? ` (${specification.unit})` : ""}{specification.isRequired ? <small> {labels.specifications.required}</small> : null}</label><DashboardButton type="button" onClick={() => { setExcludedSpecificationIds((current) => [...current, specification.id]); setSpecValues((current) => current.filter((item) => item.specificationId !== specification.id)); markDirty("specifications"); }}>{labels.specifications.removeInherited}</DashboardButton></div>
                {specification.valueType === "text" ? <input id={`product-spec-${specification.id}`} value={value?.type === "text" ? value.value : ""} onChange={(event) => setInheritedValue(specification.id, event.target.value ? { specificationId: specification.id, type: "text", value: event.target.value } : null)} /> : null}
                {specification.valueType === "number" ? <input id={`product-spec-${specification.id}`} inputMode="decimal" value={value?.type === "number" ? value.value : ""} onChange={(event) => setInheritedValue(specification.id, event.target.value ? { specificationId: specification.id, type: "number", value: event.target.value } : null)} /> : null}
                {specification.valueType === "boolean" ? <DashboardSelect id={`product-spec-${specification.id}`} value={value?.type === "boolean" ? String(value.value) : ""} onChange={(event) => setInheritedValue(specification.id, event.target.value === "" ? null : { specificationId: specification.id, type: "boolean", value: event.target.value === "true" })}><option value="">{labels.specifications.choose}</option><option value="true">{labels.specifications.yes}</option><option value="false">{labels.specifications.no}</option></DashboardSelect> : null}
                {specification.valueType === "selection" ? <DashboardSelect id={`product-spec-${specification.id}`} value={value?.type === "selection" ? value.optionId : ""} onChange={(event) => setInheritedValue(specification.id, event.target.value ? { specificationId: specification.id, type: "selection", optionId: event.target.value } : null)}><option value="">{labels.specifications.choose}</option>{specification.options.map((option) => <option key={option.id} value={option.id}>{option.translations.find((item) => item.locale === locale)?.label ?? option.translations.find((item) => item.locale === "bg")?.label ?? option.code}</option>)}</DashboardSelect> : null}
              </div>;
            })}
            {removedInheritedSpecifications.length ? <div className="dashboard-catalog-removed-specifications"><strong>{labels.specifications.removed}</strong>{removedInheritedSpecifications.map((specification) => <DashboardButton key={specification.id} type="button" onClick={() => { setExcludedSpecificationIds((current) => current.filter((id) => id !== specification.id)); markDirty("specifications"); }}>{labels.specifications.restoreInherited}: {specification.translations.find((item) => item.locale === locale)?.label ?? specification.key}</DashboardButton>)}</div> : null}
            {customSpecifications.map((specification, index) => <section key={specification.id} className="dashboard-catalog-custom-specification" aria-labelledby={`custom-spec-${specification.id}-title`}><div className="dashboard-catalog-product-specification-heading"><h3 id={`custom-spec-${specification.id}-title`}>{labels.specifications.customTitle} {index + 1}</h3><DashboardButton type="button" onClick={() => { setCustomSpecifications((current) => current.filter(({ id }) => id !== specification.id)); markDirty("specifications"); }}>{labels.specifications.removeCustom}</DashboardButton></div>
              <p>{labels.specifications.customHelp}</p>
              <LocalizedEditorSwitch idPrefix={`custom-spec-${specification.id}`} variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, Boolean(specification.labels[contentLocale].trim())])) as Record<CatalogLocale, boolean>} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.specifications.customName.label} />
              <div className="dashboard-catalog-product-form-grid"><Field id={`custom-spec-${specification.id}-name`} copy={labels.specifications.customName}><input id={`custom-spec-${specification.id}-name`} value={specification.labels[activeLocale]} onChange={(event) => setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, labels: { ...item.labels, [activeLocale]: event.target.value } } : item))} aria-describedby={`custom-spec-${specification.id}-name-help`} /></Field><Field id={`custom-spec-${specification.id}-type`} copy={labels.specifications.customType}><DashboardSelect id={`custom-spec-${specification.id}-type`} value={specification.valueType} onChange={(event) => { const valueType = event.target.value as CatalogSpecificationValueType; setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, valueType, value: null, options: valueType === "selection" ? item.options : [] } : item)); }} aria-describedby={`custom-spec-${specification.id}-type-help`}>{Object.entries(labels.specifications.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</DashboardSelect></Field><Field id={`custom-spec-${specification.id}-unit`} copy={labels.specifications.customUnit}><input id={`custom-spec-${specification.id}-unit`} value={specification.unit ?? ""} onChange={(event) => setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, unit: event.target.value } : item))} maxLength={40} aria-describedby={`custom-spec-${specification.id}-unit-help`} /></Field></div>
              {specification.valueType === "selection" ? <div className="dashboard-catalog-custom-options">{specification.options.map((option) => <div key={option.id}><Field id={`custom-option-${option.id}`} copy={labels.specifications.customOption}><input id={`custom-option-${option.id}`} value={option.labels[activeLocale]} onChange={(event) => setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, options: item.options.map((candidate) => candidate.id === option.id ? { ...candidate, labels: { ...candidate.labels, [activeLocale]: event.target.value } } : candidate) } : item))} aria-describedby={`custom-option-${option.id}-help`} /></Field><DashboardButton type="button" onClick={() => { setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, options: item.options.filter(({ id }) => id !== option.id), value: item.value?.type === "selection" && item.value.optionId === option.id ? null : item.value } : item)); markDirty("specifications"); }}>{labels.specifications.removeOption}</DashboardButton></div>)}<DashboardButton type="button" onClick={() => { setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, options: [...item.options, { id: crypto.randomUUID(), labels: emptyLocalizedText() }] } : item)); markDirty("specifications"); }}>{labels.specifications.addOption}</DashboardButton></div> : null}
              <Field id={`custom-spec-${specification.id}-value`} copy={labels.specifications.customValue}>{specification.valueType === "text" || specification.valueType === "number" ? <input id={`custom-spec-${specification.id}-value`} inputMode={specification.valueType === "number" ? "decimal" : undefined} value={customScalarValue(specification.value)} onChange={(event) => setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, value: event.target.value ? { type: specification.valueType as "text" | "number", value: event.target.value } : null } : item))} aria-describedby={`custom-spec-${specification.id}-value-help`} /> : specification.valueType === "boolean" ? <DashboardSelect id={`custom-spec-${specification.id}-value`} value={specification.value?.type === "boolean" ? String(specification.value.value) : ""} onChange={(event) => setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, value: event.target.value === "" ? null : { type: "boolean", value: event.target.value === "true" } } : item))} aria-describedby={`custom-spec-${specification.id}-value-help`}><option value="">{labels.specifications.choose}</option><option value="true">{labels.specifications.yes}</option><option value="false">{labels.specifications.no}</option></DashboardSelect> : <DashboardSelect id={`custom-spec-${specification.id}-value`} value={specification.value?.type === "selection" ? specification.value.optionId : ""} onChange={(event) => setCustomSpecifications((current) => current.map((item) => item.id === specification.id ? { ...item, value: event.target.value ? { type: "selection", optionId: event.target.value } : null } : item))} aria-describedby={`custom-spec-${specification.id}-value-help`}><option value="">{labels.specifications.choose}</option>{specification.options.map((option) => <option key={option.id} value={option.id}>{option.labels[activeLocale] || option.labels.bg || labels.specifications.customOption.label}</option>)}</DashboardSelect>}</Field>
            </section>)}
            <DashboardButton type="button" onClick={() => { setCustomSpecifications((current) => [...current, { id: crypto.randomUUID(), valueType: "text", unit: null, displayOrder: current.length, labels: emptyLocalizedText(), options: [], value: null }]); markDirty("specifications"); }}>{labels.specifications.addCustom}</DashboardButton>
          </fieldset>
        </details>

        <details className="dashboard-catalog-section" open><summary>{labels.sections.content}</summary>
          <LocalizedEditorSwitch idPrefix="product-content" variant="tabs" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={contentComplete} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.sections.content} />
          {catalogLocales.map((contentLocale) => {
            const values = translations[contentLocale];
            const prefix = `content.${contentLocale}`;
            const requiredSlug = contentLocale === "bg" || contentLocale === "en";
            const localizedSlug = productSlugs[contentLocale];
            const slugId = `catalog-product-${contentLocale}-slug`;
            const slugCopy = slugCopyByLocale[contentLocale];
            const localizedSlugError = slugErrors[contentLocale];
            const suggestedSlug = safeSlug(
              values.title ||
                (contentLocale === "en" ? translations.bg.title : ""),
            );
            const canOfferSlugUpdate =
              !detail?.publishedAt &&
              slugAutoManaged[contentLocale] &&
              Boolean(suggestedSlug) &&
              suggestedSlug !== localizedSlug &&
              (!creating || !requiredSlug);
            const previewPath = productPublicPath(
              categories,
              primaryCategoryId,
              contentLocale,
              bgSlug,
              enSlug,
              trSlug || null,
              ukSlug || null,
            );

            return (
              <div key={contentLocale} id={`product-content-panel-${contentLocale}`} role="tabpanel" aria-labelledby={`product-content-language-${contentLocale}`} hidden={activeLocale !== contentLocale} className="dashboard-catalog-language-panel">
                <fieldset disabled={editorDisabled} className="dashboard-catalog-product-fieldset">
                  <Field id={slugId} copy={slugCopy} error={localizedSlugError}>
                    <input
                      id={slugId}
                      name={`${contentLocale}Slug`}
                      value={localizedSlug}
                      readOnly={Boolean(detail?.publishedAt)}
                      onChange={(event) =>
                        updateProductSlug(contentLocale, event.target.value, true)
                      }
                      required={requiredSlug}
                      maxLength={120}
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      {...fieldAria(slugId, localizedSlugError)}
                    />
                    <code className="dashboard-catalog-url-preview">{origin}{previewPath}</code>
                    {canOfferSlugUpdate ? <DashboardButton type="button" className="dashboard-catalog-slug-update" onClick={() => updateProductSlug(contentLocale, suggestedSlug, false)}>{labels.content.updateSlug}</DashboardButton> : null}
                  </Field>
                  <Field id={`product-content-${contentLocale}-short`} copy={labels.fields.shortDescription}><textarea id={`product-content-${contentLocale}-short`} name={`${prefix}.shortDescription`} value={values.shortDescription} onChange={(event) => updateTranslation(contentLocale, "shortDescription", event.target.value)} rows={3} maxLength={2000} aria-describedby={`product-content-${contentLocale}-short-help`} /></Field>
                  <Field id={`product-content-${contentLocale}-full`} copy={labels.fields.fullDescription}><textarea id={`product-content-${contentLocale}-full`} name={`${prefix}.fullDescription`} value={values.fullDescription} onChange={(event) => updateTranslation(contentLocale, "fullDescription", event.target.value)} rows={8} maxLength={50000} aria-describedby={`product-content-${contentLocale}-full-help`} /></Field>
                  <div className="dashboard-catalog-seo-fields"><h3>{labels.content.seoGroup}</h3><Field id={`product-content-${contentLocale}-meta`} copy={labels.fields.metaDescription}><textarea id={`product-content-${contentLocale}-meta`} name={`${prefix}.metaDescription`} value={values.metaDescription} onChange={(event) => updateTranslation(contentLocale, "metaDescription", event.target.value)} rows={3} maxLength={500} aria-describedby={`product-content-${contentLocale}-meta-help`} /></Field><div className="dashboard-catalog-search-preview"><span>{labels.content.previewTitle}</span><strong>{values.title || labels.content.emptyProductTitle}</strong><small>{origin}{previewPath}</small><p>{values.metaDescription || values.shortDescription || labels.content.emptyMetaDescription}</p><em>{labels.content.previewNote}</em></div></div>
                </fieldset>
              </div>
            );
          })}
        </details>

        <details className="dashboard-catalog-section"><summary>{labels.sections.media}</summary>
          <LocalizedEditorSwitch idPrefix="product-media" variant="selector" activeLocale={activeLocale} onChange={setActiveLocale} languageNames={languages} statusByLocale={Object.fromEntries(catalogLocales.map((contentLocale) => [contentLocale, media.length > 0 && media.every((item) => item.translations[contentLocale].trim())])) as Record<CatalogLocale, boolean>} completeLabel={labels.editor.complete} incompleteLabel={labels.editor.incomplete} ariaLabel={labels.media.languageLabel} />
          <fieldset disabled={editorDisabled} className="dashboard-catalog-product-fieldset">{media.length === 0 ? <p>{labels.media.empty}</p> : <div className="dashboard-catalog-media-list">{media.map((item, index) => <section key={item.clientId} className="dashboard-catalog-media-item" aria-label={`${labels.sections.media} ${index + 1}`}><Field id={`product-media-reference-${item.clientId}`} copy={labels.fields.mediaReference}><input id={`product-media-reference-${item.clientId}`} value={item.reference} onChange={(event) => { setMedia((current) => current.map((candidate) => candidate.clientId === item.clientId ? { ...candidate, reference: event.target.value } : candidate)); markDirty("media"); }} /></Field><Field id={`product-media-alt-${item.clientId}`} copy={labels.fields.altText}><input id={`product-media-alt-${item.clientId}`} value={item.translations[activeLocale]} onChange={(event) => { setMedia((current) => current.map((candidate) => candidate.clientId === item.clientId ? { ...candidate, translations: { ...candidate.translations, [activeLocale]: event.target.value } } : candidate)); markDirty("media"); }} /></Field><div className="dashboard-catalog-media-flags"><label><input type="radio" name="primaryMedia" checked={item.isPrimary} onChange={() => { setMedia((current) => current.map((candidate) => ({ ...candidate, isPrimary: candidate.clientId === item.clientId }))); markDirty("media"); }} /> {labels.media.primary}</label><label><input type="checkbox" checked={item.isSocialImage} onChange={(event) => { setMedia((current) => current.map((candidate) => ({ ...candidate, isSocialImage: candidate.clientId === item.clientId ? event.target.checked : false }))); markDirty("media"); }} /> {labels.media.social}</label></div><div className="dashboard-catalog-item-controls"><DashboardButton type="button" disabled={index === 0} onClick={() => { setMedia((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); markDirty("media"); }}>{labels.media.moveUp}</DashboardButton><DashboardButton type="button" disabled={index === media.length - 1} onClick={() => { setMedia((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; }); markDirty("media"); }}>{labels.media.moveDown}</DashboardButton><DashboardButton type="button" onClick={() => { setMedia((current) => current.filter((candidate) => candidate.clientId !== item.clientId)); markDirty("media"); }}>{labels.media.remove}</DashboardButton></div></section>)}</div>}<DashboardButton type="button" onClick={() => { setMedia((current) => [...current, { clientId: crypto.randomUUID(), reference: "", isPrimary: current.length === 0, isSocialImage: false, translations: emptyLocalizedText() }]); markDirty("media"); }}>{labels.media.add}</DashboardButton></fieldset>
        </details>

        <div className="dashboard-catalog-product-save">
          {canManage ? <ResultMessage result={saveResult} labels={labels} reload={reloadFromServer} /> : null}
          {saveResult.publicationIssues?.length && detail ? (
            <div
              ref={saveIssuesRef}
              className="dashboard-catalog-save-issues"
              role="alert"
              tabIndex={-1}
            >
              <ul className="dashboard-catalog-dialog-issues">
                {saveResult.publicationIssues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>
                    {issueText(issue, detail, props)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="dashboard-catalog-product-save-actions">
            <DashboardButton
              ref={previewTriggerRef}
              type="button"
              className="dashboard-catalog-product-preview-trigger"
              onClick={() => setIsPreviewing(true)}
            >
              {labels.preview.open}
            </DashboardButton>
            {canManage ? <DashboardButton type="submit" disabled={savePending}>{savePending ? creating ? labels.actions.creating : labels.actions.saving : creating ? labels.actions.create : labels.actions.save}</DashboardButton> : null}
          </div>
        </div>
      </form>

      {detail ? <dialog ref={lifecycleDialog} className="dashboard-catalog-dialog" aria-labelledby="product-lifecycle-title" onClose={() => lifecycleInvoker.current?.focus()}>{lifecycleIntent ? <form onSubmit={(event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); startLifecycle(async () => { const result = await manageCatalogProductAction(formData); setLifecycleResult(result); if (result.status === "success") lifecycleDialog.current?.close(); }); }}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="productId" value={detail.id} /><input type="hidden" name="expectedUpdatedAt" value={detail.updatedAt} /><input type="hidden" name="intent" value={lifecycleIntent} /><h2 id="product-lifecycle-title">{labels.lifecycle[lifecycleIntent].title}</h2><p>{labels.lifecycle[lifecycleIntent].description}</p><ResultMessage result={lifecycleResult} labels={labels} reload={reloadFromServer} />{lifecycleResult.publicationIssues?.length ? <ul className="dashboard-catalog-dialog-issues">{lifecycleResult.publicationIssues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issueText(issue, detail, props)}</li>)}</ul> : null}<div className="dashboard-catalog-dialog-actions"><DashboardButton type="button" onClick={() => lifecycleDialog.current?.close()}>{labels.actions.cancel}</DashboardButton><DashboardButton type="submit" disabled={lifecyclePending}>{lifecyclePending ? labels.actions.working : labels.lifecycle[lifecycleIntent].confirm}</DashboardButton></div></form> : null}</dialog> : null}
      </div>
    </article>
  );
}

export function ProductWorkspace(props: Props) {
  if (props.requestedProduct === "new" && props.canManage) return <ProductEditor key={`new:${props.categoryId}`} {...props} detail={null} />;
  if (props.selectedProduct) return <ProductEditor key={props.selectedProduct.id} {...props} detail={props.selectedProduct} />;
  return <ProductList {...props} />;
}
