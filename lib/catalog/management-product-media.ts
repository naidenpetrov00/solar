import "server-only";
import {
  assertUniqueLocales,
  normalizeMediaReference,
  validateNonNegativeInteger,
} from "@/lib/catalog/model";
import { type CatalogProductMediaInput } from "@/lib/catalog/catalog-inputs";
import { normalizeRequiredText } from "@/lib/catalog/text-validation";
import { CatalogManagementError } from "@/lib/catalog/management-errors";

export function normalizeMedia(media: CatalogProductMediaInput[]) {
  const references = new Set<string>();
  const orders = new Set<number>();
  let primaryCount = 0;
  let socialCount = 0;

  return media.map((item) => {
    const reference = normalizeMediaReference(item.reference);
    const displayOrder = validateNonNegativeInteger(item.displayOrder);
    assertUniqueLocales(item.translations);

    if (references.has(reference) || orders.has(displayOrder)) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    references.add(reference);
    orders.add(displayOrder);
    primaryCount += item.isPrimary ? 1 : 0;
    socialCount += item.isSocialImage ? 1 : 0;

    if (primaryCount > 1 || socialCount > 1) {
      throw new CatalogManagementError("INVALID_INPUT");
    }

    return {
      reference,
      displayOrder,
      isPrimary: item.isPrimary,
      isSocialImage: item.isSocialImage,
      translations: item.translations.map((translation) => ({
        locale: translation.locale,
        altText: normalizeRequiredText(translation.altText, 500),
      })),
    };
  });
}
