export function formatCurrencyMinor(
  locale: string,
  minorValue: string,
  currency = "EUR",
) {
  const minor = BigInt(minorValue);
  const absolute = minor < BigInt(0) ? -minor : minor;
  const units = absolute / BigInt(100);
  const fraction = String(absolute % BigInt(100)).padStart(2, "0");
  const groupedUnits = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(units);
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(0);

  return parts
    .map((part) => {
      if (part.type === "integer") return `${minor < BigInt(0) ? "-" : ""}${groupedUnits}`;
      if (part.type === "fraction") return fraction;
      if (part.type === "minusSign") return "";
      return part.value;
    })
    .join("");
}
