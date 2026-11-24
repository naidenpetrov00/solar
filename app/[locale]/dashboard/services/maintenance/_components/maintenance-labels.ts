import type {
  MaintenanceLocale,
  MaintenanceServiceCode,
} from "@/lib/maintenance/model";
import type { MaintenanceActionCode } from "../action-model";

export type MaintenanceLabels = {
  title: string;
  description: string;
  readOnly: string;
  serviceNames: Record<MaintenanceServiceCode, string>;
  languages: Record<MaintenanceLocale, string>;
  localeTabsLabel: string;
  fields: {
    isActive: { label: string; help: string };
    oneTimeAvailable: { label: string; help: string };
    periodicAvailable: { label: string; help: string };
    oneTimePriceLabel: { label: string; help: string };
    periodicPriceLabel: { label: string; help: string };
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
    tooLong: string;
    frequency: string;
  };
  results: Record<MaintenanceActionCode, string>;
};
