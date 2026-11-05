import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import type { CatalogLabels } from "./catalog-labels";
import type { SpecificationDraft } from "./catalog-editor-model";

export function SpecificationLanguage({
  labels,
  specifications,
  activeLocale,
  onChange,
}: {
  labels: CatalogLabels;
  specifications: SpecificationDraft[];
  activeLocale: CatalogLocale;
  onChange: (locale: CatalogLocale) => void;
}) {
  const statusByLocale = Object.fromEntries(
    catalogLocales.map((locale) => [
      locale,
      specifications.every(
        (specification) =>
          Boolean(specification.labels[locale].trim()) &&
          (specification.valueType !== "selection" ||
            (specification.options.length > 0 &&
              specification.options.every((option) =>
                Boolean(option.labels[locale].trim()),
              ))),
      ),
    ]),
  ) as Record<CatalogLocale, boolean>;

  return (
    <div className="dashboard-catalog-specification-language">
      <div>
        <strong>{labels.specifications.languageLabel}</strong>
        <p>{labels.specifications.languageHelp}</p>
      </div>
      <LocalizedEditorSwitch
        idPrefix="catalog-specifications"
        variant="selector"
        activeLocale={activeLocale}
        onChange={onChange}
        languageNames={labels.languages}
        statusByLocale={statusByLocale}
        completeLabel={labels.editor.complete}
        incompleteLabel={labels.editor.incomplete}
        ariaLabel={labels.specifications.languageLabel}
      />
    </div>
  );
}
