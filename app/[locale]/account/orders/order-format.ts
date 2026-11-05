import { formatCurrencyMinor } from "../../_lib/catalog-format";

export function formatOrderMoney(locale: string, minor: string) {
  return formatCurrencyMinor(locale, minor);
}

export function formatOrderDate(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}
