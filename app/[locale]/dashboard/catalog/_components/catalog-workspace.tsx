"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  CatalogCategoryPublicationIssue,
  ManagedCatalogCategoryDetail,
  ManagedCatalogCategoryTreeItem,
} from "@/lib/catalog/management";
import {
  catalogLocales,
  isCatalogLocale,
  type CatalogLocale,
  type CatalogSpecificationValueType,
} from "@/lib/catalog/model";
import {
  createCatalogCategoryAction,
  manageCatalogCategoryAction,
  saveCatalogCategoryGeneralAction,
  saveCatalogCategorySpecificationsAction,
  saveCatalogCategoryTranslationsAction,
  type CatalogActionCode,
  type CatalogActionResult,
} from "../actions";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";

type EditorSection = "general" | "content" | "specifications";
type LifecycleIntent = "publish" | "unpublish" | "archive" | "restore";

type FieldCopy = { label: string; help: string; example?: string };

export type CatalogLabels = {
  title: string;
  description: string;
  readOnly: string;
  languages: Record<CatalogLocale, string>;
  status: Record<"draft" | "published" | "archived", string>;
  tree: {
    title: string;
    empty: string;
    createRoot: string;
    addChild: string;
    openCategory: string;
    moveUp: string;
    moveDown: string;
    back: string;
  };
  editor: {
    emptyTitle: string;
    emptyDescription: string;
    sourceLanguage: string;
    complete: string;
    incomplete: string;
  };
  sections: Record<EditorSection, string>;
  fields: {
    bgSlug: FieldCopy;
    enSlug: FieldCopy;
    parent: FieldCopy;
    name: FieldCopy;
    introduction: FieldCopy;
    metaDescription: FieldCopy;
    productTitleGuidance: FieldCopy;
  };
  seoPreview: {
    title: string;
    note: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  actions: {
    save: string;
    saving: string;
    move: string;
    publish: string;
    unpublish: string;
    archive: string;
    restore: string;
    working: string;
    reload: string;
  };
  create: {
    title: string;
    description: string;
    parentLabel: string;
    root: string;
    name: string;
    cancel: string;
    continue: string;
    editorTitle: string;
    editorDescription: string;
    discard: string;
    submit: string;
    submitting: string;
  };
  move: {
    title: string;
    description: string;
    parent: string;
    root: string;
    cancel: string;
    submit: string;
  };
  lifecycle: Record<
    LifecycleIntent,
    { title: string; description: string; confirm: string }
  > & {
    cancel: string;
  };
  readiness: {
    title: string;
    ready: string;
    blocked: string;
    messages: Record<CatalogCategoryPublicationIssue["code"], string>;
  };
  specifications: {
    empty: string;
    emptyDescription: string;
    add: string;
    remove: string;
    moveUp: string;
    moveDown: string;
    item: string;
    expand: string;
    collapse: string;
    languageLabel: string;
    languageHelp: string;
    preview: {
      title: string;
      illustrative: string;
      description: string;
      emptyUnit: string;
      labels: Record<CatalogSpecificationValueType, string>;
      values: Record<CatalogSpecificationValueType, string>;
    };
    name: FieldCopy;
    type: FieldCopy;
    unit: FieldCopy;
    options: string;
    optionsHelp: string;
    addOption: string;
    removeOption: string;
    optionName: FieldCopy;
    confirmRemove: string;
    confirmClearOptions: string;
    types: Record<CatalogSpecificationValueType, string>;
  };
  unsaved: {
    title: string;
    message: string;
  };
  validation: {
    required: string;
    slug: string;
    conflict: string;
    selectionOption: string;
  };
  results: Record<CatalogActionCode, string>;
};

type CatalogWorkspaceProps = {
  locale: string;
  catalogPath: string;
  categories: ManagedCatalogCategoryTreeItem[];
  selected: ManagedCatalogCategoryDetail | null;
  canManage: boolean;
  labels: CatalogLabels;
  openSelectedOnMobile: boolean;
};

type SpecificationDraft = {
  clientId: string;
  persistedId: string | null;
  valueType: CatalogSpecificationValueType;
  unit: string;
  labels: Record<CatalogLocale, string>;
  options: Array<{
    clientId: string;
    persistedId: string | null;
    labels: Record<CatalogLocale, string>;
  }>;
};

type CategoryContentDraft = {
  name: string;
  introduction: string;
  metaDescription: string;
  productTitleGuidance: string;
};

type CategoryContentDrafts = Record<CatalogLocale, CategoryContentDraft>;

type NewCategorySeed = {
  parentId: string | null;
  parentName: string;
  initialLocale: CatalogLocale;
  initialName: string;
};

const initialCatalogActionResult: CatalogActionResult = { status: "idle" };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugErrorLabel(code: string | undefined, labels: CatalogLabels) {
  if (code === "CONFLICT") return labels.validation.conflict;
  if (code === "INVALID") return labels.validation.slug;
  if (code) return labels.validation.required;
  return undefined;
}

const emptyLocaleLabels = (): Record<CatalogLocale, string> => ({
  bg: "",
  en: "",
  tr: "",
  uk: "",
});

const emptyCategoryContent = (): CategoryContentDraft => ({
  name: "",
  introduction: "",
  metaDescription: "",
  productTitleGuidance: "",
});

function categoryContentFromDetail(
  detail: ManagedCatalogCategoryDetail,
): CategoryContentDrafts {
  return Object.fromEntries(
    catalogLocales.map((locale) => {
      const translation = detail.translations.find(
        (candidate) => candidate.locale === locale,
      );
      return [
        locale,
        {
          name: translation?.name ?? "",
          introduction: translation?.introduction ?? "",
          metaDescription: translation?.metaDescription ?? "",
          productTitleGuidance: translation?.productTitleGuidance ?? "",
        },
      ];
    }),
  ) as CategoryContentDrafts;
}

function emptyCategoryContentDrafts(): CategoryContentDrafts {
  return Object.fromEntries(
    catalogLocales.map((locale) => [locale, emptyCategoryContent()]),
  ) as CategoryContentDrafts;
}

function contentCompletion(
  drafts: CategoryContentDrafts,
): Record<CatalogLocale, boolean> {
  return Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      Boolean(drafts[locale].name.trim() && drafts[locale].introduction.trim()),
    ]),
  ) as Record<CatalogLocale, boolean>;
}

function effectiveCategorySlug(
  locale: CatalogLocale,
  bgSlug: string,
  enSlug: string,
) {
  return locale === "bg" ? bgSlug : enSlug;
}

function arrowIcon(direction: "up" | "down" | "back") {
  const path =
    direction === "up"
      ? "M5 12l5-5 5 5"
      : direction === "down"
        ? "M5 8l5 5 5-5"
        : "M16 10H5m4-4-4 4 4 4";

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ResultMessage({
  result,
  labels,
  onReload,
}: {
  result: CatalogActionResult;
  labels: CatalogLabels;
  onReload?: () => void;
}) {
  if (!result.code || result.status === "idle") return null;

  return (
    <div
      className="dashboard-catalog-result"
      data-tone={result.status}
      role={result.status === "error" ? "alert" : "status"}
      aria-live={result.status === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <p>{labels.results[result.code]}</p>
      {result.code === "STALE" && onReload ? (
        <button type="button" onClick={onReload}>
          {labels.actions.reload}
        </button>
      ) : null}
    </div>
  );
}

function CharacterCount({
  value,
  maximum,
}: {
  value: string;
  maximum: number;
}) {
  return (
    <span className="dashboard-catalog-character-count" aria-live="polite">
      {Array.from(value).length} / {maximum}
    </span>
  );
}

function Field({
  id,
  copy,
  count,
  error,
  children,
}: {
  id: string;
  copy: FieldCopy;
  count?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className="dashboard-catalog-field">
      <div className="dashboard-catalog-field-heading">
        <label htmlFor={id}>{copy.label}</label>
        {count}
      </div>
      <p id={helpId} className="dashboard-catalog-help">
        {copy.help}
        {copy.example ? (
          <span className="dashboard-catalog-help-example">{copy.example}</span>
        ) : null}
      </p>
      {children}
      {error ? (
        <p id={errorId} className="dashboard-catalog-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

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

function PublicationReadiness({
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

function localizedTranslationLabel(
  translations: Array<{ locale: CatalogLocale; label: string }>,
  activeLocale: CatalogLocale,
) {
  return (
    translations.find(({ locale }) => locale === activeLocale)?.label.trim() ||
    translations.find(({ locale }) => locale === "bg")?.label.trim() ||
    translations.map(({ label }) => label.trim()).find(Boolean) ||
    ""
  );
}

function initialSpecifications(
  detail: ManagedCatalogCategoryDetail,
): SpecificationDraft[] {
  return detail.specifications.map((specification) => ({
    clientId: specification.id,
    persistedId: specification.id,
    valueType: specification.valueType,
    unit: specification.unit ?? "",
    labels: Object.fromEntries(
      catalogLocales.map((locale) => [
        locale,
        specification.translations.find(
          (translation) => translation.locale === locale,
        )?.label ?? "",
      ]),
    ) as Record<CatalogLocale, string>,
    options: specification.options.map((option) => ({
      clientId: option.id,
      persistedId: option.id,
      labels: Object.fromEntries(
        catalogLocales.map((locale) => [
          locale,
          option.translations.find(
            (translation) => translation.locale === locale,
          )?.label ?? "",
        ]),
      ) as Record<CatalogLocale, string>,
    })),
  }));
}

function serializeSpecifications(specifications: SpecificationDraft[]) {
  return JSON.stringify(
    specifications.map((specification, specificationIndex) => ({
      id: specification.persistedId,
      valueType: specification.valueType,
      unit:
        specification.valueType === "number"
          ? specification.unit.trim() || null
          : null,
      displayOrder: specificationIndex,
      translations: catalogLocales.flatMap((locale) =>
        specification.labels[locale].trim()
          ? [{ locale, label: specification.labels[locale] }]
          : [],
      ),
      options:
        specification.valueType === "selection"
          ? specification.options.map((option, optionIndex) => ({
              id: option.persistedId,
              displayOrder: optionIndex,
              translations: catalogLocales.flatMap((locale) =>
                option.labels[locale].trim()
                  ? [{ locale, label: option.labels[locale] }]
                  : [],
              ),
            }))
          : [],
    })),
  );
}

function localizedSpecificationValue(
  values: Record<CatalogLocale, string>,
  activeLocale: CatalogLocale,
) {
  return (
    values[activeLocale].trim() ||
    values.bg.trim() ||
    catalogLocales.map((locale) => values[locale].trim()).find(Boolean) ||
    ""
  );
}

function ProductCharacteristicsPreview({
  specifications,
  labels,
  activeLocale,
}: {
  specifications: SpecificationDraft[];
  labels: CatalogLabels;
  activeLocale: CatalogLocale;
}) {
  const rows =
    specifications.length > 0
      ? specifications.map((specification) => {
          const label =
            localizedSpecificationValue(specification.labels, activeLocale) ||
            labels.specifications.preview.labels[specification.valueType];
          const selectedOption = specification.options.find((option) =>
            localizedSpecificationValue(option.labels, activeLocale),
          );
          const optionLabel = selectedOption
            ? localizedSpecificationValue(selectedOption.labels, activeLocale)
            : "";
          const sampleValue = labels.specifications.preview.values[
            specification.valueType
          ];
          const value =
            specification.valueType === "number" && specification.unit.trim()
              ? `${sampleValue} ${specification.unit.trim()}`
              : specification.valueType === "selection" && optionLabel
                ? optionLabel
                : sampleValue;

          return {
            id: specification.clientId,
            label,
            value,
          };
        })
      : (Object.keys(labels.specifications.preview.labels) as CatalogSpecificationValueType[])
          .map((valueType) => ({
            id: `product-characteristics-example-${valueType}`,
            label: labels.specifications.preview.labels[valueType],
            value:
              valueType === "number"
                ? `${labels.specifications.preview.values.number} ${labels.specifications.preview.emptyUnit}`
                : labels.specifications.preview.values[valueType],
          }));

  return (
    <aside
      className="dashboard-catalog-product-preview"
      aria-labelledby="catalog-product-preview-title"
    >
      <div className="dashboard-catalog-product-preview-heading">
        <div>
          <h3 id="catalog-product-preview-title">
            {labels.specifications.preview.title}
          </h3>
          <p>{labels.specifications.preview.description}</p>
        </div>
        <small>{labels.specifications.preview.illustrative}</small>
      </div>
      <dl className="dashboard-catalog-product-preview-list">
        {rows.map((row) => (
          <div key={row.id}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function LocaleContentPanel({
  locale,
  values,
  labels,
  active,
  disabled,
  errors,
  onChange,
  bgSlug,
  enSlug,
  idPrefix,
}: {
  locale: CatalogLocale;
  values: CategoryContentDraft;
  labels: CatalogLabels;
  active: boolean;
  disabled: boolean;
  errors: Record<string, string>;
  onChange: (values: CategoryContentDraft) => void;
  bgSlug: string;
  enSlug: string;
  idPrefix: string;
}) {
  const prefix = `content.${locale}`;
  const update = (key: keyof typeof values, value: string) => {
    onChange({ ...values, [key]: value });
  };
  const fieldId = (field: keyof CategoryContentDraft) =>
    `${idPrefix}-${locale}-${field}`;
  const describedBy = (field: keyof CategoryContentDraft) => {
    const id = fieldId(field);
    return `${id}-help${errors[`${prefix}.${field}`] ? ` ${id}-error` : ""}`;
  };
  const slug = effectiveCategorySlug(locale, bgSlug, enSlug);
  const path = locale === "bg" ? `/${slug}` : `/${locale}/${slug}`;

  return (
    <div
      id={`${idPrefix}-panel-${locale}`}
      role="tabpanel"
      aria-labelledby={`${idPrefix}-language-${locale}`}
      hidden={!active}
      className="dashboard-catalog-language-panel"
    >
      <fieldset disabled={disabled}>
        <Field
          id={fieldId("name")}
          copy={labels.fields.name}
          count={<CharacterCount value={values.name} maximum={200} />}
          error={
            errors[`${prefix}.name`] ? labels.validation.required : undefined
          }
        >
          <input
            id={fieldId("name")}
            name={`${prefix}.name`}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            aria-required="true"
            maxLength={200}
            aria-describedby={describedBy("name")}
            aria-invalid={errors[`${prefix}.name`] ? true : undefined}
          />
        </Field>
        <Field
          id={fieldId("introduction")}
          copy={labels.fields.introduction}
          count={<CharacterCount value={values.introduction} maximum={2000} />}
          error={
            errors[`${prefix}.introduction`]
              ? labels.validation.required
              : undefined
          }
        >
          <textarea
            id={fieldId("introduction")}
            name={`${prefix}.introduction`}
            value={values.introduction}
            onChange={(event) => update("introduction", event.target.value)}
            aria-required="true"
            maxLength={2000}
            rows={4}
            aria-describedby={describedBy("introduction")}
            aria-invalid={errors[`${prefix}.introduction`] ? true : undefined}
          />
        </Field>
        <div className="dashboard-catalog-seo-fields">
          <Field
            id={fieldId("metaDescription")}
            copy={labels.fields.metaDescription}
            count={
              <CharacterCount value={values.metaDescription} maximum={500} />
            }
          >
            <textarea
              id={fieldId("metaDescription")}
              name={`${prefix}.metaDescription`}
              value={values.metaDescription}
              onChange={(event) =>
                update("metaDescription", event.target.value)
              }
              maxLength={500}
              rows={3}
              aria-describedby={describedBy("metaDescription")}
            />
          </Field>
          <div className="dashboard-catalog-search-preview">
            <span>{labels.seoPreview.title}</span>
            <strong>
              {values.name || labels.seoPreview.emptyTitle}
            </strong>
            <small>{path}</small>
            <p>
              {values.metaDescription ||
                values.introduction ||
                labels.seoPreview.emptyDescription}
            </p>
            <em>{labels.seoPreview.note}</em>
          </div>
        </div>
        <Field
          id={fieldId("productTitleGuidance")}
          copy={labels.fields.productTitleGuidance}
          count={
            <CharacterCount
              value={values.productTitleGuidance}
              maximum={1000}
            />
          }
        >
          <textarea
            id={fieldId("productTitleGuidance")}
            name={`${prefix}.productTitleGuidance`}
            value={values.productTitleGuidance}
            onChange={(event) =>
              update("productTitleGuidance", event.target.value)
            }
            maxLength={1000}
            rows={4}
            aria-describedby={describedBy("productTitleGuidance")}
          />
        </Field>
      </fieldset>
    </div>
  );
}

function SpecificationEditor({
  detail,
  labels,
  disabled,
  onDirty,
  result,
  action,
  pending,
  onReload,
  locale,
}: {
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
  disabled: boolean;
  onDirty: () => void;
  result: CatalogActionResult;
  action: (payload: FormData) => void;
  pending: boolean;
  onReload: () => void;
  locale: string;
}) {
  const [specifications, setSpecifications] = useState(() =>
    initialSpecifications(detail),
  );
  const [specificationLocale, setSpecificationLocale] =
    useState<CatalogLocale>("bg");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(detail.specifications.slice(0, 1).map(({ id }) => id)),
  );
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [clientValidationId, setClientValidationId] = useState<string | null>(
    null,
  );
  const [dismissedServerErrors, setDismissedServerErrors] = useState(false);
  const acceptedSaveRef = useRef<string | null>(null);

  useEffect(() => {
    setDismissedServerErrors(false);
  }, [result.fieldErrors]);

  useEffect(() => {
    if (
      result.status !== "success" ||
      !result.updatedAt ||
      detail.updatedAt !== result.updatedAt ||
      acceptedSaveRef.current === result.updatedAt
    ) {
      return;
    }

    const refreshed = initialSpecifications(detail);
    setSpecifications(refreshed);
    setExpanded(new Set(refreshed.slice(0, 1).map(({ clientId }) => clientId)));
    setClientValidationId(null);
    acceptedSaveRef.current = result.updatedAt;
  }, [detail, result.status, result.updatedAt]);

  useEffect(() => {
    if (!pendingFocusId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById(pendingFocusId)?.focus();
      setPendingFocusId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocusId, specifications, specificationLocale]);

  useEffect(() => {
    if (
      dismissedServerErrors ||
      result.status !== "error" ||
      !result.fieldErrors
    ) {
      return;
    }
    const firstField = Object.keys(result.fieldErrors)[0];
    const parts = firstField?.split(".") ?? [];
    const specificationIndex = Number(parts[1]);
    const specification = specifications[specificationIndex];
    if (!specification) return;

    let targetId: string | null = null;
    let targetLocale: CatalogLocale = specificationLocale;
    if (parts[2] === "translations" && catalogLocales.includes(parts[3] as CatalogLocale)) {
      targetLocale = parts[3] as CatalogLocale;
      targetId = `specification-name-${specification.clientId}-${targetLocale}`;
    } else if (parts[2] === "options" && parts.length === 3) {
      targetId = `specification-add-option-${specification.clientId}`;
    } else if (
      parts[2] === "options" &&
      parts[4] === "translations" &&
      catalogLocales.includes(parts[5] as CatalogLocale)
    ) {
      const option = specification.options[Number(parts[3])];
      if (!option) return;
      targetLocale = parts[5] as CatalogLocale;
      targetId = `specification-option-${option.clientId}-${targetLocale}`;
    }

    if (!targetId) return;
    setSpecificationLocale(targetLocale);
    setExpanded((current) => new Set(current).add(specification.clientId));
    setClientValidationId(targetId);
    setPendingFocusId(targetId);
  }, [
    dismissedServerErrors,
    result.fieldErrors,
    result.status,
    specifications,
    specificationLocale,
  ]);

  const updateSpecification = (
    index: number,
    update: (specification: SpecificationDraft) => SpecificationDraft,
  ) => {
    setDismissedServerErrors(true);
    setSpecifications((current) =>
      current.map((specification, candidateIndex) =>
        candidateIndex === index ? update(specification) : specification,
      ),
    );
    onDirty();
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= specifications.length) return;
    setSpecifications((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    onDirty();
  };
  const toggleExpanded = (clientId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  return (
    <form
      action={action}
      aria-busy={pending}
      onSubmit={(event) => {
        let invalid:
          | {
              specification: SpecificationDraft;
              locale: CatalogLocale;
              targetId: string;
            }
          | undefined;

        for (const specification of specifications) {
          for (const contentLocale of catalogLocales) {
            if (!specification.labels[contentLocale].trim()) {
              invalid = {
                specification,
                locale: contentLocale,
                targetId: `specification-name-${specification.clientId}-${contentLocale}`,
              };
              break;
            }
          }
          if (invalid) break;

          if (
            specification.valueType === "selection" &&
            specification.options.length === 0
          ) {
            invalid = {
              specification,
              locale: specificationLocale,
              targetId: `specification-add-option-${specification.clientId}`,
            };
            break;
          }

          for (const option of specification.options) {
            for (const contentLocale of catalogLocales) {
              if (!option.labels[contentLocale].trim()) {
                invalid = {
                  specification,
                  locale: contentLocale,
                  targetId: `specification-option-${option.clientId}-${contentLocale}`,
                };
                break;
              }
            }
            if (invalid) break;
          }
          if (invalid) break;
        }

        if (!invalid) return;
        event.preventDefault();
        setSpecificationLocale(invalid.locale);
        setExpanded((current) =>
          new Set(current).add(invalid.specification.clientId),
        );
        setClientValidationId(invalid.targetId);
        setPendingFocusId(invalid.targetId);
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="categoryId" value={detail.id} />
      <input type="hidden" name="expectedUpdatedAt" value={detail.updatedAt} />
      <input
        type="hidden"
        name="specifications"
        value={serializeSpecifications(specifications)}
      />
      <div className="dashboard-catalog-specification-language">
        <div>
          <strong>{labels.specifications.languageLabel}</strong>
          <p>{labels.specifications.languageHelp}</p>
        </div>
        <LocalizedEditorSwitch
          idPrefix="catalog-specifications"
          variant="selector"
          activeLocale={specificationLocale}
          onChange={setSpecificationLocale}
          languageNames={labels.languages}
          statusByLocale={Object.fromEntries(
            catalogLocales.map((contentLocale) => [
              contentLocale,
              specifications.every(
                (specification) =>
                  Boolean(specification.labels[contentLocale].trim()) &&
                  (specification.valueType !== "selection" ||
                    (specification.options.length > 0 &&
                      specification.options.every((option) =>
                        Boolean(option.labels[contentLocale].trim()),
                      ))),
              ),
            ]),
          ) as Record<CatalogLocale, boolean>}
          completeLabel={labels.editor.complete}
          incompleteLabel={labels.editor.incomplete}
          ariaLabel={labels.specifications.languageLabel}
        />
      </div>
      <div className="dashboard-catalog-specification-workspace">
        <div className="dashboard-catalog-specification-editor-column">
          {specifications.length === 0 ? (
            <div className="dashboard-catalog-specifications-empty">
              <strong>{labels.specifications.empty}</strong>
              <p>{labels.specifications.emptyDescription}</p>
            </div>
          ) : (
            <div className="dashboard-catalog-specification-list">
              {specifications.map((specification, index) => {
                const isExpanded = expanded.has(specification.clientId);
                const displayName =
                  localizedSpecificationValue(
                    specification.labels,
                    specificationLocale,
                  ) || `${labels.specifications.item} ${index + 1}`;
                const panelId = `specification-panel-${specification.clientId}`;
                const nameId = `specification-name-${specification.clientId}-${specificationLocale}`;
                const nameError = Boolean(
                  clientValidationId === nameId ||
                    (!dismissedServerErrors && result.fieldErrors?.[
                      `specifications.${index}.translations.${specificationLocale}`
                    ]),
                );
                const optionsError = Boolean(
                  (!dismissedServerErrors &&
                    result.fieldErrors?.[`specifications.${index}.options`]) ||
                    clientValidationId ===
                      `specification-add-option-${specification.clientId}`,
                );

                return (
                  <section
                    key={specification.clientId}
                    className="dashboard-catalog-specification"
                  >
                    <div className="dashboard-catalog-specification-header">
                      <button
                        type="button"
                        className="dashboard-catalog-specification-toggle"
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                        aria-label={`${isExpanded ? labels.specifications.collapse : labels.specifications.expand}: ${displayName}`}
                        onClick={() => toggleExpanded(specification.clientId)}
                      >
                        <span className="dashboard-catalog-specification-chevron">
                          {arrowIcon(isExpanded ? "up" : "down")}
                        </span>
                        <span>
                          <strong>{displayName}</strong>
                          <small>
                            {labels.specifications.types[specification.valueType]}
                            {specification.valueType === "number" &&
                            specification.unit.trim()
                              ? ` · ${specification.unit.trim()}`
                              : ""}
                          </small>
                        </span>
                      </button>
                      {!disabled ? (
                        <div className="dashboard-catalog-item-controls">
                          <button
                            type="button"
                            disabled={index === 0}
                            aria-label={labels.specifications.moveUp}
                            onClick={() => move(index, -1)}
                          >
                            {arrowIcon("up")}
                          </button>
                          <button
                            type="button"
                            disabled={index === specifications.length - 1}
                            aria-label={labels.specifications.moveDown}
                            onClick={() => move(index, 1)}
                          >
                            {arrowIcon("down")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  labels.specifications.confirmRemove,
                                )
                              )
                                return;
                              setSpecifications((current) =>
                                current.filter(
                                  (_, candidateIndex) =>
                                    candidateIndex !== index,
                                ),
                              );
                              onDirty();
                            }}
                          >
                            {labels.specifications.remove}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {isExpanded ? (
                      <div
                        id={panelId}
                        className="dashboard-catalog-specification-body"
                      >
                        <fieldset disabled={disabled}>
                          <div className="dashboard-catalog-specification-grid">
                            <Field
                              id={`specification-type-${specification.clientId}`}
                              copy={labels.specifications.type}
                            >
                              <select
                                id={`specification-type-${specification.clientId}`}
                                value={specification.valueType}
                                onChange={(event) => {
                                  const value = event.target
                                    .value as CatalogSpecificationValueType;
                                  if (
                                    specification.valueType === "selection" &&
                                    value !== "selection" &&
                                    specification.options.length > 0 &&
                                    !window.confirm(
                                      labels.specifications.confirmClearOptions,
                                    )
                                  ) {
                                    return;
                                  }
                                  updateSpecification(index, (current) => ({
                                    ...current,
                                    valueType: value,
                                    unit: value === "number" ? current.unit : "",
                                    options:
                                      value === "selection"
                                        ? current.options
                                        : [],
                                  }));
                                }}
                                aria-describedby={`specification-type-${specification.clientId}-help`}
                              >
                                {Object.entries(
                                  labels.specifications.types,
                                ).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </Field>
                            <Field
                              id={nameId}
                              copy={labels.specifications.name}
                              count={
                                <CharacterCount
                                  value={
                                    specification.labels[specificationLocale]
                                  }
                                  maximum={200}
                                />
                              }
                              error={
                                nameError
                                  ? labels.validation.required
                                  : undefined
                              }
                            >
                              <input
                                id={nameId}
                                value={
                                  specification.labels[specificationLocale]
                                }
                                onChange={(event) => {
                                  if (clientValidationId === nameId) {
                                    setClientValidationId(null);
                                  }
                                  updateSpecification(index, (current) => ({
                                    ...current,
                                    labels: {
                                      ...current.labels,
                                      [specificationLocale]: event.target.value,
                                    },
                                  }));
                                }}
                                required
                                maxLength={200}
                                aria-describedby={`${nameId}-help${nameError ? ` ${nameId}-error` : ""}`}
                                aria-invalid={nameError ? true : undefined}
                              />
                            </Field>
                            {specification.valueType === "number" ? (
                              <Field
                                id={`specification-unit-${specification.clientId}`}
                                copy={labels.specifications.unit}
                              >
                                <input
                                  id={`specification-unit-${specification.clientId}`}
                                  value={specification.unit}
                                  onChange={(event) =>
                                    updateSpecification(index, (current) => ({
                                      ...current,
                                      unit: event.target.value,
                                    }))
                                  }
                                  maxLength={40}
                                  aria-describedby={`specification-unit-${specification.clientId}-help`}
                                />
                              </Field>
                            ) : null}
                          </div>
                          {specification.valueType === "selection" ? (
                            <section className="dashboard-catalog-options">
                              <div className="dashboard-catalog-options-heading">
                                <div>
                                  <h4>{labels.specifications.options}</h4>
                                  <p>{labels.specifications.optionsHelp}</p>
                                </div>
                                <button
                                  id={`specification-add-option-${specification.clientId}`}
                                  type="button"
                                  onClick={() => {
                                    setDismissedServerErrors(true);
                                    if (
                                      clientValidationId ===
                                      `specification-add-option-${specification.clientId}`
                                    ) {
                                      setClientValidationId(null);
                                    }
                                    const optionId = crypto.randomUUID();
                                    setSpecificationLocale("bg");
                                    updateSpecification(index, (current) => ({
                                      ...current,
                                      options: [
                                        ...current.options,
                                        {
                                          clientId: optionId,
                                          persistedId: null,
                                          labels: emptyLocaleLabels(),
                                        },
                                      ],
                                    }));
                                    setPendingFocusId(
                                      `specification-option-${optionId}-bg`,
                                    );
                                  }}
                                >
                                  {labels.specifications.addOption}
                                </button>
                              </div>
                              {optionsError ? (
                                <p
                                  className="dashboard-catalog-field-error"
                                  role="alert"
                                >
                                  {labels.validation.selectionOption}
                                </p>
                              ) : null}
                              {specification.options.map(
                                (option, optionIndex) => {
                                  const optionId = `specification-option-${option.clientId}-${specificationLocale}`;
                                  const optionError = Boolean(
                                    clientValidationId === optionId ||
                                      (!dismissedServerErrors && result.fieldErrors?.[
                                        `specifications.${index}.options.${optionIndex}.translations.${specificationLocale}`
                                      ]),
                                  );
                                  return (
                                    <div
                                      key={option.clientId}
                                      className="dashboard-catalog-option"
                                    >
                                      <Field
                                        id={optionId}
                                        copy={labels.specifications.optionName}
                                        count={
                                          <CharacterCount
                                            value={
                                              option.labels[
                                                specificationLocale
                                              ]
                                            }
                                            maximum={200}
                                          />
                                        }
                                        error={
                                          optionError
                                            ? labels.validation.required
                                            : undefined
                                        }
                                      >
                                        <input
                                          id={optionId}
                                          value={
                                            option.labels[specificationLocale]
                                          }
                                          onChange={(event) => {
                                            if (
                                              clientValidationId === optionId
                                            ) {
                                              setClientValidationId(null);
                                            }
                                            updateSpecification(
                                              index,
                                              (current) => ({
                                                ...current,
                                                options: current.options.map(
                                                  (
                                                    candidate,
                                                    candidateIndex,
                                                  ) =>
                                                    candidateIndex ===
                                                    optionIndex
                                                      ? {
                                                          ...candidate,
                                                          labels: {
                                                            ...candidate.labels,
                                                            [specificationLocale]:
                                                              event.target.value,
                                                          },
                                                        }
                                                      : candidate,
                                                ),
                                              }),
                                            );
                                          }}
                                          required
                                          maxLength={200}
                                          aria-describedby={`${optionId}-help${optionError ? ` ${optionId}-error` : ""}`}
                                          aria-invalid={optionError ? true : undefined}
                                        />
                                      </Field>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSpecification(
                                            index,
                                            (current) => ({
                                              ...current,
                                              options: current.options.filter(
                                                (_, candidateIndex) =>
                                                  candidateIndex !==
                                                  optionIndex,
                                              ),
                                            }),
                                          )
                                        }
                                      >
                                        {labels.specifications.removeOption}
                                      </button>
                                    </div>
                                  );
                                },
                              )}
                            </section>
                          ) : null}
                        </fieldset>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
          {!disabled ? (
            <div className="dashboard-catalog-form-actions">
              <button
                type="button"
                onClick={() => {
                  setDismissedServerErrors(true);
                  const clientId = crypto.randomUUID();
                  setSpecificationLocale("bg");
                  setExpanded((current) => new Set(current).add(clientId));
                  setSpecifications((current) => [
                    ...current,
                    {
                      clientId,
                      persistedId: null,
                      valueType: "text",
                      unit: "",
                      labels: emptyLocaleLabels(),
                      options: [],
                    },
                  ]);
                  setPendingFocusId(`specification-name-${clientId}-bg`);
                  onDirty();
                }}
              >
                {labels.specifications.add}
              </button>
              <button type="submit" disabled={pending}>
                {pending ? labels.actions.saving : labels.actions.save}
              </button>
            </div>
          ) : null}
          <ResultMessage result={result} labels={labels} onReload={onReload} />
        </div>
        <ProductCharacteristicsPreview
          specifications={specifications}
          labels={labels}
          activeLocale={specificationLocale}
        />
      </div>
    </form>
  );
}

function NewCategoryEditor({
  seed,
  labels,
  locale,
  onDirty,
  clearDirty,
  onDiscard,
  onCreated,
}: {
  seed: NewCategorySeed;
  labels: CatalogLabels;
  locale: string;
  onDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
  onDiscard: () => void;
  onCreated: (categoryId: string) => void;
}) {
  const [activeLocale, setActiveLocale] = useState(seed.initialLocale);
  const [content, setContent] = useState<CategoryContentDrafts>(() => {
    const initialDrafts = emptyCategoryContentDrafts();
    initialDrafts[seed.initialLocale].name = seed.initialName;
    return initialDrafts;
  });
  const [bgSlug, setBgSlug] = useState("");
  const [enSlug, setEnSlug] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(
    () => new Set(),
  );
  const [result, action, pending] = useActionState(
    createCatalogCategoryAction,
    initialCatalogActionResult,
  );
  const serverErrors = Object.fromEntries(
    Object.entries(result.fieldErrors ?? {}).filter(
      ([field]) => !dismissedErrors.has(field),
    ),
  );
  const errors = { ...serverErrors, ...clientErrors };

  useEffect(() => {
    if (result.status === "success" && result.targetId) {
      clearDirty("general");
      clearDirty("content");
      onCreated(result.targetId);
    }
  }, [clearDirty, onCreated, result.status, result.targetId]);

  useEffect(() => {
    if (result.status !== "error" || !result.fieldErrors) return;
    const firstField = Object.keys(result.fieldErrors)[0];
    if (firstField === "bgSlug" || firstField === "enSlug") {
      requestAnimationFrame(() =>
        document.getElementById(`catalog-create-${firstField}`)?.focus(),
      );
      return;
    }
    const [, fieldLocale, fieldName] = firstField.split(".");
    if (!catalogLocales.includes(fieldLocale as CatalogLocale)) return;
    setActiveLocale(fieldLocale as CatalogLocale);
    requestAnimationFrame(() =>
      document
        .getElementById(`catalog-create-content-${fieldLocale}-${fieldName}`)
        ?.focus(),
    );
  }, [result.fieldErrors, result.status]);

  const changeContent = (
    contentLocale: CatalogLocale,
    values: CategoryContentDraft,
  ) => {
    setContent((current) => ({ ...current, [contentLocale]: values }));
    setDismissedErrors((current) => {
      const next = new Set(current);
      next.add(`content.${contentLocale}.name`);
      next.add(`content.${contentLocale}.introduction`);
      return next;
    });
    setClientErrors((current) => {
      const next = { ...current };
      delete next[`content.${contentLocale}.name`];
      delete next[`content.${contentLocale}.introduction`];
      return next;
    });
    onDirty("content");
  };

  return (
    <article className="dashboard-catalog-editor">
      <header className="dashboard-catalog-editor-header">
        <div>
          <span className="dashboard-catalog-status" data-status="draft">
            {labels.status.draft}
          </span>
          <h2>{labels.create.editorTitle}</h2>
          <p>{labels.create.editorDescription}</p>
        </div>
        <button type="button" data-danger="true" onClick={onDiscard}>
          {labels.create.discard}
        </button>
      </header>

      <form
        action={action}
        aria-busy={pending}
        noValidate
        onSubmit={(event) => {
          const nextErrors: Record<string, string> = {};
          for (const contentLocale of catalogLocales) {
            if (!content[contentLocale].name.trim()) {
              nextErrors[`content.${contentLocale}.name`] = "REQUIRED";
            }
            if (!content[contentLocale].introduction.trim()) {
              nextErrors[`content.${contentLocale}.introduction`] = "REQUIRED";
            }
          }
          if (!slugPattern.test(bgSlug)) {
            nextErrors.bgSlug = bgSlug ? "INVALID" : "REQUIRED";
          }
          if (!slugPattern.test(enSlug)) {
            nextErrors.enSlug = enSlug ? "INVALID" : "REQUIRED";
          }
          setClientErrors(nextErrors);
          const firstField = Object.keys(nextErrors)[0];
          if (!firstField) return;
          event.preventDefault();
          if (firstField === "bgSlug" || firstField === "enSlug") {
            requestAnimationFrame(() =>
              document.getElementById(`catalog-create-${firstField}`)?.focus(),
            );
            return;
          }
          const [, fieldLocale, fieldName] = firstField.split(".");
          setActiveLocale(fieldLocale as CatalogLocale);
          requestAnimationFrame(() =>
            document
              .getElementById(
                `catalog-create-content-${fieldLocale}-${fieldName}`,
              )
              ?.focus(),
          );
        }}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="parentId" value={seed.parentId ?? ""} />

        <section className="dashboard-catalog-create-section">
          <h3>{labels.sections.general}</h3>
          <dl className="dashboard-catalog-facts">
            <div>
              <dt>{labels.fields.parent.label}</dt>
              <dd>{seed.parentName}</dd>
            </div>
          </dl>
          <div className="dashboard-catalog-slug-grid">
            <Field
              id="catalog-create-bgSlug"
              copy={labels.fields.bgSlug}
              error={slugErrorLabel(errors.bgSlug, labels)}
            >
              <input
                id="catalog-create-bgSlug"
                name="bgSlug"
                autoFocus
                value={bgSlug}
                onChange={(event) => {
                  setBgSlug(event.target.value);
                  setDismissedErrors((current) => new Set(current).add("bgSlug"));
                  setClientErrors((current) => {
                    const next = { ...current };
                    delete next.bgSlug;
                    return next;
                  });
                  onDirty("general");
                }}
                required
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                aria-describedby="catalog-create-bgSlug-help"
                aria-invalid={errors.bgSlug ? true : undefined}
              />
            </Field>
            <Field
              id="catalog-create-enSlug"
              copy={labels.fields.enSlug}
              error={slugErrorLabel(errors.enSlug, labels)}
            >
              <input
                id="catalog-create-enSlug"
                name="enSlug"
                value={enSlug}
                onChange={(event) => {
                  setEnSlug(event.target.value);
                  setDismissedErrors((current) => new Set(current).add("enSlug"));
                  setClientErrors((current) => {
                    const next = { ...current };
                    delete next.enSlug;
                    return next;
                  });
                  onDirty("general");
                }}
                required
                maxLength={120}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                aria-describedby="catalog-create-enSlug-help"
                aria-invalid={errors.enSlug ? true : undefined}
              />
            </Field>
          </div>
        </section>

        <section className="dashboard-catalog-create-section">
          <h3>{labels.sections.content}</h3>
          <LocalizedEditorSwitch
            idPrefix="catalog-create-content"
            variant="tabs"
            activeLocale={activeLocale}
            onChange={setActiveLocale}
            languageNames={labels.languages}
            statusByLocale={contentCompletion(content)}
            completeLabel={labels.editor.complete}
            incompleteLabel={labels.editor.incomplete}
            ariaLabel={labels.sections.content}
          />
          {catalogLocales.map((contentLocale) => (
            <LocaleContentPanel
              key={contentLocale}
              locale={contentLocale}
              values={content[contentLocale]}
              labels={labels}
              active={activeLocale === contentLocale}
              disabled={false}
              errors={errors}
              onChange={(values) => changeContent(contentLocale, values)}
              bgSlug={bgSlug}
              enSlug={enSlug}
              idPrefix="catalog-create-content"
            />
          ))}
        </section>

        <div className="dashboard-catalog-form-actions">
          <button type="button" disabled={pending} onClick={onDiscard}>
            {labels.create.discard}
          </button>
          <button type="submit" disabled={pending}>
            {pending ? labels.create.submitting : labels.create.submit}
          </button>
        </div>
        <ResultMessage result={result} labels={labels} />
      </form>
    </article>
  );
}

function CategoryEditor({
  detail,
  categories,
  labels,
  locale,
  canManage,
  onDirty,
  clearDirty,
  onMove,
  onLifecycle,
  onReload,
}: {
  detail: ManagedCatalogCategoryDetail;
  categories: ManagedCatalogCategoryTreeItem[];
  labels: CatalogLabels;
  locale: string;
  canManage: boolean;
  onDirty: (section: EditorSection) => void;
  clearDirty: (section: EditorSection) => void;
  onMove: () => void;
  onLifecycle: (intent: LifecycleIntent) => void;
  onReload: () => void;
}) {
  const [activeLocale, setActiveLocale] = useState<CatalogLocale>("bg");
  const [generalResult, generalAction, generalPending] = useActionState(
    saveCatalogCategoryGeneralAction,
    initialCatalogActionResult,
  );
  const [contentResult, contentAction, contentPending] = useActionState(
    saveCatalogCategoryTranslationsAction,
    initialCatalogActionResult,
  );
  const [specificationResult, specificationAction, specificationPending] =
    useActionState(
      saveCatalogCategorySpecificationsAction,
      initialCatalogActionResult,
    );
  const [bgSlug, setBgSlug] = useState(detail.bgSlug);
  const [enSlug, setEnSlug] = useState(detail.enSlug);
  const [content, setContent] = useState<CategoryContentDrafts>(() =>
    categoryContentFromDetail(detail),
  );
  const [contentErrors, setContentErrors] = useState<Record<string, string>>({});
  const [dismissedContentErrors, setDismissedContentErrors] = useState(false);
  const [dismissedGeneralErrors, setDismissedGeneralErrors] = useState<Set<string>>(
    () => new Set(),
  );
  const parent = categories.find(({ id }) => id === detail.parentId);

  useEffect(() => {
    if (
      generalResult.status !== "success" ||
      generalResult.updatedAt !== detail.updatedAt
    ) {
      return;
    }
    setBgSlug(detail.bgSlug);
    setEnSlug(detail.enSlug);
    setDismissedGeneralErrors(new Set());
    clearDirty("general");
  }, [
    clearDirty,
    detail.bgSlug,
    detail.enSlug,
    detail.updatedAt,
    generalResult.status,
    generalResult.updatedAt,
  ]);
  useEffect(() => {
    if (
      contentResult.status !== "success" ||
      contentResult.updatedAt !== detail.updatedAt
    ) {
      return;
    }
    setContent(categoryContentFromDetail(detail));
    setContentErrors({});
    setDismissedContentErrors(false);
    clearDirty("content");
  }, [
    clearDirty,
    contentResult.status,
    contentResult.updatedAt,
    detail,
  ]);
  useEffect(() => {
    setDismissedContentErrors(false);
  }, [contentResult.fieldErrors]);
  useEffect(() => {
    if (
      dismissedContentErrors ||
      contentResult.status !== "error" ||
      !contentResult.fieldErrors
    ) {
      return;
    }

    const firstField = Object.keys(contentResult.fieldErrors)[0];
    const [, fieldLocale, fieldName] = firstField?.split(".") ?? [];

    if (
      !fieldLocale ||
      !fieldName ||
      !catalogLocales.includes(fieldLocale as CatalogLocale)
    ) {
      return;
    }

    requestAnimationFrame(() => {
      setActiveLocale(fieldLocale as CatalogLocale);
      requestAnimationFrame(() =>
        document
          .getElementById(`catalog-content-${fieldLocale}-${fieldName}`)
          ?.focus(),
      );
    });
  }, [
    contentResult.fieldErrors,
    contentResult.status,
    dismissedContentErrors,
  ]);
  useEffect(() => {
    if (
      specificationResult.status === "success" &&
      specificationResult.updatedAt === detail.updatedAt
    ) {
      clearDirty("specifications");
    }
  }, [
    clearDirty,
    detail.updatedAt,
    specificationResult.status,
    specificationResult.updatedAt,
  ]);

  return (
    <article className="dashboard-catalog-editor">
      <header className="dashboard-catalog-editor-header">
        <div>
          <span
            className="dashboard-catalog-status"
            data-status={detail.status}
          >
            {labels.status[detail.status]}
          </span>
          <h2>
            {detail.translations.find(
              (translation) => translation.locale === locale,
            )?.name ||
              detail.translations.find(
                (translation) => translation.locale === "bg",
              )?.name ||
              detail.translations[0]?.name ||
              detail.slug}
          </h2>
          <p>{detail.slug}</p>
        </div>
        {canManage ? (
          <div className="dashboard-catalog-lifecycle-actions">
            {detail.status === "draft" ? (
              <button type="button" onClick={() => onLifecycle("publish")}>
                {labels.actions.publish}
              </button>
            ) : null}
            {detail.status === "published" ? (
              <button type="button" onClick={() => onLifecycle("unpublish")}>
                {labels.actions.unpublish}
              </button>
            ) : null}
            {detail.status !== "archived" ? (
              <button
                type="button"
                data-danger="true"
                onClick={() => onLifecycle("archive")}
              >
                {labels.actions.archive}
              </button>
            ) : (
              <button type="button" onClick={() => onLifecycle("restore")}>
                {labels.actions.restore}
              </button>
            )}
          </div>
        ) : null}
      </header>

      <PublicationReadiness
        issues={detail.publicationIssues}
        labels={labels}
        detail={detail}
        activeLocale={activeLocale}
      />

      <details className="dashboard-catalog-section" open>
        <summary>{labels.sections.general}</summary>
        <form action={generalAction} aria-busy={generalPending}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="categoryId" value={detail.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={detail.updatedAt}
          />
          <fieldset disabled={!canManage}>
            <div className="dashboard-catalog-slug-grid">
              <Field
                id="catalog-category-bgSlug"
                copy={labels.fields.bgSlug}
                error={
                  generalResult.fieldErrors?.bgSlug &&
                  !dismissedGeneralErrors.has("bgSlug")
                    ? slugErrorLabel(
                        generalResult.fieldErrors.bgSlug,
                        labels,
                      )
                    : undefined
                }
              >
                <input
                  id="catalog-category-bgSlug"
                  name="bgSlug"
                  value={bgSlug}
                  onChange={(event) => {
                    setBgSlug(event.target.value);
                    setDismissedGeneralErrors((current) =>
                      new Set(current).add("bgSlug"),
                    );
                    onDirty("general");
                  }}
                  required
                  maxLength={120}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  readOnly={detail.publishedAt !== null}
                  aria-describedby="catalog-category-bgSlug-help"
                  aria-invalid={
                    generalResult.fieldErrors?.bgSlug &&
                    !dismissedGeneralErrors.has("bgSlug")
                      ? true
                      : undefined
                  }
                />
              </Field>
              <Field
                id="catalog-category-enSlug"
                copy={labels.fields.enSlug}
                error={
                  generalResult.fieldErrors?.enSlug &&
                  !dismissedGeneralErrors.has("enSlug")
                    ? slugErrorLabel(
                        generalResult.fieldErrors.enSlug,
                        labels,
                      )
                    : undefined
                }
              >
                <input
                  id="catalog-category-enSlug"
                  name="enSlug"
                  value={enSlug}
                  onChange={(event) => {
                    setEnSlug(event.target.value);
                    setDismissedGeneralErrors((current) =>
                      new Set(current).add("enSlug"),
                    );
                    onDirty("general");
                  }}
                  required
                  maxLength={120}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  readOnly={detail.publishedAt !== null}
                  aria-describedby="catalog-category-enSlug-help"
                  aria-invalid={
                    generalResult.fieldErrors?.enSlug &&
                    !dismissedGeneralErrors.has("enSlug")
                      ? true
                      : undefined
                  }
                />
              </Field>
            </div>
            <dl className="dashboard-catalog-facts">
              <div>
                <dt>{labels.fields.parent.label}</dt>
                <dd>{parent?.name ?? labels.move.root}</dd>
              </div>
            </dl>
          </fieldset>
          {canManage ? (
            <div className="dashboard-catalog-form-actions">
              <button type="button" onClick={onMove}>
                {labels.actions.move}
              </button>
              <button type="submit" disabled={generalPending}>
                {generalPending ? labels.actions.saving : labels.actions.save}
              </button>
            </div>
          ) : null}
          <ResultMessage
            result={generalResult}
            labels={labels}
            onReload={onReload}
          />
        </form>
      </details>

      <details className="dashboard-catalog-section" open>
        <summary>{labels.sections.content}</summary>
        <form
          action={contentAction}
          aria-busy={contentPending}
          onSubmit={(event) => {
            const nextErrors: Record<string, string> = {};
            for (const contentLocale of catalogLocales) {
              if (!content[contentLocale].name.trim()) {
                nextErrors[`content.${contentLocale}.name`] = "REQUIRED";
              }
              if (!content[contentLocale].introduction.trim()) {
                nextErrors[`content.${contentLocale}.introduction`] =
                  "REQUIRED";
              }
            }
            setContentErrors(nextErrors);
            const firstField = Object.keys(nextErrors)[0];
            if (!firstField) return;
            event.preventDefault();
            const [, fieldLocale, fieldName] = firstField.split(".");
            setActiveLocale(fieldLocale as CatalogLocale);
            requestAnimationFrame(() =>
              document
                .getElementById(`catalog-content-${fieldLocale}-${fieldName}`)
                ?.focus(),
            );
          }}
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="categoryId" value={detail.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={detail.updatedAt}
          />
          <LocalizedEditorSwitch
            idPrefix="catalog-content"
            variant="tabs"
            activeLocale={activeLocale}
            onChange={setActiveLocale}
            languageNames={labels.languages}
            statusByLocale={contentCompletion(content)}
            completeLabel={labels.editor.complete}
            incompleteLabel={labels.editor.incomplete}
            ariaLabel={labels.sections.content}
          />
          {catalogLocales.map((contentLocale) => (
            <LocaleContentPanel
              key={contentLocale}
              locale={contentLocale}
              values={content[contentLocale]}
              labels={labels}
              active={activeLocale === contentLocale}
              disabled={!canManage}
              errors={{
                ...(!dismissedContentErrors
                  ? (contentResult.fieldErrors ?? {})
                  : {}),
                ...contentErrors,
              }}
              onChange={(values) => {
                setDismissedContentErrors(true);
                setContent((current) => ({
                  ...current,
                  [contentLocale]: values,
                }));
                setContentErrors((current) => {
                  const next = { ...current };
                  delete next[`content.${contentLocale}.name`];
                  delete next[`content.${contentLocale}.introduction`];
                  return next;
                });
                onDirty("content");
              }}
              bgSlug={bgSlug}
              enSlug={enSlug}
              idPrefix="catalog-content"
            />
          ))}
          {canManage ? (
            <div className="dashboard-catalog-form-actions">
              <span />
              <button type="submit" disabled={contentPending}>
                {contentPending ? labels.actions.saving : labels.actions.save}
              </button>
            </div>
          ) : null}
          <ResultMessage
            result={contentResult}
            labels={labels}
            onReload={onReload}
          />
        </form>
      </details>

      <details className="dashboard-catalog-section">
        <summary>{labels.sections.specifications}</summary>
        <SpecificationEditor
          detail={detail}
          labels={labels}
          disabled={!canManage}
          onDirty={() => onDirty("specifications")}
          result={specificationResult}
          action={specificationAction}
          pending={specificationPending}
          onReload={onReload}
          locale={locale}
        />
      </details>
    </article>
  );
}

function CategoryBranch({
  parentId,
  categories,
  selectedId,
  catalogPath,
  labels,
  canManage,
  onCreate,
  onReorder,
  onOpen,
}: {
  parentId: string | null;
  categories: ManagedCatalogCategoryTreeItem[];
  selectedId: string | null;
  catalogPath: string;
  labels: CatalogLabels;
  canManage: boolean;
  onCreate: (parentId: string, parentName: string) => void;
  onReorder: (categoryId: string, direction: -1 | 1) => void;
  onOpen: () => void;
}) {
  const siblings = categories.filter(
    (category) => category.parentId === parentId,
  );

  if (siblings.length === 0) return null;

  return (
    <ul>
      {siblings.map((category, index) => (
        <li key={category.id}>
          <div
            className="dashboard-catalog-tree-row"
            data-selected={selectedId === category.id ? "true" : undefined}
          >
            <Link
              href={`${catalogPath}?category=${category.id}`}
              aria-current={selectedId === category.id ? "page" : undefined}
              onClick={onOpen}
            >
              <strong>{category.name}</strong>
              <span>{category.slug}</span>
              <small>{labels.status[category.status]}</small>
            </Link>
            {canManage ? (
              <div className="dashboard-catalog-tree-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`${labels.tree.moveUp}: ${category.name}`}
                  onClick={() => onReorder(category.id, -1)}
                >
                  {arrowIcon("up")}
                </button>
                <button
                  type="button"
                  disabled={index === siblings.length - 1}
                  aria-label={`${labels.tree.moveDown}: ${category.name}`}
                  onClick={() => onReorder(category.id, 1)}
                >
                  {arrowIcon("down")}
                </button>
                {category.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => onCreate(category.id, category.name)}
                  >
                    {labels.tree.addChild}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <CategoryBranch
            parentId={category.id}
            categories={categories}
            selectedId={selectedId}
            catalogPath={catalogPath}
            labels={labels}
            canManage={canManage}
            onCreate={onCreate}
            onReorder={onReorder}
            onOpen={onOpen}
          />
        </li>
      ))}
    </ul>
  );
}

export function CatalogWorkspace({
  locale,
  catalogPath,
  categories,
  selected,
  canManage,
  labels,
  openSelectedOnMobile,
}: CatalogWorkspaceProps) {
  const router = useRouter();
  const [dirtySections, setDirtySections] = useState<Set<EditorSection>>(
    () => new Set(),
  );
  const [mobileEditorOpen, setMobileEditorOpen] = useState(
    Boolean(selected) && openSelectedOnMobile,
  );
  const [editorRevision, setEditorRevision] = useState(0);
  const [createParent, setCreateParent] = useState<{
    id: string | null;
    name: string;
  }>({ id: null, name: labels.create.root });
  const [createName, setCreateName] = useState("");
  const [newCategory, setNewCategory] = useState<NewCategorySeed | null>(null);
  const [moveParentId, setMoveParentId] = useState(selected?.parentId ?? "");
  const [lifecycleIntent, setLifecycleIntent] =
    useState<LifecycleIntent | null>(null);
  const [manageResult, setManageResult] = useState<CatalogActionResult>(
    initialCatalogActionResult,
  );
  const [managePending, startManageTransition] = useTransition();
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const moveDialogRef = useRef<HTMLDialogElement>(null);
  const lifecycleDialogRef = useRef<HTMLDialogElement>(null);
  const lastDialogInvokerRef = useRef<HTMLElement | null>(null);
  const createContinuedRef = useRef(false);
  const skipNextPopRef = useRef(false);
  const focusedElementRef = useRef<HTMLElement | null>(null);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);
  const hasUnsavedChanges = dirtySections.size > 0;
  const currentLocale: CatalogLocale = isCatalogLocale(locale) ? locale : "bg";

  const markDirty = useCallback((section: EditorSection) => {
    setDirtySections((current) => {
      const next = new Set(current);
      next.add(section);
      return next;
    });
  }, []);
  const clearDirty = useCallback((section: EditorSection) => {
    setDirtySections((current) => {
      const next = new Set(current);
      next.delete(section);
      return next;
    });
  }, []);
  const confirmDiscard = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    if (!window.confirm(labels.unsaved.message)) return false;
    setDirtySections(new Set());
    setEditorRevision((current) => current + 1);
    return true;
  }, [hasUnsavedChanges, labels.unsaved.message]);

  useEffect(() => {
    const rememberFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (focusedElementRef.current !== event.target) {
        previousFocusedElementRef.current = focusedElementRef.current;
        focusedElementRef.current = event.target;
      }
    };

    document.addEventListener("focusin", rememberFocus);
    return () => document.removeEventListener("focusin", rememberFocus);
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor =
        target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.href === window.location.href)
        return;
      if (window.confirm(labels.unsaved.message)) {
        setDirtySections(new Set());
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      requestAnimationFrame(() => {
        const previous = previousFocusedElementRef.current;
        if (previous?.isConnected) previous.focus();
      });
    };
    const historyIndex =
      typeof window.history.state?.idx === "number"
        ? window.history.state.idx
        : null;
    const currentHref = window.location.href;
    const popState = (event: PopStateEvent) => {
      if (skipNextPopRef.current) {
        skipNextPopRef.current = false;
        return;
      }

      if (window.confirm(labels.unsaved.message)) {
        setDirtySections(new Set());
        return;
      }

      const nextIndex =
        typeof event.state?.idx === "number" ? event.state.idx : null;
      if (historyIndex !== null && nextIndex !== null) {
        skipNextPopRef.current = true;
        window.history.go(nextIndex < historyIndex ? 1 : -1);
      } else {
        window.history.pushState(window.history.state, "", currentHref);
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", popState);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popState);
    };
  }, [hasUnsavedChanges, labels.unsaved.message]);

  useEffect(() => {
    if (manageResult.status === "success") {
      moveDialogRef.current?.close();
      lifecycleDialogRef.current?.close();
    }
  }, [manageResult.status]);

  const runManagementAction = (formData: FormData) => {
    if (managePending) return;

    startManageTransition(async () => {
      setManageResult(await manageCatalogCategoryAction(formData));
    });
  };
  const openCreate = (parentId: string | null, parentName: string) => {
    if (!confirmDiscard()) return;
    setNewCategory(null);
    lastDialogInvokerRef.current = document.activeElement as HTMLElement | null;
    createContinuedRef.current = false;
    setCreateParent({ id: parentId, name: parentName });
    setCreateName("");
    createDialogRef.current?.showModal();
  };
  const reorder = (categoryId: string, direction: -1 | 1) => {
    if (!confirmDiscard()) return;
    setManageResult(initialCatalogActionResult);
    const category = categories.find(({ id }) => id === categoryId);
    if (!category) return;
    const siblings = categories.filter(
      (candidate) => candidate.parentId === category.parentId,
    );
    const index = siblings.findIndex(({ id }) => id === categoryId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const adjacent = siblings[target];
    const samePosition = category.sortOrder === adjacent.sortOrder;
    const categorySortOrder = samePosition
      ? direction < 0
        ? category.sortOrder
        : category.sortOrder + 1
      : adjacent.sortOrder;
    const adjacentSortOrder = samePosition
      ? direction < 0
        ? adjacent.sortOrder + 1
        : adjacent.sortOrder
      : category.sortOrder;
    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("categoryId", categoryId);
    formData.set("expectedUpdatedAt", category.updatedAt);
    formData.set("intent", "reorder");
    formData.set(
      "categories",
      JSON.stringify(
        [
          {
            id: category.id,
            sortOrder: categorySortOrder,
            expectedUpdatedAt: category.updatedAt,
          },
          {
            id: adjacent.id,
            sortOrder: adjacentSortOrder,
            expectedUpdatedAt: adjacent.updatedAt,
          },
        ],
      ),
    );
    runManagementAction(formData);
  };

  const descendants = useMemo(() => {
    if (!selected) return new Set<string>();
    const ids = new Set<string>();
    let frontier = [selected.id];

    while (frontier.length > 0) {
      const next = categories
        .filter(
          (category) =>
            category.parentId &&
            frontier.includes(category.parentId) &&
            !ids.has(category.id),
        )
        .map(({ id }) => id);
      next.forEach((id) => ids.add(id));
      frontier = next;
    }

    return ids;
  }, [categories, selected]);
  const eligibleParents = categories.filter(
    (category) =>
      category.status !== "archived" &&
      category.id !== selected?.id &&
      !descendants.has(category.id),
  );
  const reloadLatest = () => {
    moveDialogRef.current?.close();
    lifecycleDialogRef.current?.close();
    setManageResult(initialCatalogActionResult);
    setDirtySections(new Set());
    setEditorRevision((current) => current + 1);
    router.refresh();
  };

  return (
    <>
      {!canManage ? (
        <p className="dashboard-catalog-readonly">{labels.readOnly}</p>
      ) : null}
      <div
        className="dashboard-catalog-workspace"
        data-mobile-editor={
          (selected || newCategory) && mobileEditorOpen ? "true" : "false"
        }
      >
        <aside
          className="dashboard-catalog-tree"
          aria-labelledby="catalog-tree-title"
        >
          <div className="dashboard-catalog-tree-heading">
            <h2 id="catalog-tree-title">{labels.tree.title}</h2>
            {canManage ? (
              <button
                type="button"
                onClick={() => openCreate(null, labels.create.root)}
              >
                {labels.tree.createRoot}
              </button>
            ) : null}
          </div>
          {categories.length === 0 ? (
            <p className="dashboard-catalog-tree-empty">{labels.tree.empty}</p>
          ) : (
            <nav aria-label={labels.tree.title}>
              <CategoryBranch
                parentId={null}
                categories={categories}
                selectedId={newCategory ? null : (selected?.id ?? null)}
                catalogPath={catalogPath}
                labels={labels}
                canManage={canManage}
                onCreate={(parentId, name) => openCreate(parentId, name)}
                onReorder={reorder}
                onOpen={() => setMobileEditorOpen(true)}
              />
            </nav>
          )}
        </aside>
        <section className="dashboard-catalog-detail">
          <button
            type="button"
            className="dashboard-catalog-mobile-back"
            onClick={() => {
              if (!confirmDiscard()) return;
              setNewCategory(null);
              setMobileEditorOpen(false);
            }}
          >
            {arrowIcon("back")}
            {labels.tree.back}
          </button>
          {newCategory ? (
            <NewCategoryEditor
              key={`${newCategory.parentId ?? "root"}:${editorRevision}`}
              seed={newCategory}
              labels={labels}
              locale={locale}
              onDirty={markDirty}
              clearDirty={clearDirty}
              onDiscard={() => {
                if (!confirmDiscard()) return;
                setNewCategory(null);
                setMobileEditorOpen(false);
              }}
              onCreated={(categoryId) => {
                setNewCategory(null);
                setDirtySections(new Set());
                setMobileEditorOpen(true);
                router.push(`${catalogPath}?category=${categoryId}`);
              }}
            />
          ) : selected ? (
            <CategoryEditor
              key={`${selected.id}:${editorRevision}`}
              detail={selected}
              categories={categories}
              labels={labels}
              locale={locale}
              canManage={canManage}
              onDirty={markDirty}
              clearDirty={clearDirty}
              onMove={() => {
                if (!confirmDiscard()) return;
                setManageResult(initialCatalogActionResult);
                lastDialogInvokerRef.current =
                  document.activeElement as HTMLElement | null;
                setMoveParentId(selected.parentId ?? "");
                moveDialogRef.current?.showModal();
              }}
              onLifecycle={(intent) => {
                if (!confirmDiscard()) return;
                setManageResult(initialCatalogActionResult);
                if (
                  intent === "publish" &&
                  selected.publicationIssues.length > 0
                ) {
                  requestAnimationFrame(() =>
                    document
                      .getElementById("catalog-publication-issue-first")
                      ?.focus(),
                  );
                  return;
                }
                lastDialogInvokerRef.current =
                  document.activeElement as HTMLElement | null;
                setLifecycleIntent(intent);
                requestAnimationFrame(() =>
                  lifecycleDialogRef.current?.showModal(),
                );
              }}
              onReload={reloadLatest}
            />
          ) : (
            <div className="dashboard-catalog-detail-empty">
              <h2>{labels.editor.emptyTitle}</h2>
              <p>{labels.editor.emptyDescription}</p>
            </div>
          )}
          {manageResult.status === "success" ? (
            <ResultMessage result={manageResult} labels={labels} />
          ) : null}
        </section>
      </div>

      <dialog
        ref={createDialogRef}
        className="dashboard-catalog-dialog"
        aria-labelledby="catalog-create-title"
        aria-describedby="catalog-create-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!confirmDiscard()) return;
          createDialogRef.current?.close();
        }}
        onClose={() => {
          if (createContinuedRef.current) {
            createContinuedRef.current = false;
            return;
          }
          lastDialogInvokerRef.current?.focus();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const name = createName.trim();
            if (!name) return;
            setNewCategory({
              parentId: createParent.id,
              parentName: createParent.name,
              initialLocale: currentLocale,
              initialName: name,
            });
            setDirtySections(new Set<EditorSection>(["content"]));
            setMobileEditorOpen(true);
            createContinuedRef.current = true;
            createDialogRef.current?.close();
          }}
        >
          <h2 id="catalog-create-title">{labels.create.title}</h2>
          <p id="catalog-create-description">{labels.create.description}</p>
          <dl>
            <dt>{labels.create.parentLabel}</dt>
            <dd>{createParent.name}</dd>
          </dl>
          <label htmlFor="catalog-create-name">
            <span>
              {labels.create.name} — {labels.languages[currentLocale]}
            </span>
            <input
              id="catalog-create-name"
              value={createName}
              onChange={(event) => {
                const value = event.target.value;
                setCreateName(value);
                if (value.trim()) markDirty("content");
                else clearDirty("content");
              }}
              required
              maxLength={200}
            />
          </label>
          <div className="dashboard-catalog-dialog-actions">
            <button
              type="button"
              onClick={() => {
                if (!confirmDiscard()) return;
                createDialogRef.current?.close();
              }}
            >
              {labels.create.cancel}
            </button>
            <button type="submit">{labels.create.continue}</button>
          </div>
        </form>
      </dialog>

      {selected ? (
        <dialog
          ref={moveDialogRef}
          className="dashboard-catalog-dialog"
          aria-labelledby="catalog-move-title"
          aria-describedby="catalog-move-description"
          onClose={() => lastDialogInvokerRef.current?.focus()}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              runManagementAction(formData);
            }}
            aria-busy={managePending}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="categoryId" value={selected.id} />
            <input
              type="hidden"
              name="expectedUpdatedAt"
              value={selected.updatedAt}
            />
            <input type="hidden" name="intent" value="move" />
            <h2 id="catalog-move-title">{labels.move.title}</h2>
            <p id="catalog-move-description">{labels.move.description}</p>
            <label>
              <span>{labels.move.parent}</span>
              <select
                name="parentId"
                value={moveParentId}
                onChange={(event) => setMoveParentId(event.target.value)}
              >
                <option value="">{labels.move.root}</option>
                {eligibleParents.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            {manageResult.status === "error" ? (
              <ResultMessage
                result={manageResult}
                labels={labels}
                onReload={reloadLatest}
              />
            ) : null}
            <div className="dashboard-catalog-dialog-actions">
              <button
                type="button"
                disabled={managePending}
                onClick={() => moveDialogRef.current?.close()}
              >
                {labels.move.cancel}
              </button>
              <button type="submit" disabled={managePending}>
                {managePending ? labels.actions.working : labels.move.submit}
              </button>
            </div>
          </form>
        </dialog>
      ) : null}

      {selected && lifecycleIntent ? (
        <dialog
          ref={lifecycleDialogRef}
          className="dashboard-catalog-dialog"
          aria-labelledby="catalog-lifecycle-title"
          aria-describedby="catalog-lifecycle-description"
          onClose={() => lastDialogInvokerRef.current?.focus()}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runManagementAction(new FormData(event.currentTarget));
            }}
            aria-busy={managePending}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="categoryId" value={selected.id} />
            <input
              type="hidden"
              name="expectedUpdatedAt"
              value={selected.updatedAt}
            />
            <input type="hidden" name="intent" value={lifecycleIntent} />
            <h2 id="catalog-lifecycle-title">
              {labels.lifecycle[lifecycleIntent].title}
            </h2>
            <p id="catalog-lifecycle-description">
              {labels.lifecycle[lifecycleIntent].description}
            </p>
            {manageResult.status === "error" ? (
              <ResultMessage
                result={manageResult}
                labels={labels}
                onReload={reloadLatest}
              />
            ) : null}
            <div className="dashboard-catalog-dialog-actions">
              <button
                type="button"
                disabled={managePending}
                onClick={() => lifecycleDialogRef.current?.close()}
              >
                {labels.lifecycle.cancel}
              </button>
              <button type="submit" disabled={managePending}>
                {managePending
                  ? labels.actions.working
                  : labels.lifecycle[lifecycleIntent].confirm}
              </button>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
