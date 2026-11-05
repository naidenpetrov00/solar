import { catalogLocales } from "@/lib/catalog/model";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import type { ProductContentSectionProps } from "./product-content-model";
import { ProductContentLocalePanel } from "./product-content-locale-panel";
export function ProductContentSection(props: ProductContentSectionProps) {
  const { labels, languages, activeLocale, setActiveLocale, contentComplete } =
    props;
  return (
    <details className="dashboard-catalog-section" open>
      <summary>{labels.sections.content}</summary>
      <LocalizedEditorSwitch
        idPrefix="product-content"
        variant="tabs"
        activeLocale={activeLocale}
        onChange={setActiveLocale}
        languageNames={languages}
        statusByLocale={contentComplete}
        completeLabel={labels.editor.complete}
        incompleteLabel={labels.editor.incomplete}
        ariaLabel={labels.sections.content}
      />
      {catalogLocales.map((contentLocale) => (
        <ProductContentLocalePanel
          key={contentLocale}
          contentLocale={contentLocale}
          props={props}
        />
      ))}
    </details>
  );
}
