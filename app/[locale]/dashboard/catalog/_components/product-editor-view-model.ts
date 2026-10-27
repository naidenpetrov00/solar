import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type { ManagedCatalogProductDetail } from "@/lib/catalog/management-product-types";
import type { ProductActionResult } from "../product-action-model";
import type { Props } from "./product-editor-model";
import type { FieldCopy } from "./product-labels";
import type { useProductDraft } from "./use-product-draft";

type Draft = ReturnType<typeof useProductDraft>;

export function productEditorViewModel(
  props: Props,
  detail: ManagedCatalogProductDetail | null,
  draft: Draft,
  saveResult: ProductActionResult,
  creationSubmissionLocked: boolean,
) {
  const { labels, categoryConfigurations, categoryId, canManage } = props;
  const {
    primaryCategoryId,
    excludedSpecificationIds,
    translations,
    customSpecifications,
  } = draft;
  const initialPrimaryCategoryId = detail?.primaryCategoryId ?? categoryId;
  const configuration = categoryConfigurations.find(
    (item) => item.categoryId === primaryCategoryId,
  );
  const inherited = configuration?.specifications ?? [];
  const visibleInheritedSpecifications = inherited.filter(
    ({ id }) => !excludedSpecificationIds.includes(id),
  );
  const removedInheritedSpecifications = inherited.filter(({ id }) =>
    excludedSpecificationIds.includes(id),
  );
  const titleGuidance = configuration?.titleGuidance ?? [];
  const contentComplete = Object.fromEntries(
    catalogLocales.map((locale) => {
      const content = translations[locale];
      return [
        locale,
        Boolean(
          content.title.trim() &&
          content.shortDescription.trim() &&
          content.fullDescription.trim(),
        ),
      ];
    }),
  ) as Record<CatalogLocale, boolean>;
  const errors = saveResult.fieldErrors ?? {};
  const editorDisabled = !canManage || (!detail && creationSubmissionLocked);
  const slugError = (field: "bgSlug" | "enSlug" | "trSlug" | "ukSlug") =>
    errors[field]
      ? errors[field] === "CONFLICT"
        ? labels.validation.conflict
        : labels.validation.slug
      : undefined;
  const slugErrors: Partial<Record<CatalogLocale, string>> = {
    bg: slugError("bgSlug"),
    en: slugError("enSlug"),
    tr: slugError("trSlug"),
    uk: slugError("ukSlug"),
  };
  const slugCopyByLocale: Record<CatalogLocale, FieldCopy> = {
    bg: labels.fields.bgSlug,
    en: labels.fields.enSlug,
    tr: labels.fields.trSlug,
    uk: labels.fields.ukSlug,
  };
  const mpnError = errors.mpn ? labels.validation.required : undefined;
  const categoryError =
    errors.primaryCategoryId || errors.additionalCategoryIds
      ? labels.validation.invalid
      : undefined;
  const bgTitleError = errors["content.bg.title"]
    ? labels.validation.required
    : undefined;
  const serializeConfiguration = JSON.stringify({
    excludedSpecificationIds,
    customSpecifications: customSpecifications.map(
      (specification, displayOrder) => ({
        id: specification.id,
        valueType: specification.valueType,
        unit: specification.unit,
        displayOrder,
        translations: catalogLocales.map((locale) => ({
          locale,
          label: specification.labels[locale],
        })),
        options: specification.options.map((option, optionOrder) => ({
          id: option.id,
          displayOrder: optionOrder,
          translations: catalogLocales.map((locale) => ({
            locale,
            label: option.labels[locale],
          })),
        })),
        value: specification.value,
      }),
    ),
  });

  return {
    initialPrimaryCategoryId,
    visibleInheritedSpecifications,
    removedInheritedSpecifications,
    titleGuidance,
    contentComplete,
    errors,
    editorDisabled,
    slugErrors,
    slugCopyByLocale,
    mpnError,
    categoryError,
    bgTitleError,
    serializeConfiguration,
  };
}
