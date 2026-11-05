import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safePublicReturnPath } from "../_lib/return-paths";

export function useNavigationSession(
  locale: string,
  pathname: string,
  currentSearch: string,
  currentPath: string,
  signOutError: string,
) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const profileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const profilePanelRef = useRef<HTMLDivElement | null>(null);

  const closeMenus = () => {
    setMenuOpen(false);
    setProfileOpen(false);
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setMenuOpen(false);
      setProfileOpen(false);
    });
    return () => {
      active = false;
    };
  }, [pathname, currentSearch]);

  const toggleProfile = (trigger: HTMLButtonElement) => {
    profileTriggerRef.current = trigger;
    setLogoutError(null);
    setMenuOpen(false);
    setProfileOpen((open) => !open);
  };

  useEffect(() => {
    if (!profileOpen) return;

    const closeFromOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !profilePanelRef.current?.contains(target) &&
        !profileTriggerRef.current?.contains(target)
      ) {
        setProfileOpen(false);
      }
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      profileTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeFromOutsidePointer);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutsidePointer);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [profileOpen]);

  const handleSignOut = async () => {
    setLogoutPending(true);
    setLogoutError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setLogoutError(signOutError);
        return;
      }

      closeMenus();
      router.replace(safePublicReturnPath(currentPath, locale));
      router.refresh();
    } catch {
      setLogoutError(signOutError);
    } finally {
      setLogoutPending(false);
    }
  };
  return {
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
  };
}
