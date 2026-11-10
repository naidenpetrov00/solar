"use client";

import { useCart } from "./cart-store";
import type { NavigationProps } from "./navigation-model";
import { useNavigationTheme } from "./use-navigation-theme";
import { useNavigationRoutes } from "./use-navigation-routes";
import { useNavigationIndicators } from "./use-navigation-indicators";
import { useNavigationSession } from "./use-navigation-session";
import { useNotificationCenter } from "./use-notification-center";

export function useNavigationController(props: NavigationProps) {
  const { locale, initialTheme, themeLight, themeDark, routes, signOutError } =
    props;
  const theme = useNavigationTheme(initialTheme, themeLight, themeDark);
  const route = useNavigationRoutes(locale, routes);
  const notificationCenter = useNotificationCenter(
    locale,
    props.notifications?.unread,
    props.webPush,
  );
  const session = useNavigationSession(
    locale,
    route.pathname,
    route.currentSearch,
    route.currentPath,
    signOutError,
    notificationCenter.closeWithoutFocus,
    notificationCenter.browserPush.cleanupForLogout,
  );
  const indicators = useNavigationIndicators(
    route.activeNavSlug,
    route.pathname,
    locale,
  );
  const { count, ready } = useCart();
  const toggleNotifications = (trigger: HTMLButtonElement) => {
    session.setMenuOpen(false);
    session.setProfileOpen(false);
    notificationCenter.toggle(trigger);
  };
  return {
    ...theme,
    ...route,
    ...session,
    ...indicators,
    count,
    ready,
    notificationCenter: {
      ...notificationCenter,
      toggle: toggleNotifications,
    },
  };
}
