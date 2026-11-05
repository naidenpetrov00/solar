import { checkedAdd, checkedMultiply, maximumMinorUnits, splitVatInclusiveMinor } from "@/lib/orders/money";

export function parsePositiveEuroMinor(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(normalized)) {
    return null;
  }
  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return minor > BigInt(0) && minor <= maximumMinorUnits ? minor : null;
}

export function euroMinorToInput(value: string) {
  const minor = BigInt(value);
  const absolute = minor < BigInt(0) ? -minor : minor;
  return `${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}

export type ProvisionalAdjustment = {
  direction: "discount" | "surcharge";
  amount: string;
};

export function signedAdjustmentMinor(adjustment: ProvisionalAdjustment) {
  const amount = parsePositiveEuroMinor(adjustment.amount);
  if (amount === null) return null;
  return adjustment.direction === "discount" ? -amount : amount;
}

export function calculateProvisionalTotals(input: {
  lines: Array<{
    quantity: number;
    effectiveUnitGrossMinor: string;
    vatRateBasisPoints: number;
    adjustments: ProvisionalAdjustment[];
  }>;
  orderAdjustments: ProvisionalAdjustment[];
}) {
  try {
    let net = BigInt(0);
    let vat = BigInt(0);
    let gross = BigInt(0);
    for (const line of input.lines) {
      const adjustments = line.adjustments.map(signedAdjustmentMinor);
      if (adjustments.some((value) => value === null)) return null;
      const unitGross = checkedAdd(
        BigInt(line.effectiveUnitGrossMinor),
        ...(adjustments as bigint[]),
      );
      if (unitGross <= BigInt(0)) return null;
      const split = splitVatInclusiveMinor(unitGross, line.vatRateBasisPoints);
      net = checkedAdd(net, checkedMultiply(split.netMinor, line.quantity));
      vat = checkedAdd(vat, checkedMultiply(split.vatMinor, line.quantity));
      gross = checkedAdd(gross, checkedMultiply(unitGross, line.quantity));
    }
    for (const adjustment of input.orderAdjustments) {
      const amount = signedAdjustmentMinor(adjustment);
      if (amount === null) return null;
      const split = splitVatInclusiveMinor(amount, 2000);
      net = checkedAdd(net, split.netMinor);
      vat = checkedAdd(vat, split.vatMinor);
      gross = checkedAdd(gross, amount);
    }
    if (net <= BigInt(0) || vat < BigInt(0) || gross <= BigInt(0)) return null;
    return {
      totalNetMinor: net.toString(),
      totalVatMinor: vat.toString(),
      totalGrossMinor: gross.toString(),
    };
  } catch {
    return null;
  }
}
