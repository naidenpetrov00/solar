import { OrderError } from "@/lib/orders/errors";

export const maximumMinorUnits = BigInt("9223372036854775807");
export const minimumMinorUnits = -maximumMinorUnits - BigInt(1);

export function checkedMinor(value: bigint) {
  if (value < minimumMinorUnits || value > maximumMinorUnits) {
    throw new OrderError("INVALID_INPUT", { field: "money", reason: "overflow" });
  }
  return value;
}

export function checkedAdd(...values: bigint[]) {
  return checkedMinor(values.reduce((sum, value) => sum + value, BigInt(0)));
}

export function checkedMultiply(value: bigint, multiplier: number) {
  if (!Number.isSafeInteger(multiplier)) {
    throw new OrderError("INVALID_INPUT");
  }
  return checkedMinor(value * BigInt(multiplier));
}

function divideHalfUp(value: bigint, divisor: bigint) {
  const sign = value < BigInt(0) ? BigInt(-1) : BigInt(1);
  const absolute = value < BigInt(0) ? -value : value;
  return sign * ((absolute + divisor / BigInt(2)) / divisor);
}

export function splitVatInclusiveMinor(
  grossMinor: bigint,
  vatRateBasisPoints: number,
) {
  if (!Number.isInteger(vatRateBasisPoints) || vatRateBasisPoints < 0) {
    throw new OrderError("INVALID_INPUT");
  }
  checkedMinor(grossMinor);
  const netMinor = checkedMinor(
    divideHalfUp(
      grossMinor * BigInt(10_000),
      BigInt(10_000 + vatRateBasisPoints),
    ),
  );
  return { netMinor, vatMinor: checkedMinor(grossMinor - netMinor) };
}
