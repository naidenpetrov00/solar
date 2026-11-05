import Link from "next/link";

export type CatalogBreadcrumb = {
  label: string;
  href?: string;
};

export function CatalogBreadcrumbs({
  label,
  items,
}: {
  label: string;
  items: CatalogBreadcrumb[];
}) {
  return (
    <nav className="catalog-breadcrumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li
            key={`${item.href ?? "current"}-${item.label}`}
            aria-current={index === items.length - 1 ? "page" : undefined}
          >
            {item.href && index !== items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              item.label
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
