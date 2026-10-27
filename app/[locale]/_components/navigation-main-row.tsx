import { NavigationBrand } from "./navigation-brand";
import type { NavigationProps } from "./navigation-model";
import { NavigationAccountPanel } from "./navigation-account-panel";
import { NavigationDesktopLinks } from "./navigation-desktop-links";
import { NavigationDesktopControls } from "./navigation-desktop-controls";
import { NavigationMobileActions } from "./navigation-mobile-actions";
import type { useNavigationController } from "./use-navigation-controller";
export function NavigationMainRow({
  props,
  state,
}: {
  props: NavigationProps;
  state: ReturnType<typeof useNavigationController>;
}) {
  const {
    locale,
    brandLabel,
    ctaLabel,
    cartLabel,
    menuLabel,
    closeMenuLabel,
    navigationLabel,
    languageLabel,
    themeLabel,
    user,
    signInLabel,
    signUpLabel,
    accountLabel,
    dashboardLabel,
    dashboardNavigationLabel,
    canViewDashboard,
    signOutLabel,
    signingOutLabel,
    accountMenuLabel,
    openAccountMenuLabel,
    closeAccountMenuLabel,
    languageNames,
  } = props;
  const {
    themeMode,
    cycleTheme,
    currentThemeLabel,
    activeSlug,
    homeRoute,
    interiorRoutes,
    signInHref,
    signUpHref,
    localizedRoute,
    isActive,
    menuOpen,
    setMenuOpen,
    profileOpen,
    setProfileOpen,
    logoutPending,
    logoutError,
    profilePanelRef,
    closeMenus,
    toggleProfile,
    handleSignOut,
    activeIndicator,
    languageIndicator,
    desktopNavItemRefs,
    languageItemRefs,
    count,
    ready,
  } = state;
  return (
    <div className="relative mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
      <NavigationBrand
        locale={locale}
        brandLabel={brandLabel}
        homeSlug={homeRoute.slug}
        isActive={isActive}
        closeMenus={closeMenus}
      />

      <NavigationMobileActions
        signedIn={Boolean(user)}
        profileOpen={profileOpen}
        openAccountMenuLabel={openAccountMenuLabel}
        closeAccountMenuLabel={closeAccountMenuLabel}
        toggleProfile={toggleProfile}
        ready={ready}
        count={count}
        cartLabel={cartLabel}
        locale={locale}
        activeSlug={activeSlug}
        closeMenus={closeMenus}
        menuOpen={menuOpen}
        menuLabel={menuLabel}
        closeMenuLabel={closeMenuLabel}
        setMenuOpen={setMenuOpen}
        setProfileOpen={setProfileOpen}
      />

      <NavigationDesktopLinks
        navigationLabel={navigationLabel}
        activeIndicator={activeIndicator}
        interiorRoutes={interiorRoutes}
        desktopNavItemRefs={desktopNavItemRefs}
        isActive={isActive}
        activeSlug={activeSlug}
        locale={locale}
        closeMenus={closeMenus}
      />

      <NavigationDesktopControls
        languageLabel={languageLabel}
        languageIndicator={languageIndicator}
        languageItemRefs={languageItemRefs}
        locale={locale}
        localizedRoute={localizedRoute}
        languageNames={languageNames}
        closeMenus={closeMenus}
        themeLabel={themeLabel}
        currentThemeLabel={currentThemeLabel}
        themeMode={themeMode}
        cycleTheme={cycleTheme}
        cartLabel={cartLabel}
        ready={ready}
        count={count}
        activeSlug={activeSlug}
        user={user}
        profileOpen={profileOpen}
        openAccountMenuLabel={openAccountMenuLabel}
        closeAccountMenuLabel={closeAccountMenuLabel}
        toggleProfile={toggleProfile}
        accountLabel={accountLabel}
        signInHref={signInHref}
        signUpHref={signUpHref}
        signInLabel={signInLabel}
        signUpLabel={signUpLabel}
        ctaLabel={ctaLabel}
      />
      {user && profileOpen ? (
        <NavigationAccountPanel
          user={user}
          locale={locale}
          activeSlug={activeSlug}
          profilePanelRef={profilePanelRef}
          closeMenus={closeMenus}
          logoutError={logoutError}
          logoutPending={logoutPending}
          onSignOut={handleSignOut}
          accountMenuLabel={accountMenuLabel}
          canViewDashboard={canViewDashboard}
          dashboardNavigationLabel={dashboardNavigationLabel}
          dashboardLabel={dashboardLabel}
          signingOutLabel={signingOutLabel}
          signOutLabel={signOutLabel}
        />
      ) : null}
    </div>
  );
}
