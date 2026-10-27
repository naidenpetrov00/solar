"use client";

import { useCart } from "./cart-store";
import type { NavigationProps } from "./navigation-model";
import { useNavigationTheme } from "./use-navigation-theme";
import { useNavigationRoutes } from "./use-navigation-routes";
import { useNavigationIndicators } from "./use-navigation-indicators";
import { useNavigationSession } from "./use-navigation-session";

export function useNavigationController(props: NavigationProps) {
  const { locale, initialTheme, themeLight, themeDark, routes, signOutError } =
    props;
  const theme = useNavigationTheme(initialTheme, themeLight, themeDark);
  const route = useNavigationRoutes(locale, routes);
  const session = useNavigationSession(
    locale,
    route.pathname,
    route.currentSearch,
    route.currentPath,
    signOutError,
  );
  const indicators = useNavigationIndicators(
    route.activeNavSlug,
    route.pathname,
    locale,
  );
  const { count, ready } = useCart();
  return { ...theme, ...route, ...session, ...indicators, count, ready };
}
