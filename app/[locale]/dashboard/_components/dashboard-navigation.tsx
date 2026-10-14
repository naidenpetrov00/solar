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

  return (
    <nav aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.href}
          className="dashboard-rail-link"
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
