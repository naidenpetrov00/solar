import type { CatalogLocale } from "@/lib/catalog/model";
import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/orders/model";

export const customerOrdersPageSize = 25;
export const customerOrdersMaximumPage = 10_000;

export type CustomerOrdersRawQuery = {
  page?: string | string[];
};

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  submittedAt: string;
  updatedAt: string;
  orderStatus: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currency: "EUR";
  totalGrossMinor: string;
  itemCount: number;
};

export type CustomerOrdersPage = {
  orders: CustomerOrderSummary[];
  page: number;
  pageCount: number;
  total: number;
};

export type CustomerOrderItem = {
  sku: string;
  title: string;
  titleLocale: CatalogLocale;
  quantity: number;
  vatRateBasisPoints: number;
  promotionLabel: string | null;
  finalUnitNetMinor: string;
  finalUnitVatMinor: string;
  finalUnitGrossMinor: string;
  lineNetMinor: string;
  lineVatMinor: string;
  lineGrossMinor: string;
};

export type CustomerOrderTotals = {
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

export type CustomerOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  submittedAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  paymentStatusUpdatedAt: string;
  paidAt: string | null;
  refundedAt: string | null;
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
  currency: "EUR";
  items: CustomerOrderItem[];
  totals: CustomerOrderTotals;
};
