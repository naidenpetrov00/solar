import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";
import type {
  ManagedCatalogDocument,
  ManagedCatalogImage,
  ManagedCatalogProductAssetSlice,
} from "@/lib/catalog/management-asset-types";
import type { DocumentDraft, MediaDraft } from "./product-editor-model";

export type ProductAssetDraftSlice = {
  images: MediaDraft[];
  documents: DocumentDraft[];
};

export function mediaDrafts(images: ManagedCatalogImage[]): MediaDraft[] {
  return images.map((item) => ({
    clientId: item.id,
    source: item.source,
    reference: item.reference,
    url: item.url,
    originalFilename: item.originalFilename,
    byteSize: item.byteSize,
    width: item.width,
    height: item.height,
    isPrimary: item.isPrimary,
    isSocialImage: item.isSocialImage,
    translations: Object.fromEntries(
      catalogLocales.map((locale) => [
        locale,
        item.translations.find((translation) => translation.locale === locale)
          ?.altText ?? "",
      ]),
    ) as Record<CatalogLocale, string>,
  }));
}

export function documentDrafts(
  documents: ManagedCatalogDocument[],
): DocumentDraft[] {
  return documents.map((item) => ({
    clientId: item.id,
    url: item.url,
    originalFilename: item.originalFilename,
    byteSize: item.byteSize,
    translations: Object.fromEntries(
      catalogLocales.map((locale) => {
        const translation = item.translations.find(
          (candidate) => candidate.locale === locale,
        );
        return [
          locale,
          {
            title: translation?.title ?? "",
            description: translation?.description ?? "",
          },
        ];
      }),
    ) as DocumentDraft["translations"],
  }));
}

export function draftSlice(
  value: ManagedCatalogProductAssetSlice,
): ProductAssetDraftSlice {
  return {
    images: mediaDrafts(value.images),
    documents: documentDrafts(value.documents),
  };
}

export function sameDraftSection<T>(left: T[], right: T[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function mergeFinalizedDraft<T extends { clientId: string }>(
  current: T[],
  baseline: T[],
  server: T[],
) {
  const knownIds = new Set(baseline.map((item) => item.clientId));
  const currentIds = new Set(current.map((item) => item.clientId));
  const additions = server.filter(
    (item) => !knownIds.has(item.clientId) && !currentIds.has(item.clientId),
  );
  return additions.length ? [...current, ...additions] : current;
}
