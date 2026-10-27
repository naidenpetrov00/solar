"use client";
import type { NavigationProps } from "./navigation-model";
import { NavigationMainRow } from "./navigation-main-row";
import { NavigationMobileMenu } from "./navigation-mobile-menu";
import { useNavigationController } from "./use-navigation-controller";
export function Navigation(props: NavigationProps) {
  const state = useNavigationController(props);
  const {
    locale,
    navigationLabel,
    user,
    signInLabel,
    signUpLabel,
    themeLabel,
    ctaLabel,
    languageLabel,
    languageNames,
  } = props;
  const {
    isHomePage,
    menuOpen,
    interiorRoutes,
    isActive,
    activeSlug,
    closeMenus,
    signInHref,
    signUpHref,
    cycleTheme,
    currentThemeLabel,
    themeMode,
    localizedRoute,
  } = state;
  return (
    <header
      className={
        "site-header border-b " + (isHomePage ? "site-header-overlay" : "")
      }
      data-overlay={isHomePage ? "true" : undefined}
    >
      <NavigationMainRow props={props} state={state} />
      <NavigationMobileMenu
        menuOpen={menuOpen}
        navigationLabel={navigationLabel}
        interiorRoutes={interiorRoutes}
        isActive={isActive}
        locale={locale}
        activeSlug={activeSlug}
        closeMenus={closeMenus}
        signedIn={Boolean(user)}
        signInHref={signInHref}
        signUpHref={signUpHref}
        signInLabel={signInLabel}
        signUpLabel={signUpLabel}
        cycleTheme={cycleTheme}
        themeLabel={themeLabel}
        currentThemeLabel={currentThemeLabel}
        themeMode={themeMode}
        ctaLabel={ctaLabel}
        languageLabel={languageLabel}
        localizedRoute={localizedRoute}
        languageNames={languageNames}
      />
    </header>
  );
}
