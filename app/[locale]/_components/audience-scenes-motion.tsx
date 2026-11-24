"use client";

import { useEffect } from "react";

export function AudienceScenesMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("[data-audience-page]");
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: no-preference)",
    );

    if (
      !page ||
      !motionQuery.matches ||
      !("IntersectionObserver" in window) ||
      !("CSS" in window) ||
      !window.CSS.supports("clip-path", "inset(0)")
    ) {
      return;
    }

    const scenes = Array.from(
      page.querySelectorAll<HTMLElement>("[data-audience-scene]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-motion", "visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.16 },
    );

    for (const scene of scenes) {
      scene.setAttribute("data-motion", "ready");
      observer.observe(scene);
    }

    return () => {
      observer.disconnect();
      for (const scene of scenes) scene.removeAttribute("data-motion");
    };
  }, []);

  return null;
}
