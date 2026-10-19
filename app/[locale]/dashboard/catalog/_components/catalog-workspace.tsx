"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
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

type EditorSection = "general" | "content" | "specifications";
type LifecycleIntent = "publish" | "unpublish" | "archive" | "restore";

type FieldCopy = { label: string; help: string };

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
    slug: FieldCopy;
    parent: FieldCopy;
    order: FieldCopy;
    name: FieldCopy;
    introduction: FieldCopy;
    detailedContent: FieldCopy;
    seoTitle: FieldCopy;
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
    introduction: string;
    slug: string;
    cancel: string;
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
  lifecycle: Record<LifecycleIntent, { title: string; description: string; confirm: string }> & {
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
    add: string;
    remove: string;
    moveUp: string;
    moveDown: string;
    key: FieldCopy;
    type: FieldCopy;
    unit: FieldCopy;
    required: string;
    requiredHelp: string;
    filterable: string;
    filterableHelp: string;
    label: string;
    options: string;
    addOption: string;
    removeOption: string;
    optionCode: string;
    optionLabel: string;
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
  key: string;
  valueType: CatalogSpecificationValueType;
  unit: string;
  isRequired: boolean;
  isFilterable: boolean;
  labels: Record<CatalogLocale, string>;
  options: Array<{
    clientId: string;
    code: string;
    labels: Record<CatalogLocale, string>;
  }>;
};

const initialCatalogActionResult: CatalogActionResult = { status: "idle" };

const emptyLocaleLabels = (): Record<CatalogLocale, string> => ({
  bg: "",
  en: "",
  tr: "",
  uk: "",
});

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

function CharacterCount({ value, maximum }: { value: string; maximum: number }) {
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
) {
  return labels.readiness.messages[issue.code]
    .replace(
      "{{locale}}",
      "locale" in issue ? labels.languages[issue.locale] : "",
    )
    .replace(
      "{{specification}}",
      "specificationKey" in issue ? issue.specificationKey : "",
    )
    .replace("{{option}}", "optionCode" in issue ? issue.optionCode : "");
}

function PublicationReadiness({
  issues,
  labels,
}: {
  issues: CatalogCategoryPublicationIssue[];
  labels: CatalogLabels;
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
              {issueMessage(issue, labels)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function initialSpecifications(
  detail: ManagedCatalogCategoryDetail,
): SpecificationDraft[] {
  return detail.specifications.map((specification) => ({
    clientId: specification.id,
    key: specification.key,
    valueType: specification.valueType,
    unit: specification.unit ?? "",
    isRequired: specification.isRequired,
    isFilterable: specification.isFilterable,
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
      code: option.code,
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
      key: specification.key,
      valueType: specification.valueType,
      unit: specification.unit || null,
      isRequired: specification.isRequired,
      isFilterable: specification.isFilterable,
      displayOrder: specificationIndex,
      translations: catalogLocales.flatMap((locale) =>
        specification.labels[locale].trim()
          ? [{ locale, label: specification.labels[locale] }]
          : [],
      ),
      options:
        specification.valueType === "selection"
          ? specification.options.map((option, optionIndex) => ({
              code: option.code,
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

function LocaleContentPanel({
  locale,
  translation,
  labels,
  active,
  disabled,
  errors,
  onDirty,
  slug,
}: {
  locale: CatalogLocale;
  translation: ManagedCatalogCategoryDetail["translations"][number] | undefined;
  labels: CatalogLabels;
  active: boolean;
  disabled: boolean;
  errors: Record<string, string>;
  onDirty: () => void;
  slug: string;
}) {
  const prefix = `content.${locale}`;
  const [values, setValues] = useState({
    name: translation?.name ?? "",
    introduction: translation?.introduction ?? "",
    detailedContent: translation?.detailedContent ?? "",
    seoTitle: translation?.seoTitle ?? "",
    metaDescription: translation?.metaDescription ?? "",
    productTitleGuidance: translation?.productTitleGuidance ?? "",
  });

  const update = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    onDirty();
  };
  const describedBy = (id: string) =>
    `${id}-help${errors[`${prefix}.${id.split("-").at(-1)}`] ? ` ${id}-error` : ""}`;

  return (
    <div
      id={`catalog-language-panel-${locale}`}
      role="tabpanel"
      aria-labelledby={`catalog-language-tab-${locale}`}
      hidden={!active}
      className="dashboard-catalog-language-panel"
    >
      <fieldset disabled={disabled}>
        <Field
          id={`${prefix}-name`}
          copy={labels.fields.name}
          count={<CharacterCount value={values.name} maximum={200} />}
          error={errors[`${prefix}.name`] ? labels.validation.required : undefined}
        >
          <input
            id={`${prefix}-name`}
            name={`${prefix}.name`}
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={200}
            aria-describedby={describedBy(`${prefix}-name`)}
            aria-invalid={errors[`${prefix}.name`] ? true : undefined}
          />
        </Field>
        <Field
          id={`${prefix}-introduction`}
          copy={labels.fields.introduction}
          count={<CharacterCount value={values.introduction} maximum={2000} />}
          error={
            errors[`${prefix}.introduction`]
              ? labels.validation.required
              : undefined
          }
        >
          <textarea
            id={`${prefix}-introduction`}
            name={`${prefix}.introduction`}
            value={values.introduction}
            onChange={(event) => update("introduction", event.target.value)}
            maxLength={2000}
            rows={4}
            aria-describedby={describedBy(`${prefix}-introduction`)}
            aria-invalid={errors[`${prefix}.introduction`] ? true : undefined}
          />
        </Field>
        <Field
          id={`${prefix}-detailedContent`}
          copy={labels.fields.detailedContent}
          count={<CharacterCount value={values.detailedContent} maximum={50000} />}
        >
          <textarea
            id={`${prefix}-detailedContent`}
            name={`${prefix}.detailedContent`}
            value={values.detailedContent}
            onChange={(event) => update("detailedContent", event.target.value)}
            maxLength={50000}
            rows={10}
            aria-describedby={`${prefix}-detailedContent-help`}
          />
        </Field>
        <div className="dashboard-catalog-seo-fields">
          <Field
            id={`${prefix}-seoTitle`}
            copy={labels.fields.seoTitle}
            count={<CharacterCount value={values.seoTitle} maximum={200} />}
          >
            <input
              id={`${prefix}-seoTitle`}
              name={`${prefix}.seoTitle`}
              value={values.seoTitle}
              onChange={(event) => update("seoTitle", event.target.value)}
              maxLength={200}
              aria-describedby={`${prefix}-seoTitle-help`}
            />
          </Field>
          <Field
            id={`${prefix}-metaDescription`}
            copy={labels.fields.metaDescription}
            count={<CharacterCount value={values.metaDescription} maximum={500} />}
          >
            <textarea
              id={`${prefix}-metaDescription`}
              name={`${prefix}.metaDescription`}
              value={values.metaDescription}
              onChange={(event) => update("metaDescription", event.target.value)}
              maxLength={500}
              rows={3}
              aria-describedby={`${prefix}-metaDescription-help`}
            />
          </Field>
          <div className="dashboard-catalog-search-preview">
            <span>{labels.seoPreview.title}</span>
            <strong>{values.seoTitle || values.name || labels.seoPreview.emptyTitle}</strong>
            <small>
              … / {locale === "bg" ? "" : `${locale} / `}{slug}
            </small>
            <p>
              {values.metaDescription ||
                values.introduction ||
                labels.seoPreview.emptyDescription}
            </p>
            <em>{labels.seoPreview.note}</em>
          </div>
        </div>
        <Field
          id={`${prefix}-productTitleGuidance`}
          copy={labels.fields.productTitleGuidance}
          count={
            <CharacterCount value={values.productTitleGuidance} maximum={1000} />
          }
        >
          <textarea
            id={`${prefix}-productTitleGuidance`}
            name={`${prefix}.productTitleGuidance`}
            value={values.productTitleGuidance}
            onChange={(event) =>
              update("productTitleGuidance", event.target.value)
            }
            maxLength={1000}
            rows={4}
            aria-describedby={`${prefix}-productTitleGuidance-help`}
          />
        </Field>
      </fieldset>
    </div>
  );
}

function LanguageTabs({
  activeLocale,
  setActiveLocale,
  detail,
  labels,
}: {
  activeLocale: CatalogLocale;
  setActiveLocale: (locale: CatalogLocale) => void;
  detail: ManagedCatalogCategoryDetail;
  labels: CatalogLabels;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = catalogLocales.indexOf(activeLocale);
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % catalogLocales.length
        : event.key === "ArrowLeft"
          ? (index - 1 + catalogLocales.length) % catalogLocales.length
          : null;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextLocale = catalogLocales[nextIndex];
    setActiveLocale(nextLocale);
    requestAnimationFrame(() =>
      document.getElementById(`catalog-language-tab-${nextLocale}`)?.focus(),
    );
  };

  return (
    <div
      className="dashboard-catalog-language-tabs"
      role="tablist"
      aria-label={labels.sections.content}
    >
      {catalogLocales.map((locale) => {
        const translation = detail.translations.find(
          (candidate) => candidate.locale === locale,
        );
        const complete = Boolean(translation?.name && translation.introduction);

        return (
          <button
            key={locale}
            id={`catalog-language-tab-${locale}`}
            type="button"
            role="tab"
            aria-selected={activeLocale === locale}
            aria-controls={`catalog-language-panel-${locale}`}
            tabIndex={activeLocale === locale ? 0 : -1}
            onClick={() => setActiveLocale(locale)}
            onKeyDown={onKeyDown}
          >
            <span>{labels.languages[locale]}</span>
            {locale === "bg" ? <small>{labels.editor.sourceLanguage}</small> : null}
            <small>{complete ? labels.editor.complete : labels.editor.incomplete}</small>
          </button>
        );
      })}
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

  const updateSpecification = (
    index: number,
    update: (specification: SpecificationDraft) => SpecificationDraft,
  ) => {
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

  return (
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="categoryId" value={detail.id} />
      <input type="hidden" name="expectedUpdatedAt" value={detail.updatedAt} />
      <input
        type="hidden"
        name="specifications"
        value={serializeSpecifications(specifications)}
      />
      {specifications.length === 0 ? (
        <p className="dashboard-catalog-specifications-empty">
          {labels.specifications.empty}
        </p>
      ) : (
        <div className="dashboard-catalog-specification-list">
          {specifications.map((specification, index) => (
            <fieldset
              key={specification.clientId}
              className="dashboard-catalog-specification"
              disabled={disabled}
            >
              <legend>
                {specification.labels.bg || specification.key || `${index + 1}`}
              </legend>
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
                    if (!window.confirm(labels.specifications.confirmRemove)) return;
                    setSpecifications((current) =>
                      current.filter((_, candidateIndex) => candidateIndex !== index),
                    );
                    onDirty();
                  }}
                >
                  {labels.specifications.remove}
                </button>
              </div>
              <div className="dashboard-catalog-specification-grid">
                <Field
                  id={`specification-${index}-key`}
                  copy={labels.specifications.key}
                >
                  <input
                    id={`specification-${index}-key`}
                    value={specification.key}
                    onChange={(event) =>
                      updateSpecification(index, (current) => ({
                        ...current,
                        key: event.target.value,
                      }))
                    }
                    required
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    maxLength={80}
                    aria-describedby={`specification-${index}-key-help`}
                  />
                </Field>
                <Field
                  id={`specification-${index}-type`}
                  copy={labels.specifications.type}
                >
                  <select
                    id={`specification-${index}-type`}
                    value={specification.valueType}
                    onChange={(event) => {
                      const value = event.target.value as CatalogSpecificationValueType;
                      if (
                        specification.valueType === "selection" &&
                        value !== "selection" &&
                        specification.options.length > 0 &&
                        !window.confirm(labels.specifications.confirmClearOptions)
                      ) {
                        return;
                      }
                      updateSpecification(index, (current) => ({
                        ...current,
                        valueType: value,
                        options: value === "selection" ? current.options : [],
                      }));
                    }}
                    aria-describedby={`specification-${index}-type-help`}
                  >
                    {Object.entries(labels.specifications.types).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field
                  id={`specification-${index}-unit`}
                  copy={labels.specifications.unit}
                >
                  <input
                    id={`specification-${index}-unit`}
                    value={specification.unit}
                    onChange={(event) =>
                      updateSpecification(index, (current) => ({
                        ...current,
                        unit: event.target.value,
                      }))
                    }
                    maxLength={40}
                    aria-describedby={`specification-${index}-unit-help`}
                  />
                </Field>
              </div>
              <div className="dashboard-catalog-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={specification.isRequired}
                    onChange={(event) =>
                      updateSpecification(index, (current) => ({
                        ...current,
                        isRequired: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>{labels.specifications.required}</strong>
                    <small>{labels.specifications.requiredHelp}</small>
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={specification.isFilterable}
                    onChange={(event) =>
                      updateSpecification(index, (current) => ({
                        ...current,
                        isFilterable: event.target.checked,
                      }))
                    }
                  />
                  <span>
                    <strong>{labels.specifications.filterable}</strong>
                    <small>{labels.specifications.filterableHelp}</small>
                  </span>
                </label>
              </div>
              <div className="dashboard-catalog-localized-grid">
                {catalogLocales.map((contentLocale) => (
                  <label key={contentLocale}>
                    <span>
                      {labels.specifications.label} · {labels.languages[contentLocale]}
                    </span>
                    <input
                      value={specification.labels[contentLocale]}
                      onChange={(event) =>
                        updateSpecification(index, (current) => ({
                          ...current,
                          labels: {
                            ...current.labels,
                            [contentLocale]: event.target.value,
                          },
                        }))
                      }
                      maxLength={200}
                    />
                  </label>
                ))}
              </div>
              {specification.valueType === "selection" ? (
                <section className="dashboard-catalog-options">
                  <div className="dashboard-catalog-options-heading">
                    <h4>{labels.specifications.options}</h4>
                    <button
                      type="button"
                      onClick={() =>
                        updateSpecification(index, (current) => ({
                          ...current,
                          options: [
                            ...current.options,
                            {
                              clientId: crypto.randomUUID(),
                              code: "",
                              labels: emptyLocaleLabels(),
                            },
                          ],
                        }))
                      }
                    >
                      {labels.specifications.addOption}
                    </button>
                  </div>
                  {specification.options.map((option, optionIndex) => (
                    <div key={option.clientId} className="dashboard-catalog-option">
                      <div className="dashboard-catalog-option-heading">
                        <label>
                          <span>{labels.specifications.optionCode}</span>
                          <input
                            value={option.code}
                            onChange={(event) =>
                              updateSpecification(index, (current) => ({
                                ...current,
                                options: current.options.map(
                                  (candidate, candidateIndex) =>
                                    candidateIndex === optionIndex
                                      ? { ...candidate, code: event.target.value }
                                      : candidate,
                                ),
                              }))
                            }
                            required
                            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                            maxLength={80}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateSpecification(index, (current) => ({
                              ...current,
                              options: current.options.filter(
                                (_, candidateIndex) =>
                                  candidateIndex !== optionIndex,
                              ),
                            }))
                          }
                        >
                          {labels.specifications.removeOption}
                        </button>
                      </div>
                      <div className="dashboard-catalog-localized-grid">
                        {catalogLocales.map((contentLocale) => (
                          <label key={contentLocale}>
                            <span>
                              {labels.specifications.optionLabel} ·{" "}
                              {labels.languages[contentLocale]}
                            </span>
                            <input
                              value={option.labels[contentLocale]}
                              onChange={(event) =>
                                updateSpecification(index, (current) => ({
                                  ...current,
                                  options: current.options.map(
                                    (candidate, candidateIndex) =>
                                      candidateIndex === optionIndex
                                        ? {
                                            ...candidate,
                                            labels: {
                                              ...candidate.labels,
                                              [contentLocale]: event.target.value,
                                            },
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              maxLength={200}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}
            </fieldset>
          ))}
        </div>
      )}
      {!disabled ? (
        <div className="dashboard-catalog-form-actions">
          <button
            type="button"
            onClick={() => {
              setSpecifications((current) => [
                ...current,
                {
                  clientId: crypto.randomUUID(),
                  key: "",
                  valueType: "text",
                  unit: "",
                  isRequired: false,
                  isFilterable: false,
                  labels: emptyLocaleLabels(),
                  options: [],
                },
              ]);
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
    </form>
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
  const [slug, setSlug] = useState(detail.slug);
  const parent = categories.find(({ id }) => id === detail.parentId);

  useEffect(() => {
    if (generalResult.status === "success") clearDirty("general");
  }, [clearDirty, generalResult.status]);
  useEffect(() => {
    if (contentResult.status === "success") clearDirty("content");
  }, [clearDirty, contentResult.status]);
  useEffect(() => {
    if (
      contentResult.status !== "error" ||
      !contentResult.fieldErrors
    ) {
      return;
    }

    const firstField = Object.keys(contentResult.fieldErrors)[0];
    const [, fieldLocale, fieldName] = firstField?.split(".") ?? [];

    if (!fieldLocale || !fieldName || !catalogLocales.includes(fieldLocale as CatalogLocale)) {
      return;
    }

    requestAnimationFrame(() => {
      setActiveLocale(fieldLocale as CatalogLocale);
      requestAnimationFrame(() =>
        document.getElementById(`content.${fieldLocale}-${fieldName}`)?.focus(),
      );
    });
  }, [contentResult.fieldErrors, contentResult.status]);
  useEffect(() => {
    if (specificationResult.status === "success") {
      clearDirty("specifications");
    }
  }, [clearDirty, specificationResult.status]);

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
            {detail.translations.find(({ locale }) => locale === "bg")?.name ||
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

      <PublicationReadiness issues={detail.publicationIssues} labels={labels} />

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
          <input type="hidden" name="sortOrder" value={detail.sortOrder} />
          <fieldset disabled={!canManage}>
            <Field id="catalog-category-slug" copy={labels.fields.slug}>
              <input
                id="catalog-category-slug"
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  onDirty("general");
                }}
                maxLength={120}
                readOnly={detail.publishedAt !== null}
                aria-describedby="catalog-category-slug-help"
              />
            </Field>
            <dl className="dashboard-catalog-facts">
              <div>
                <dt>{labels.fields.parent.label}</dt>
                <dd>{parent?.name ?? labels.move.root}</dd>
              </div>
              <div>
                <dt>{labels.fields.order.label}</dt>
                <dd>{detail.sortOrder}</dd>
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
          <ResultMessage result={generalResult} labels={labels} onReload={onReload} />
        </form>
      </details>

      <details className="dashboard-catalog-section" open>
        <summary>{labels.sections.content}</summary>
        <form action={contentAction} aria-busy={contentPending}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="categoryId" value={detail.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={detail.updatedAt}
          />
          <LanguageTabs
            activeLocale={activeLocale}
            setActiveLocale={setActiveLocale}
            detail={detail}
            labels={labels}
          />
          {catalogLocales.map((contentLocale) => (
            <LocaleContentPanel
              key={contentLocale}
              locale={contentLocale}
              translation={detail.translations.find(
                (candidate) => candidate.locale === contentLocale,
              )}
              labels={labels}
              active={activeLocale === contentLocale}
              disabled={!canManage}
              errors={contentResult.fieldErrors ?? {}}
              onDirty={() => onDirty("content")}
              slug={detail.slug}
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
          <ResultMessage result={contentResult} labels={labels} onReload={onReload} />
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
  const siblings = categories.filter((category) => category.parentId === parentId);

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
  const [moveParentId, setMoveParentId] = useState(selected?.parentId ?? "");
  const [lifecycleIntent, setLifecycleIntent] =
    useState<LifecycleIntent | null>(null);
  const [manageResult, setManageResult] = useState<CatalogActionResult>(
    initialCatalogActionResult,
  );
  const [createResult, createAction, createPending] = useActionState(
    createCatalogCategoryAction,
    initialCatalogActionResult,
  );
  const [managePending, startManageTransition] = useTransition();
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const moveDialogRef = useRef<HTMLDialogElement>(null);
  const lifecycleDialogRef = useRef<HTMLDialogElement>(null);
  const lastDialogInvokerRef = useRef<HTMLElement | null>(null);
  const skipNextPopRef = useRef(false);
  const hasUnsavedChanges = dirtySections.size > 0;

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
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.href === window.location.href) return;
      if (window.confirm(labels.unsaved.message)) {
        setDirtySections(new Set());
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
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
    if (createResult.status !== "success" || !createResult.targetId) return;
    createDialogRef.current?.close();
    requestAnimationFrame(() => setMobileEditorOpen(true));
    router.push(`${catalogPath}?category=${createResult.targetId}`);
  }, [catalogPath, createResult, router]);

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
    lastDialogInvokerRef.current = document.activeElement as HTMLElement | null;
    setCreateParent({ id: parentId, name: parentName });
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
    const ordered = [...siblings];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const formData = new FormData();
    formData.set("locale", locale);
    formData.set("categoryId", categoryId);
    formData.set("expectedUpdatedAt", category.updatedAt);
    formData.set("intent", "reorder");
    formData.set(
      "categories",
      JSON.stringify(
        ordered.map((candidate, order) => ({
          id: candidate.id,
          sortOrder: order,
          expectedUpdatedAt: candidate.updatedAt,
        })),
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
      {!canManage ? <p className="dashboard-catalog-readonly">{labels.readOnly}</p> : null}
      <div
        className="dashboard-catalog-workspace"
        data-mobile-editor={selected && mobileEditorOpen ? "true" : "false"}
      >
        <aside className="dashboard-catalog-tree" aria-labelledby="catalog-tree-title">
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
                selectedId={selected?.id ?? null}
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
        <main className="dashboard-catalog-detail">
          <button
            type="button"
            className="dashboard-catalog-mobile-back"
            onClick={() => {
              if (!confirmDiscard()) return;
              setMobileEditorOpen(false);
            }}
          >
            {arrowIcon("back")}
            {labels.tree.back}
          </button>
          {selected ? (
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
        </main>
      </div>

      <dialog
        ref={createDialogRef}
        className="dashboard-catalog-dialog"
        aria-labelledby="catalog-create-title"
        aria-describedby="catalog-create-description"
        onClose={() => lastDialogInvokerRef.current?.focus()}
      >
        <form action={createAction} aria-busy={createPending}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="parentId" value={createParent.id ?? ""} />
          <h2 id="catalog-create-title">{labels.create.title}</h2>
          <p id="catalog-create-description">{labels.create.description}</p>
          <dl>
            <dt>{labels.create.parentLabel}</dt>
            <dd>{createParent.name}</dd>
          </dl>
          <ResultMessage result={createResult} labels={labels} />
          <label>
            <span>{labels.create.slug}</span>
            <input name="slug" required maxLength={120} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          </label>
          <label>
            <span>{labels.create.name}</span>
            <input name="name" required maxLength={200} />
          </label>
          <label>
            <span>{labels.create.introduction}</span>
            <textarea name="introduction" required maxLength={2000} rows={4} />
          </label>
          <div className="dashboard-catalog-dialog-actions">
            <button
              type="button"
              disabled={createPending}
              onClick={() => createDialogRef.current?.close()}
            >
              {labels.create.cancel}
            </button>
            <button type="submit" disabled={createPending}>
              {createPending ? labels.create.submitting : labels.create.submit}
            </button>
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
