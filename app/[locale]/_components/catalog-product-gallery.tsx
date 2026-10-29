"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/button";
import { CatalogMedia } from "./catalog-media";

export type CatalogProductGalleryItem = {
  reference: string;
  altText: string;
  source?: "managed" | "legacy";
  width?: number | null;
  height?: number | null;
};

type Props = {
  media: CatalogProductGalleryItem[];
  labels: {
    gallery: string;
    previousImage: string;
    nextImage: string;
    imagePosition: string;
    selectImage: string;
  };
};

const formatPosition = (template: string, current: number, total: number) =>
  template
    .replace("{{current}}", String(current))
    .replace("{{total}}", String(total));

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={direction === "previous" ? "M15 5 8 12l7 7" : "m9 5 7 7-7 7"}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CatalogProductGallery({ media, labels }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  const total = media.length;
  const safeIndex = Math.min(activeIndex, Math.max(total - 1, 0));
  const activeMedia = media[safeIndex];

  if (!activeMedia) return null;

  const showPrevious = () =>
    setActiveIndex((current) => (current - 1 + total) % total);
  const showNext = () =>
    setActiveIndex((current) => (current + 1) % total);

  return (
    <section
      className="catalog-product-gallery"
      aria-label={labels.gallery}
    >
      <div
        className="catalog-product-gallery-viewport"
        onPointerDown={(event) => {
          if (event.pointerType === "touch" || event.pointerType === "pen") {
            gestureStart.current = { x: event.clientX, y: event.clientY };
          }
        }}
        onPointerUp={(event) => {
          const start = gestureStart.current;
          gestureStart.current = null;
          if (!start || total < 2) return;
          const horizontalDistance = event.clientX - start.x;
          const verticalDistance = event.clientY - start.y;
          if (
            Math.abs(horizontalDistance) < 48 ||
            Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
          ) return;
          if (horizontalDistance > 0) showPrevious();
          else showNext();
        }}
        onPointerCancel={() => {
          gestureStart.current = null;
        }}
      >
        <CatalogMedia
          key={activeMedia.reference}
          reference={activeMedia.reference}
          altText={activeMedia.altText}
          className="catalog-product-gallery-image"
          source={activeMedia.source}
          width={activeMedia.width}
          height={activeMedia.height}
          preload={safeIndex === 0}
          sizes="(max-width: 48rem) calc(100vw - 2.5rem), 55vw"
        />
        {total > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="catalog-product-gallery-arrow catalog-product-gallery-arrow--previous"
              aria-label={labels.previousImage}
              onClick={showPrevious}
            >
              <ArrowIcon direction="previous" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="catalog-product-gallery-arrow catalog-product-gallery-arrow--next"
              aria-label={labels.nextImage}
              onClick={showNext}
            >
              <ArrowIcon direction="next" />
            </Button>
          </>
        ) : null}
      </div>

      {total > 1 ? (
        <div className="catalog-product-gallery-dots" aria-label={labels.gallery}>
          {media.map((item, index) => (
            <Button
              key={item.reference}
              type="button"
              variant="informational"
              size="icon"
              className="catalog-product-gallery-dot"
              aria-label={formatPosition(labels.selectImage, index + 1, total)}
              aria-current={index === safeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            >
              <span aria-hidden="true" />
            </Button>
          ))}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {formatPosition(labels.imagePosition, safeIndex + 1, total)}
      </p>
    </section>
  );
}
