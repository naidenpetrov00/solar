import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  catalogCategory,
  catalogCategoryCover,
  catalogCategoryCoverTranslation,
  catalogProduct,
  catalogProductDocument,
  catalogProductDocumentTranslation,
  catalogProductMedia,
  catalogProductMediaTranslation,
} from "@/db/schema";
import { normalizeMediaReference } from "./model";
import {
  assertCatalogActor,
  assertFresh,
  assertIdentifier,
} from "./management-access";
import { CatalogManagementError } from "./management-errors";
import type {
  LocalizedAltText,
  LocalizedDocumentText,
} from "./management-asset-types";
import {
  normalizeAltTranslations,
  normalizeDocumentTranslations,
} from "./management-asset-validation";
import { getProductPublicationAggregate } from "./product-repository";
import { assertProductPublishable } from "./management-product-readiness";

export async function saveCatalogProductImages(input: {
  actorId: string;
  productId: string;
  expectedAssetsUpdatedAt: string;
  images: Array<{
    id: string;
    reference: string | null;
    isPrimary: boolean;
    isSocialImage: boolean;
    translations: LocalizedAltText;
  }>;
}) {
  assertIdentifier(input.productId);
  if (input.images.length > 12) throw new CatalogManagementError("ASSET_LIMIT_REACHED");
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [product] = await transaction.select().from(catalogProduct).where(eq(catalogProduct.id, input.productId)).limit(1).for("update");
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
    const current = await transaction.select().from(catalogProductMedia).where(eq(catalogProductMedia.productId, product.id));
    const currentIds = new Set(current.map(({ id }) => id));
    if (input.images.length !== current.length || input.images.some(({ id }) => !currentIds.has(id))) {
      throw new CatalogManagementError("STALE");
    }
    if (input.images.filter(({ isPrimary }) => isPrimary).length > 1 || input.images.filter(({ isSocialImage }) => isSocialImage).length > 1) {
      throw new CatalogManagementError("INVALID_INPUT");
    }
    await transaction
      .update(catalogProductMedia)
      .set({ isPrimary: false, isSocialImage: false })
      .where(eq(catalogProductMedia.productId, product.id));
    for (const [index, image] of input.images.entries()) {
      await transaction
        .update(catalogProductMedia)
        .set({ displayOrder: 1000 + index })
        .where(eq(catalogProductMedia.id, image.id));
    }
    for (const [displayOrder, image] of input.images.entries()) {
      const row = current.find(({ id }) => id === image.id)!;
      const reference = row.assetId ? null : normalizeMediaReference(image.reference ?? "");
      const translations = normalizeAltTranslations(image.translations, product.status === "published");
      await transaction.update(catalogProductMedia).set({ reference, displayOrder, isPrimary: image.isPrimary, isSocialImage: image.isSocialImage, updatedAt: new Date() }).where(eq(catalogProductMedia.id, image.id));
      await transaction.delete(catalogProductMediaTranslation).where(eq(catalogProductMediaTranslation.productMediaId, image.id));
      if (translations.length) await transaction.insert(catalogProductMediaTranslation).values(translations.map((translation) => ({ productMediaId: image.id, ...translation })));
    }
    if (product.status === "published") {
      const aggregate = await getProductPublicationAggregate(transaction, product.id);
      if (!aggregate) throw new CatalogManagementError("NOT_FOUND");
      assertProductPublishable(aggregate);
    }
    const now = new Date();
    await transaction.update(catalogProduct).set({ assetsUpdatedAt: now }).where(eq(catalogProduct.id, product.id));
    return { assetsUpdatedAt: now.toISOString() };
  });
}

export async function saveCatalogProductDocuments(input: {
  actorId: string;
  productId: string;
  expectedAssetsUpdatedAt: string;
  documents: Array<{ id: string; translations: LocalizedDocumentText }>;
}) {
  assertIdentifier(input.productId);
  if (input.documents.length > 10) throw new CatalogManagementError("ASSET_LIMIT_REACHED");
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [product] = await transaction.select().from(catalogProduct).where(eq(catalogProduct.id, input.productId)).limit(1).for("update");
    if (!product) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(product.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
    const current = await transaction.select().from(catalogProductDocument).where(eq(catalogProductDocument.productId, product.id));
    const currentIds = new Set(current.map(({ id }) => id));
    if (input.documents.length !== current.length || input.documents.some(({ id }) => !currentIds.has(id))) throw new CatalogManagementError("STALE");
    for (const [index, document] of input.documents.entries()) {
      await transaction
        .update(catalogProductDocument)
        .set({ displayOrder: 1000 + index })
        .where(eq(catalogProductDocument.id, document.id));
    }
    for (const [displayOrder, document] of input.documents.entries()) {
      const translations = normalizeDocumentTranslations(document.translations);
      await transaction.update(catalogProductDocument).set({ displayOrder, updatedAt: new Date() }).where(eq(catalogProductDocument.id, document.id));
      await transaction.delete(catalogProductDocumentTranslation).where(eq(catalogProductDocumentTranslation.documentId, document.id));
      await transaction.insert(catalogProductDocumentTranslation).values(translations.map((translation) => ({ documentId: document.id, ...translation })));
    }
    const now = new Date();
    await transaction.update(catalogProduct).set({ assetsUpdatedAt: now }).where(eq(catalogProduct.id, product.id));
    return { assetsUpdatedAt: now.toISOString() };
  });
}

export async function saveCatalogCategoryCoverAlt(input: {
  actorId: string;
  categoryId: string;
  expectedAssetsUpdatedAt: string;
  translations: LocalizedAltText;
}) {
  assertIdentifier(input.categoryId);
  const translations = normalizeAltTranslations(input.translations, true);
  return db.transaction(async (transaction) => {
    await assertCatalogActor(transaction, input.actorId, "catalog:manage");
    const [category] = await transaction.select().from(catalogCategory).where(eq(catalogCategory.id, input.categoryId)).limit(1).for("update");
    if (!category) throw new CatalogManagementError("NOT_FOUND");
    assertFresh(category.assetsUpdatedAt, input.expectedAssetsUpdatedAt);
    const [cover] = await transaction.select().from(catalogCategoryCover).where(eq(catalogCategoryCover.categoryId, category.id)).limit(1);
    if (!cover) throw new CatalogManagementError("NOT_FOUND");
    await transaction.delete(catalogCategoryCoverTranslation).where(eq(catalogCategoryCoverTranslation.categoryId, category.id));
    await transaction.insert(catalogCategoryCoverTranslation).values(translations.map((translation) => ({ categoryId: category.id, ...translation })));
    const now = new Date();
    await transaction.update(catalogCategory).set({ assetsUpdatedAt: now }).where(eq(catalogCategory.id, category.id));
    return { assetsUpdatedAt: now.toISOString() };
  });
}
