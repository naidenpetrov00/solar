import { useEffect, useState } from "react";

export function useNavigationTheme(
  initialTheme: "light" | "dark" | undefined,
  themeLight: string,
  themeDark: string,
) {
  const [themeMode, setThemeMode] = useState<"light" | "dark">(
    initialTheme ?? "light",
  );

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("solar-theme");
    } catch {
      // Use the device preference when storage is unavailable.
    }

    if (savedTheme === "light" || savedTheme === "dark") {
      document.documentElement.dataset.theme = savedTheme;
      document.cookie = `solar-theme=${savedTheme}; Max-Age=31536000; Path=/; SameSite=Lax`;
      const frame = requestAnimationFrame(() => setThemeMode(savedTheme));
      return () => cancelAnimationFrame(frame);
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateFromSystem = () =>
      setThemeMode(mediaQuery.matches ? "dark" : "light");
    const frame = requestAnimationFrame(updateFromSystem);
    mediaQuery.addEventListener("change", updateFromSystem);

    return () => {
      cancelAnimationFrame(frame);
      mediaQuery.removeEventListener("change", updateFromSystem);
    };
  }, []);

  const cycleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("solar-theme", nextTheme);
    document.cookie = `solar-theme=${nextTheme}; Max-Age=31536000; Path=/; SameSite=Lax`;
  };

  const currentThemeLabel = themeMode === "light" ? themeLight : themeDark;
  return { themeMode, cycleTheme, currentThemeLabel };
}
