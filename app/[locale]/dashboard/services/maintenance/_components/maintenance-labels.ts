import type { MaintenanceServiceCode } from "@/lib/maintenance/model";
import type { MaintenanceActionCode } from "../action-model";

export type MaintenanceLabels = {
  title: string;
  description: string;
  readOnly: string;
  serviceNames: Record<MaintenanceServiceCode, string>;
  currency: string;
  technicalPricing: string;
  fields: {
    isActive: { label: string; help: string };
    oneTimeAvailable: { label: string; help: string };
    periodicAvailable: { label: string; help: string };
    oneTimePrice: { label: string; help: string };
    periodicPrice: { label: string; help: string };
  };
  states: { active: string; hidden: string };
  actions: {
    save: string;
    saving: string;
    reload: string;
  };
  validation: {
    invalid: string;
    required: string;
    frequency: string;
  };
  results: Record<MaintenanceActionCode, string>;
};
