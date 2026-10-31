import { relations } from "drizzle-orm";

import { user } from "@/db/schema/auth";
import { catalogProduct } from "@/db/schema/catalog-products";
import { catalogPromotion } from "@/db/schema/catalog-promotions";
import { salesOrder, salesOrderRevision } from "@/db/schema/order-core";
import { salesOrderAuditEvent } from "@/db/schema/order-events";
import {
  salesOrderItemSnapshot,
  salesOrderPriceAdjustment,
} from "@/db/schema/order-items";

export const salesOrderRelations = relations(salesOrder, ({ many }) => ({
  revisions: many(salesOrderRevision),
  events: many(salesOrderAuditEvent),
}));

export const salesOrderRevisionRelations = relations(
  salesOrderRevision,
  ({ one, many }) => ({
    order: one(salesOrder, {
      fields: [salesOrderRevision.orderId],
      references: [salesOrder.id],
    }),
    createdBy: one(user, {
      fields: [salesOrderRevision.createdByUserId],
      references: [user.id],
    }),
    items: many(salesOrderItemSnapshot),
    adjustments: many(salesOrderPriceAdjustment),
  }),
);

export const salesOrderItemSnapshotRelations = relations(
  salesOrderItemSnapshot,
  ({ one, many }) => ({
    revision: one(salesOrderRevision, {
      fields: [salesOrderItemSnapshot.revisionId],
      references: [salesOrderRevision.id],
    }),
    product: one(catalogProduct, {
      fields: [salesOrderItemSnapshot.sourceProductId],
      references: [catalogProduct.id],
    }),
    promotion: one(catalogPromotion, {
      fields: [salesOrderItemSnapshot.sourcePromotionId],
      references: [catalogPromotion.id],
    }),
    adjustments: many(salesOrderPriceAdjustment),
  }),
);

export const salesOrderPriceAdjustmentRelations = relations(
  salesOrderPriceAdjustment,
  ({ one }) => ({
    revision: one(salesOrderRevision, {
      fields: [salesOrderPriceAdjustment.revisionId],
      references: [salesOrderRevision.id],
    }),
    item: one(salesOrderItemSnapshot, {
      fields: [salesOrderPriceAdjustment.itemSnapshotId],
      references: [salesOrderItemSnapshot.id],
    }),
    createdBy: one(user, {
      fields: [salesOrderPriceAdjustment.createdByUserId],
      references: [user.id],
    }),
  }),
);

export const salesOrderAuditEventRelations = relations(
  salesOrderAuditEvent,
  ({ one }) => ({
    order: one(salesOrder, {
      fields: [salesOrderAuditEvent.orderId],
      references: [salesOrder.id],
    }),
    actor: one(user, {
      fields: [salesOrderAuditEvent.actorUserId],
      references: [user.id],
    }),
  }),
);
