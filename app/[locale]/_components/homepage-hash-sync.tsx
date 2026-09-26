"use client";

import { useEffect } from "react";

const sections = ["", "residential", "business"] as const;

export function HomepageHashSync() {
  useEffect(() => {
    const elements = sections.map((id) =>
      id ? document.getElementById(id) : document.querySelector(".welcome-hero"),
    );

    const updateHash = (id: (typeof sections)[number]) => {
      const hash = id ? `#${id}` : "";
      if (window.location.hash !== hash) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!activeEntry) return;
        const activeIndex = elements.indexOf(activeEntry.target);
        if (activeIndex >= 0) updateHash(sections[activeIndex]);
      },
      { rootMargin: "-35% 0px -55%" },
    );

    elements.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const desktopQuery = window.matchMedia("(min-width: 48rem)");

    if (reducedMotionQuery.matches || !desktopQuery.matches) {
      return;
    }

    const titles = document.querySelectorAll<HTMLElement>(
      "[data-destination-title]",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.dataset.motionState = entry.isIntersecting
            ? "visible"
            : "hidden";
        });
      },
      { rootMargin: "0px 0px -15%", threshold: 0.15 },
    );

    titles.forEach((title) => observer.observe(title));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const mobileQuery = window.matchMedia("(max-width: 47.999rem)");

    if (reducedMotionQuery.matches || !mobileQuery.matches) {
      return;
    }

    const titles = document.querySelectorAll<HTMLElement>(
      "[data-destination-title]",
    );
    let animationFrame = 0;

    const updateTitles = () => {
      animationFrame = 0;
      const viewportHeight = window.innerHeight;

      titles.forEach((title) => {
        const bounds = title.getBoundingClientRect();
        const viewProgress = Math.min(
          1,
          Math.max(0, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)),
        );
        const travelProgress =
          viewProgress < 0.2
            ? 1 - viewProgress / 0.2
            : viewProgress > 0.8
              ? (viewProgress - 0.8) / 0.2
              : 0;
        const direction = title.classList.contains(
          "welcome-destination-title-from-right",
        )
          ? 1
          : -1;

        title.style.setProperty(
          "--destination-title-translate",
          `${direction * travelProgress * window.innerWidth * 1.1}px`,
        );
      });
    };

    const scheduleUpdate = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateTitles);
      }
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      titles.forEach((title) =>
        title.style.removeProperty("--destination-title-translate"),
      );
    };
  }, []);

  return null;
}
