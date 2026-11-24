"use client";

import { type KeyboardEvent } from "react";

import { Button } from "@/components/button";
import {
  maintenanceLocales,
  type MaintenanceLocale,
} from "@/lib/maintenance/model";

export function MaintenanceLocaleSwitch({
  idPrefix,
  activeLocale,
  onChange,
  languageNames,
  ariaLabel,
}: {
  idPrefix: string;
  activeLocale: MaintenanceLocale;
  onChange: (locale: MaintenanceLocale) => void;
  languageNames: Record<MaintenanceLocale, string>;
  ariaLabel: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = maintenanceLocales.indexOf(activeLocale);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? maintenanceLocales.length - 1
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? (index + 1) % maintenanceLocales.length
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? (index - 1 + maintenanceLocales.length) %
                maintenanceLocales.length
              : null;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextLocale = maintenanceLocales[nextIndex];
    onChange(nextLocale);
    requestAnimationFrame(() =>
      document.getElementById(`${idPrefix}-language-${nextLocale}`)?.focus(),
    );
  };

  return (
    <div className="dashboard-maintenance-locale-switch" role="tablist" aria-label={ariaLabel}>
      {maintenanceLocales.map((locale) => {
        const selected = activeLocale === locale;
        return (
          <Button
            key={locale}
            id={`${idPrefix}-language-${locale}`}
            type="button"
            size="compact"
            variant="secondary"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${locale}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(locale)}
            onKeyDown={onKeyDown}
          >
            {languageNames[locale]}
          </Button>
        );
      })}
    </div>
  );
}
