import type { OrderAuditChange } from "@/db/schema";

function serialized(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serialized);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialized(entry)]),
    );
  }
  return value;
}

export function auditChange(
  field: string,
  before: unknown,
  after: unknown,
): OrderAuditChange | null {
  const serializedBefore = serialized(before);
  const serializedAfter = serialized(after);
  return JSON.stringify(serializedBefore) === JSON.stringify(serializedAfter)
    ? null
    : { field, before: serializedBefore, after: serializedAfter };
}

export function compactAuditChanges(
  changes: Array<OrderAuditChange | null>,
): OrderAuditChange[] {
  return changes.filter((change): change is OrderAuditChange => Boolean(change));
}
