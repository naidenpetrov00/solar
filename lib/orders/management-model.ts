import type { CatalogLocale } from "@/lib/catalog/model";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/orders/model";
import type {
  OrderNotificationErrorCode,
  OrderNotificationFailureDisposition,
  OrderNotificationKind,
  OrderNotificationStatus,
} from "@/lib/order-notifications/model";

export const managedOrdersPageSize = 25;
export const managedOrdersMaximumPage = 10_000;
export const managedOrdersSearchMaximumLength = 100;
export const managedOrderProductSearchLimit = 20;

export type ManagedOrdersRawQuery = {
  q?: string | string[];
  status?: string | string[];
  payment?: string | string[];
  from?: string | string[];
  to?: string | string[];
  page?: string | string[];
};

export type ManagedOrdersQuery = {
  query: string;
  status: OrderStatus | null;
  paymentStatus: OrderPaymentStatus | null;
  from: string;
  to: string;
  page: number;
  invalidFilters: string[];
};

export type ManagedOrderSummary = {
  id: string;
  orderNumber: string;
  submittedAt: string;
  customerName: string;
  customerPhone: string;
  totalGrossMinor: string;
  orderStatus: OrderStatus;
  paymentStatus: OrderPaymentStatus;
};

export type ManagedOrdersPage = ManagedOrdersQuery & {
  orders: ManagedOrderSummary[];
  total: number;
  pageCount: number;
};

export type ManagedOrderActor =
  | { kind: "guest" }
  | {
      kind: "administrator";
      name: string;
      email: string;
      role: "administrator" | "admin";
    };

export type ManagedOrderAdjustment = {
  adjustmentKey: string;
  amountGrossMinor: string;
  reason: string;
  actor: Exclude<ManagedOrderActor, { kind: "guest" }>;
};

export type ManagedOrderItem = {
  lineKey: string;
  productId: string;
  sku: string;
  title: string;
  titleLocale: CatalogLocale;
  quantity: number;
  vatRateBasisPoints: number;
  catalogUnitGrossMinor: string;
  promotionUnitDiscountGrossMinor: string;
  promotionLabel: string | null;
  promotionInternalName: string | null;
  effectiveCatalogUnitGrossMinor: string;
  manualUnitAdjustmentGrossMinor: string;
  finalUnitNetMinor: string;
  finalUnitVatMinor: string;
  finalUnitGrossMinor: string;
  lineNetMinor: string;
  lineVatMinor: string;
  lineGrossMinor: string;
  adjustments: ManagedOrderAdjustment[];
};

export type ManagedOrderTotals = {
  catalogSubtotalGrossMinor: string;
  promotionDiscountGrossMinor: string;
  itemAdjustmentGrossMinor: string;
  itemsNetMinor: string;
  itemsVatMinor: string;
  itemsGrossMinor: string;
  orderAdjustmentNetMinor: string;
  orderAdjustmentVatMinor: string;
  orderAdjustmentGrossMinor: string;
  totalNetMinor: string;
  totalVatMinor: string;
  totalGrossMinor: string;
};

export type ManagedOrderRevision = {
  revisionNumber: number;
  revisionKind: "customer_submission" | "administrator_edit";
  locale: CatalogLocale;
  customer: {
    name: string;
    phone: string;
    email: string;
    city: string;
    deliveryAddress: string;
    note: string | null;
  };
  paymentMethod: OrderPaymentMethod;
  items: ManagedOrderItem[];
  orderAdjustments: ManagedOrderAdjustment[];
  totals: ManagedOrderTotals;
  actor: ManagedOrderActor;
  createdAt: string;
};

export type ManagedOrderAuditChange =
  | { kind: "value"; field: string; before: string | null; after: string | null }
  | { kind: "money"; field: string; beforeMinor: string; afterMinor: string }
  | { kind: "collection"; field: "items" | "adjustments"; beforeCount: number; afterCount: number }
  | { kind: "unknown"; field: string };

export type ManagedOrderAuditEvent = {
  id: string;
  eventType:
    | "submitted"
    | "content_revised"
    | "order_status_changed"
    | "payment_status_changed";
  mutationVersion: number;
  fromRevisionNumber: number | null;
  toRevisionNumber: number | null;
  fromOrderStatus: OrderStatus | null;
  toOrderStatus: OrderStatus | null;
  fromPaymentStatus: OrderPaymentStatus | null;
  toPaymentStatus: OrderPaymentStatus | null;
  changes: ManagedOrderAuditChange[];
  actor: ManagedOrderActor;
  occurredAt: string;
};

export type ManagedOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  mutationVersion: number;
  currentRevisionNumber: number;
  submittedAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  paymentStatusUpdatedAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  originalRevision: ManagedOrderRevision;
  currentRevision: ManagedOrderRevision;
  revisions: ManagedOrderRevision[];
  auditEvents: ManagedOrderAuditEvent[];
  emailDeliveries: ManagedOrderEmailDelivery[];
};

export type ManagedOrderEmailDelivery = {
  id: string;
  notificationKind: OrderNotificationKind;
  recipientType: "customer" | "internal";
  recipientName: string;
  recipientEmail: string;
  templateVersion: number;
  revisionNumber: number;
  status: OrderNotificationStatus;
  attemptCount: number;
  manualRetryCount: number;
  mutationVersion: number;
  lastErrorCode: OrderNotificationErrorCode | null;
  failureDisposition: OrderNotificationFailureDisposition | null;
  canRetry: boolean;
  createdAt: string;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
};

export type EligibleOrderProduct = {
  id: string;
  sku: string;
  title: string;
  effectiveUnitGrossMinor: string;
  vatRateBasisPoints: number;
  promotionLabel: string | null;
};
