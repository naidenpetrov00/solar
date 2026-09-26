"use client";

import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

const scrollDuration = 900;

type HomepageDestinationLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "href" | "onClick"
> & {
  children: ReactNode;
  className: string;
  sectionId: "residential" | "business";
};

const easeOutQuart = (progress: number) => 1 - (1 - progress) ** 4;

export function HomepageDestinationLink({
  children,
  className,
  sectionId,
  ...anchorProps
}: HomepageDestinationLinkProps) {
  const cancelScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelScrollRef.current?.(), []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const target = document.getElementById(sectionId);

    if (!target) {
      return;
    }

    event.preventDefault();
    cancelScrollRef.current?.();

    const root = document.documentElement;
    const originalScrollBehavior = root.style.scrollBehavior;
    const scrollMargin = Number.parseFloat(
      window.getComputedStyle(target).scrollMarginBlockStart,
    );
    const startPosition = window.scrollY;
    const maximumScrollPosition = Math.max(
      0,
      root.scrollHeight - window.innerHeight,
    );
    const targetPosition = Math.min(
      maximumScrollPosition,
      Math.max(
        0,
        startPosition +
          target.getBoundingClientRect().top -
          (Number.isFinite(scrollMargin) ? scrollMargin : 0),
      ),
    );
    const startedAt = performance.now();
    let animationFrame = 0;

    root.style.scrollBehavior = "auto";

    const removeInterruptionListeners = () => {
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("keydown", interrupt);
    };

    const cancel = () => {
      window.cancelAnimationFrame(animationFrame);
      removeInterruptionListeners();
      root.style.scrollBehavior = originalScrollBehavior;

      if (cancelScrollRef.current === cancel) {
        cancelScrollRef.current = null;
      }
    };

    const interrupt = () => cancel();

    const complete = () => {
      cancel();
      window.history.pushState(null, "", `#${sectionId}`);
    };

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / scrollDuration);
      const position =
        startPosition +
        (targetPosition - startPosition) * easeOutQuart(progress);

      window.scrollTo(0, position);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
        return;
      }

      complete();
    };

    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    cancelScrollRef.current = cancel;
    animationFrame = window.requestAnimationFrame(step);
  };

  return (
    <a
      {...anchorProps}
      className={className}
      href={`#${sectionId}`}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
