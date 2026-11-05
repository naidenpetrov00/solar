import { useLayoutEffect, useRef, useState } from "react";

export function useNavigationIndicators(
  activeNavSlug: string | null,
  pathname: string,
  locale: string,
) {
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });
  const [languageIndicator, setLanguageIndicator] = useState({
    left: 0,
    width: 0,
  });
  const desktopNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>(
    {},
  );
  const languageItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useLayoutEffect(() => {
    const activeLink = activeNavSlug
      ? desktopNavItemRefs.current[activeNavSlug]
      : null;

    if (!activeLink) {
      setActiveIndicator((indicator) => ({ ...indicator, width: 0 }));
      return;
    }

    const updateIndicator = () => {
      setActiveIndicator({
        left: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(activeLink);

    return () => observer.disconnect();
  }, [activeNavSlug, pathname]);

  useLayoutEffect(() => {
    const activeLink = languageItemRefs.current[locale];

    if (!activeLink) return;

    const updateIndicator = () => {
      setLanguageIndicator({
        left: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    observer.observe(activeLink);

    return () => observer.disconnect();
  }, [locale]);
  return {
    activeIndicator,
    languageIndicator,
    desktopNavItemRefs,
    languageItemRefs,
  };
}
