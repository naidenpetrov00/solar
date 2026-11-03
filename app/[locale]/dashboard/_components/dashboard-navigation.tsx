"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardNavigationItem = {
  href: string;
  label: string;
};

export function DashboardNavigation({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: DashboardNavigationItem[];
}) {
  const pathname = usePathname();
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .toSorted((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <nav aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.href}
          className="dashboard-rail-link"
          href={item.href}
          aria-current={item.href === activeHref ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
