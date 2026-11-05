import Link from "next/link";
import type { RefObject } from "react";
import {
  navigationLocales as locales,
  type NavigationProps,
} from "./navigation-model";
export function NavigationDesktopLanguageSelector({
  languageLabel,
  languageIndicator,
  languageItemRefs,
  locale,
  localizedRoute,
  languageNames,
  closeMenus,
}: {
  languageLabel: string;
  languageIndicator: { left: number; width: number };
  languageItemRefs: RefObject<Record<string, HTMLAnchorElement | null>>;
  locale: string;
  localizedRoute: (targetLocale: string) => string;
  languageNames: NavigationProps["languageNames"];
  closeMenus: () => void;
}) {
  return (
    <nav aria-label={languageLabel}>
      <ul className="site-divider relative flex items-center gap-1 border-r pr-3">
        <span
          aria-hidden="true"
          className="site-active-surface pointer-events-none absolute left-0 top-0 z-0 h-10 rounded-md transition-[transform,width] duration-500 ease-out"
          style={{
            width: languageIndicator.width,
            transform: `translateX(${languageIndicator.left}px)`,
          }}
        />
        {locales.map((targetLocale) => (
          <li key={targetLocale}>
            <Link
              ref={(element) => {
                languageItemRefs.current[targetLocale] = element;
              }}
              className="site-language relative z-10 inline-flex min-h-10 items-center rounded px-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              data-active={targetLocale === locale}
              href={localizedRoute(targetLocale)}
              aria-current={targetLocale === locale ? "page" : undefined}
              aria-label={languageNames[targetLocale]}
              onClick={closeMenus}
            >
              {targetLocale}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
