import Link from "next/link";
import { localizedPath } from "../_lib/routes";
export function NavigationBrand({
  locale,
  brandLabel,
  homeSlug,
  isActive,
  closeMenus,
}: {
  locale: string;
  brandLabel: string;
  homeSlug: string;
  isActive: (slug: string) => boolean;
  closeMenus: () => void;
}) {
  return (
    <Link
      className="site-brand group flex shrink-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
      href={localizedPath(locale)}
      aria-current={isActive(homeSlug) ? "page" : undefined}
      onClick={closeMenus}
    >
      <svg
        aria-hidden="true"
        className="site-accent size-8 transition-transform duration-300 group-hover:rotate-12"
        viewBox="0 0 32 32"
        fill="none"
      >
        <circle cx="16" cy="16" r="5" fill="currentColor" />
        <path
          d="M16 2.5v5M16 24.5v5M29.5 16h-5M7.5 16h-5M25.55 6.45l-3.54 3.54M9.99 22.01l-3.54 3.54M25.55 25.55l-3.54-3.54M9.99 9.99L6.45 6.45"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-[-0.03em]">
        {brandLabel}
      </span>
    </Link>
  );
}
