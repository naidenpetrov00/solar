"use client";

import { useEffect } from "react";

export function HomepageDirectionsMotion() {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");

    if (
      !motionQuery.matches ||
      !("IntersectionObserver" in window) ||
      !("CSS" in window) ||
      !window.CSS.supports("clip-path", "inset(0)")
    ) {
      return;
    }

    const scenes = Array.from(
      document.querySelectorAll<HTMLElement>(".welcome-direction"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          entry.target.classList.add("welcome-direction--visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );

    for (const scene of scenes) {
      scene.classList.add("welcome-direction--motion-ready");
      observer.observe(scene);
    }

    return () => {
      observer.disconnect();
      for (const scene of scenes) {
        scene.classList.remove(
          "welcome-direction--motion-ready",
          "welcome-direction--visible",
        );
      }
    };
  }, []);

  return null;
}
