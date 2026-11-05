"use client";

import { type KeyboardEvent } from "react";
import { Button } from "@/components/button";

import { catalogLocales, type CatalogLocale } from "@/lib/catalog/model";

type LocalizedEditorSwitchProps = {
  idPrefix: string;
  variant: "tabs" | "selector";
  activeLocale: CatalogLocale;
  onChange: (locale: CatalogLocale) => void;
  languageNames: Record<CatalogLocale, string>;
  statusByLocale: Record<CatalogLocale, boolean>;
  completeLabel: string;
  incompleteLabel: string;
  ariaLabel: string;
};

export function LocalizedEditorSwitch({
  idPrefix,
  variant,
  activeLocale,
  onChange,
  languageNames,
  statusByLocale,
  completeLabel,
  incompleteLabel,
  ariaLabel,
}: LocalizedEditorSwitchProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = catalogLocales.indexOf(activeLocale);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? catalogLocales.length - 1
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? (index + 1) % catalogLocales.length
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? (index - 1 + catalogLocales.length) % catalogLocales.length
              : null;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextLocale = catalogLocales[nextIndex];
    onChange(nextLocale);
    requestAnimationFrame(() =>
      document.getElementById(`${idPrefix}-language-${nextLocale}`)?.focus(),
    );
  };

  return (
    <div
      className="dashboard-catalog-localized-switch"
      role={variant === "tabs" ? "tablist" : "group"}
      aria-label={ariaLabel}
    >
      {catalogLocales.map((locale) => {
        const complete = statusByLocale[locale];
        const selected = activeLocale === locale;

        return (
          <Button
            key={locale}
            id={`${idPrefix}-language-${locale}`}
            type="button"
            size="compact"
            variant="secondary"
            role={variant === "tabs" ? "tab" : undefined}
            aria-selected={variant === "tabs" ? selected : undefined}
            aria-pressed={variant === "selector" ? selected : undefined}
            aria-controls={
              variant === "tabs" ? `${idPrefix}-panel-${locale}` : undefined
            }
            tabIndex={variant === "tabs" ? (selected ? 0 : -1) : undefined}
            data-complete={complete ? "true" : "false"}
            onClick={() => onChange(locale)}
            onKeyDown={onKeyDown}
          >
            <span>{languageNames[locale]}</span>
            <small className="dashboard-catalog-localized-status">
              {complete ? completeLabel : incompleteLabel}
            </small>
          </Button>
        );
      })}
    </div>
  );
}
