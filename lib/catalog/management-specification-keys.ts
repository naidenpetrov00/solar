import "server-only";
import { randomUUID } from "node:crypto";
import { validateStableKey } from "@/lib/catalog/text-validation";
import { type CatalogSpecificationEditorInput } from "@/lib/catalog/management-category-types";

const bulgarianTransliteration: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "y",
  ю: "yu",
  я: "ya",
};

function generatedStableKeySource(value: string) {
  const transliterated = Array.from(value.trim().toLocaleLowerCase("bg-BG"))
    .map((character) => bulgarianTransliteration[character] ?? character)
    .join("");

  return transliterated
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function uniqueGeneratedStableKey(
  label: string,
  reserved: Set<string>,
  fallbackPrefix: "specification" | "option",
) {
  const source =
    generatedStableKeySource(label) ||
    `${fallbackPrefix}-${randomUUID().slice(0, 8)}`;
  let suffix = 1;
  let candidate = source;

  while (reserved.has(candidate)) {
    suffix += 1;
    const suffixText = `-${suffix}`;
    candidate = `${source.slice(0, 80 - suffixText.length).replace(/-+$/g, "")}${suffixText}`;
  }

  reserved.add(candidate);
  return validateStableKey(candidate);
}

export function bulgarianSpecificationLabel(
  translations: CatalogSpecificationEditorInput["translations"],
) {
  return translations.find(({ locale }) => locale === "bg")?.label.trim() ?? "";
}
