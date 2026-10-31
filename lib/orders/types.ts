import type { CatalogLocale } from "@/lib/catalog/model";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/orders/model";

export type OrderCustomerInput = {
  name: string;
  phone: string;
  email: string;
  city: string;
  deliveryAddress: string;
  note?: string | null;
};

export type GuestOrderInput = {
  submissionKey: string;
  locale: CatalogLocale;
  customer: OrderCustomerInput;
  paymentMethod: OrderPaymentMethod;
  items: Array<{ productId: string; quantity: number }>;
};

export type ManualAdjustmentInput = {
  adjustmentKey?: string;
  amountGrossMinor: bigint;
  reason: string;
};

export type OrderRevisionLineInput =
  | {
      lineKey: string;
      quantity: number;
      adjustments: ManualAdjustmentInput[];
    }
  | {
      productId: string;
      quantity: number;
      adjustments: ManualAdjustmentInput[];
    };

export type ReviseOrderInput = {
  actorId: string;
  orderId: string;
  expectedVersion: number;
  locale: CatalogLocale;
  customer: OrderCustomerInput;
  paymentMethod: OrderPaymentMethod;
  lines: OrderRevisionLineInput[];
  orderAdjustments: ManualAdjustmentInput[];
};

export type TransitionOrderStatusInput = {
  actorId: string;
  orderId: string;
  expectedVersion: number;
  status: OrderStatus;
};

export type TransitionPaymentStatusInput = {
  actorId: string;
  orderId: string;
  expectedVersion: number;
  paymentStatus: OrderPaymentStatus;
};

export type OrderActor = {
  id: string;
  name: string;
  email: string;
  role: "administrator" | "admin";
};
