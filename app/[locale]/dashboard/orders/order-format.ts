import type { ManagedOrderActor } from "@/lib/orders/management-model";

export function sofiaDateTimeFormatter(locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Sofia",
    timeZoneName: "short",
  });
}

export function formatManagedOrderActor(
  actor: ManagedOrderActor,
  labels: {
    guest: string;
    customerActor: string;
    administratorActor: string;
  },
) {
  if (actor.kind === "guest") return labels.guest;
  const kind =
    actor.kind === "customer"
      ? labels.customerActor
      : labels.administratorActor;
  return `${kind}: ${actor.name} · ${actor.email}`;
}

export function formatPercentBasisPoints(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 10_000);
}
