import type {
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderStatus,
} from "@/lib/orders/model";

export type CustomerOrdersLabels = {
  list: {
    title: string;
    description: string;
    orderNumber: string;
    submittedAt: string;
    orderStatus: string;
    paymentStatus: string;
    total: string;
    items: string;
    itemCount_one: string;
    itemCount_few: string;
    itemCount_many: string;
    itemCount_other: string;
    emptyTitle: string;
    emptyDescription: string;
    shop: string;
    page: string;
    previous: string;
    next: string;
    viewOrder: string;
  };
  detail: {
    back: string;
    submittedAt: string;
    updatedAt: string;
    paymentUpdatedAt: string;
    customerDelivery: string;
    customerName: string;
    phone: string;
    email: string;
    city: string;
    deliveryAddress: string;
    note: string;
    noNote: string;
    paymentMethod: string;
    items: string;
    sku: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    promotion: string;
    totals: string;
    subtotal: string;
    promotionDiscount: string;
    adjustments: string;
    total: string;
    includedVat: string;
    timeline: string;
    timelineSubmitted: string;
    timelineApproved: string;
    timelineRejected: string;
    timelineCancelled: string;
    timelineCompleted: string;
    timelinePaid: string;
    timelineRefunded: string;
    timelinePaymentUpdated: string;
  };
  orderStatuses: Record<OrderStatus, string>;
  paymentStatuses: Record<OrderPaymentStatus, string>;
  paymentMethods: Record<OrderPaymentMethod, string>;
};
