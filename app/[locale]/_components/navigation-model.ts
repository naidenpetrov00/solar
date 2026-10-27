export type NavigationRoute = {
  slug: string;
  label: string;
};

export type NavigationUser = {
  name: string;
  email: string;
};

export type NavigationProps = {
  locale: string;
  brandLabel: string;
  ctaLabel: string;
  cartLabel: string;
  menuLabel: string;
  closeMenuLabel: string;
  navigationLabel: string;
  languageLabel: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  user?: NavigationUser;
  signInLabel: string;
  signUpLabel: string;
  accountLabel: string;
  dashboardLabel: string;
  dashboardNavigationLabel: string;
  canViewDashboard: boolean;
  signOutLabel: string;
  signingOutLabel: string;
  signOutError: string;
  accountMenuLabel: string;
  openAccountMenuLabel: string;
  closeAccountMenuLabel: string;
  initialTheme?: "light" | "dark";
  languageNames: Record<string, string>;
  routes: NavigationRoute[];
};

export const navigationLocales = ["bg", "en", "tr", "uk"] as const;
