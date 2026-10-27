import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import { LocalizedEditorSwitch } from "../../_components/localized-editor-switch";
import { DashboardButton, emptyLocalizedText } from "./product-editor-draft";
import { ProductMediaItem } from "./product-media-item";
import type { ProductMediaSectionProps } from "./product-media-model";
export function ProductMediaSection(props: ProductMediaSectionProps) {
  const {
    labels,
    languages,
    editorDisabled,
    markDirty,
    activeLocale,
    setActiveLocale,
    media,
    setMedia,
  } = props;
  return (
    <details className="dashboard-catalog-section">
      <summary>{labels.sections.media}</summary>
      <LocalizedEditorSwitch
        idPrefix="product-media"
        variant="selector"
        activeLocale={activeLocale}
        onChange={setActiveLocale}
        languageNames={languages}
        statusByLocale={
          Object.fromEntries(
            catalogLocales.map((contentLocale) => [
              contentLocale,
              media.length > 0 &&
                media.every((item) => item.translations[contentLocale].trim()),
            ]),
          ) as Record<CatalogLocale, boolean>
        }
        completeLabel={labels.editor.complete}
        incompleteLabel={labels.editor.incomplete}
        ariaLabel={labels.media.languageLabel}
      />
      <fieldset
        disabled={editorDisabled}
        className="dashboard-catalog-product-fieldset"
      >
        {media.length === 0 ? (
          <p>{labels.media.empty}</p>
        ) : (
          <div className="dashboard-catalog-media-list">
            {media.map((item, index) => (
              <ProductMediaItem
                key={item.clientId}
                item={item}
                index={index}
                props={props}
              />
            ))}
          </div>
        )}
        <DashboardButton
          type="button"
          onClick={() => {
            setMedia((current) => [
              ...current,
              {
                clientId: crypto.randomUUID(),
                reference: "",
                isPrimary: current.length === 0,
                isSocialImage: false,
                translations: emptyLocalizedText(),
              },
            ]);
            markDirty("media");
          }}
        >
          {labels.media.add}
        </DashboardButton>
      </fieldset>
    </details>
  );
}
