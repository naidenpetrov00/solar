import "server-only";

import { db } from "@/db";
import { isUuid } from "@/lib/catalog/model";
import { getOrderActor } from "@/lib/orders/actor-repository";
import { OrderError } from "@/lib/orders/errors";
import { loadOrderAggregate } from "@/lib/orders/order-repository";

export async function getManagedOrderAggregate(input: {
  actorId: string;
  orderId: string;
  revisionNumber?: number;
}) {
  if (
    !isUuid(input.orderId) ||
    (input.revisionNumber !== undefined &&
      (!Number.isInteger(input.revisionNumber) || input.revisionNumber < 1))
  ) {
    throw new OrderError("INVALID_INPUT");
  }
  await getOrderActor(db, input.actorId, "order:view");
  return loadOrderAggregate(db, input.orderId, input.revisionNumber);
}
