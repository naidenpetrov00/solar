import "server-only";

import { eq } from "drizzle-orm";

import { user } from "@/db/schema";
import { OrderError } from "@/lib/orders/errors";
import type { OrderExecutor } from "@/lib/orders/repository-types";
import type { OrderActor } from "@/lib/orders/types";
import { hasPermission, type AppPermission } from "@/lib/permission-policy";

export async function getOrderActor(
  executor: OrderExecutor,
  actorId: string,
  permission: AppPermission,
  lock = false,
): Promise<OrderActor> {
  const query = executor
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, actorId))
    .limit(1);
  const rows = lock ? await query.for("update") : await query;
  const actor = rows[0];
  if (
    !actor ||
    !hasPermission(actor.role, permission) ||
    (actor.role !== "administrator" && actor.role !== "admin")
  ) {
    throw new OrderError("FORBIDDEN");
  }
  return { ...actor, role: actor.role };
}
