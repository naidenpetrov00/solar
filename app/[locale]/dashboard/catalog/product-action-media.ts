import { catalogLocales } from "@/lib/catalog/model";
import type { CatalogProductMediaInput } from "@/lib/catalog/catalog-inputs";

export function parseMedia(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const media: CatalogProductMediaInput[] = [];
  for (const [displayOrder, candidate] of parsed.entries()) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      !("reference" in candidate) ||
      typeof candidate.reference !== "string" ||
      !("isPrimary" in candidate) ||
      typeof candidate.isPrimary !== "boolean" ||
      !("isSocialImage" in candidate) ||
      typeof candidate.isSocialImage !== "boolean" ||
      !("translations" in candidate) ||
      typeof candidate.translations !== "object" ||
      candidate.translations === null
    )
      return null;
    const translations: CatalogProductMediaInput["translations"] = [];
    for (const locale of catalogLocales) {
      const altText = (candidate.translations as Record<string, unknown>)[
        locale
      ];
      if (typeof altText !== "string") return null;
      if (altText.trim()) translations.push({ locale, altText });
    }
    media.push({
      reference: candidate.reference,
      displayOrder,
      isPrimary: candidate.isPrimary,
      isSocialImage: candidate.isSocialImage,
      translations,
    });
  }
  return media;
}
