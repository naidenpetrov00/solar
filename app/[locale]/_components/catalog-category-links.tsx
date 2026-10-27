import Link from "next/link";
import type { PublicCatalogCategory } from "@/lib/catalog/public-types";
import { localizedPath } from "../_lib/routes";

export function Arrow() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function CategoryLinks({
  categories,
  locale,
  heading,
  id,
}: {
  categories: PublicCatalogCategory[];
  locale: string;
  heading: string;
  id: string;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="catalog-category-index" aria-labelledby={id}>
      <h2 id={id}>{heading}</h2>
      <div>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={localizedPath(locale, `shop/${category.path}`)}
          >
            <span>{category.name}</span>
            <p>{category.introduction}</p>
            <Arrow />
          </Link>
        ))}
      </div>
    </section>
  );
}
