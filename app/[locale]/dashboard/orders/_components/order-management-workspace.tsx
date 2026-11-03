"use client";

import { useCallback, useState } from "react";
import type { ManagedOrderDetail } from "@/lib/orders/management-model";
import type { OrdersLabels } from "../order-labels";
import { OrderEditor } from "./order-editor";
import { OrderLifecycle } from "./order-lifecycle";

export function OrderManagementWorkspace({
  order,
  dashboardLocale,
  latestHref,
  labels,
}: {
  order: ManagedOrderDetail;
  dashboardLocale: string;
  latestHref: string;
  labels: OrdersLabels;
}) {
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);
  return (
    <>
      {order.status === "pending_approval" ? (
        <OrderEditor
          orderId={order.id}
          revision={order.currentRevision}
          mutationVersion={order.mutationVersion}
          dashboardLocale={dashboardLocale}
          latestHref={latestHref}
          labels={labels}
          onDirtyChange={onDirtyChange}
        />
      ) : null}
      <OrderLifecycle
        orderId={order.id}
        orderStatus={order.status}
        paymentStatus={order.paymentStatus}
        mutationVersion={order.mutationVersion}
        dashboardLocale={dashboardLocale}
        dirty={dirty}
        labels={labels}
      />
    </>
  );
}
