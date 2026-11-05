"use client";

import { type CatalogLocale } from "@/lib/catalog/model";
import { type CategoryContentDraft } from "./catalog-editor-model";
import { type CatalogLabels } from "./catalog-labels";
import { effectiveCategorySlug } from "./catalog-editor-actions";
import { Field, CharacterCount } from "./catalog-editor-fields";

export function LocaleContentPanel({
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
            <strong>{values.name || labels.seoPreview.emptyTitle}</strong>
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
