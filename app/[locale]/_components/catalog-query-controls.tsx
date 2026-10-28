"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/button";
import type {
  PublicCatalogFacet,
  PublicCatalogSort,
} from "@/lib/catalog/public-types";

export type FilterLabels = {
  clear: string;
  minimum: string;
  maximum: string;
  yes: string;
  no: string;
  updating: string;
};

function useCatalogQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (change: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    change(params);
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
  };

  return { pending, update };
}

export function CatalogFilterControls({
  facets,
  labels,
  showClear,
}: {
  facets: PublicCatalogFacet[];
  labels: FilterLabels;
  showClear: boolean;
}) {
  const { pending, update } = useCatalogQuery();

  const setOption = (facetId: string, value: string, checked: boolean) => {
    update((params) => {
      const key = `f.${facetId}`;
      const values = new Set(params.getAll(key));
      if (checked) values.add(value);
      else values.delete(value);
      params.delete(key);
      for (const selected of values) params.append(key, selected);
    });
  };
  const setBound = (facetId: string, bound: "min" | "max", value: string) => {
    update((params) => {
      const key = `${bound}.${facetId}`;
      if (value) params.set(key, value);
      else params.delete(key);
    });
  };

  return (
    <div className="catalog-filters" aria-busy={pending}>
      {facets.map((facet) => (
        <fieldset key={facet.id}>
          <legend>
            <span>{facet.label}</span>
            {facet.contextLabel ? <small>{facet.contextLabel}</small> : null}
          </legend>
          {facet.valueType === "number" ? (
            <div className="catalog-number-filter">
              <label>
                <span>{labels.minimum}</span>
                <input
                  key={`min-${facet.selectedMinimum ?? ""}`}
                  type="number"
                  step="any"
                  min={facet.minimum ?? undefined}
                  max={facet.maximum ?? undefined}
                  defaultValue={facet.selectedMinimum ?? ""}
                  placeholder={facet.minimum ?? undefined}
                  onBlur={(event) => setBound(facet.id, "min", event.currentTarget.value)}
                />
              </label>
              <label>
                <span>{labels.maximum}</span>
                <input
                  key={`max-${facet.selectedMaximum ?? ""}`}
                  type="number"
                  step="any"
                  min={facet.minimum ?? undefined}
                  max={facet.maximum ?? undefined}
                  defaultValue={facet.selectedMaximum ?? ""}
                  placeholder={facet.maximum ?? undefined}
                  onBlur={(event) => setBound(facet.id, "max", event.currentTarget.value)}
                />
              </label>
              {facet.unit ? <small>{facet.unit}</small> : null}
            </div>
          ) : (
            <div className="catalog-filter-options">
              {facet.options.map((item) => (
                <label key={item.value}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(event) =>
                      setOption(facet.id, item.value, event.currentTarget.checked)
                    }
                  />
                  <span>
                    {item.label ?? (item.value === "true" ? labels.yes : labels.no)}
                  </span>
                  <small>{item.count}</small>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ))}
      {showClear ? <CatalogClearFilters label={labels.clear} /> : null}
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? labels.updating : ""}
      </span>
    </div>
  );
}

export function CatalogClearFilters({ label }: { label: string }) {
  const { pending, update } = useCatalogQuery();
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        update((params) => {
          for (const key of [...params.keys()]) {
            if (key.startsWith("f.") || key.startsWith("min.") || key.startsWith("max.")) {
              params.delete(key);
            }
          }
        })
      }
    >
      {label}
    </Button>
  );
}

export function CatalogSortControl({
  value,
  label,
  options,
  updating,
}: {
  value: PublicCatalogSort;
  label: string;
  options: Record<PublicCatalogSort, string>;
  updating: string;
}) {
  const { pending, update } = useCatalogQuery();
  return (
    <label className="catalog-sort-control">
      <span>{label}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.currentTarget.value;
          update((params) => {
            if (next === "name-asc") params.delete("sort");
            else params.set("sort", next);
          });
        }}
      >
        {Object.entries(options).map(([sort, optionLabel]) => (
          <option key={sort} value={sort}>{optionLabel}</option>
        ))}
      </select>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? updating : ""}
      </span>
    </label>
  );
}
