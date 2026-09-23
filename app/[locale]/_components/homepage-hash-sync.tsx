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

  return null;
}
