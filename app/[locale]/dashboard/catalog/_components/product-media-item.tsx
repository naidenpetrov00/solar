import { DashboardButton } from "./product-editor-draft";
import { Field } from "./product-editor-fields";
import type { ProductMediaSectionProps } from "./product-media-model";
export function ProductMediaItem({
  item,
  index,
  props,
}: {
  item: ProductMediaSectionProps["media"][number];
  index: number;
  props: ProductMediaSectionProps;
}) {
  const { labels, activeLocale, setMedia, media, markDirty } = props;
  return (
    <section
      key={item.clientId}
      className="dashboard-catalog-media-item"
      aria-label={`${labels.sections.media} ${index + 1}`}
    >
      <Field
        id={`product-media-reference-${item.clientId}`}
        copy={labels.fields.mediaReference}
      >
        <input
          id={`product-media-reference-${item.clientId}`}
          value={item.reference}
          onChange={(event) => {
            setMedia((current) =>
              current.map((candidate) =>
                candidate.clientId === item.clientId
                  ? { ...candidate, reference: event.target.value }
                  : candidate,
              ),
            );
            markDirty("media");
          }}
        />
      </Field>
      <Field
        id={`product-media-alt-${item.clientId}`}
        copy={labels.fields.altText}
      >
        <input
          id={`product-media-alt-${item.clientId}`}
          value={item.translations[activeLocale]}
          onChange={(event) => {
            setMedia((current) =>
              current.map((candidate) =>
                candidate.clientId === item.clientId
                  ? {
                      ...candidate,
                      translations: {
                        ...candidate.translations,
                        [activeLocale]: event.target.value,
                      },
                    }
                  : candidate,
              ),
            );
            markDirty("media");
          }}
        />
      </Field>
      <div className="dashboard-catalog-media-flags">
        <label>
          <input
            type="radio"
            name="primaryMedia"
            checked={item.isPrimary}
            onChange={() => {
              setMedia((current) =>
                current.map((candidate) => ({
                  ...candidate,
                  isPrimary: candidate.clientId === item.clientId,
                })),
              );
              markDirty("media");
            }}
          />{" "}
          {labels.media.primary}
        </label>
        <label>
          <input
            type="checkbox"
            checked={item.isSocialImage}
            onChange={(event) => {
              setMedia((current) =>
                current.map((candidate) => ({
                  ...candidate,
                  isSocialImage:
                    candidate.clientId === item.clientId
                      ? event.target.checked
                      : false,
                })),
              );
              markDirty("media");
            }}
          />{" "}
          {labels.media.social}
        </label>
      </div>
      <div className="dashboard-catalog-item-controls">
        <DashboardButton
          type="button"
          disabled={index === 0}
          onClick={() => {
            setMedia((current) => {
              const next = [...current];
              [next[index - 1], next[index]] = [next[index], next[index - 1]];
              return next;
            });
            markDirty("media");
          }}
        >
          {labels.media.moveUp}
        </DashboardButton>
        <DashboardButton
          type="button"
          disabled={index === media.length - 1}
          onClick={() => {
            setMedia((current) => {
              const next = [...current];
              [next[index], next[index + 1]] = [next[index + 1], next[index]];
              return next;
            });
            markDirty("media");
          }}
        >
          {labels.media.moveDown}
        </DashboardButton>
        <DashboardButton
          type="button"
          onClick={() => {
            setMedia((current) =>
              current.filter(
                (candidate) => candidate.clientId !== item.clientId,
              ),
            );
            markDirty("media");
          }}
        >
          {labels.media.remove}
        </DashboardButton>
      </div>
    </section>
  );
}
