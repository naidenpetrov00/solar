import Link from "next/link";
import type { RefObject } from "react";
import { localizedPath } from "../_lib/routes";
import type { NavigationRoute } from "./navigation-model";

export function NavigationDesktopLinks({
  navigationLabel,
  activeIndicator,
  interiorRoutes,
  desktopNavItemRefs,
  isActive,
  activeSlug,
  locale,
  closeMenus,
}: {
  navigationLabel: string;
  activeIndicator: { left: number; width: number };
  interiorRoutes: NavigationRoute[];
  desktopNavItemRefs: RefObject<Record<string, HTMLAnchorElement | null>>;
  isActive: (slug: string) => boolean;
  activeSlug: string;
  locale: string;
  closeMenus: () => void;
}) {
  return (
    <nav aria-label={navigationLabel} className="hidden xl:block">
      <ul className="relative flex items-center gap-1">
        <span
          aria-hidden="true"
          className="site-accent pointer-events-none absolute bottom-0 left-0 z-20 h-0.5 rounded-full bg-current shadow-[0_0_12px_rgba(252,211,77,0.35)] transition-[transform,width] duration-500 ease-out"
          style={{
            width: activeIndicator.width,
            transform: `translateX(${activeIndicator.left}px)`,
          }}
        />
        {interiorRoutes.map((route) => (
          <li key={route.slug}>
            <Link
              ref={(element) => {
                desktopNavItemRefs.current[route.slug] = element;
              }}
              className="site-nav-link relative z-10 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              data-active={isActive(route.slug)}
              href={localizedPath(locale, route.slug)}
              aria-current={
                activeSlug === route.slug
                  ? "page"
                  : isActive(route.slug)
                    ? "location"
                    : undefined
              }
              onClick={closeMenus}
            >
              {route.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
