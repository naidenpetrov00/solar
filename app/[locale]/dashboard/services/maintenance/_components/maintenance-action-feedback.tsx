"use client";

import type { RefObject } from "react";

import { Button } from "@/components/button";
import type { MaintenanceActionResult } from "../action-model";
import type { MaintenanceLabels } from "./maintenance-labels";

export function MaintenanceActionFeedback({ result, resultRef, labels }: {
  result: MaintenanceActionResult;
  resultRef: RefObject<HTMLDivElement | null>;
  labels: MaintenanceLabels;
}) {
  if (!result.code) return null;

  return (
    <div
      ref={resultRef}
      className="dashboard-maintenance-result"
      data-tone={result.status}
      role={result.status === "error" ? "alert" : "status"}
      tabIndex={result.status === "error" ? -1 : undefined}
    >
      <p>{labels.results[result.code]}</p>
      {result.code === "STALE" ? (
        <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
          {labels.actions.reload}
        </Button>
      ) : null}
    </div>
  );
}
