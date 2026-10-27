import { useEffect, useMemo, useState } from "react";
import { useCart } from "./cart-store";

type CartProduct = {
  id: string;
  title: string;
  href: string;
  priceMinor: string;
  currency: string;
};

export function useCartHydration(locale: string, unavailableRemoved: string) {
  const {
    items,
    ready,
    storageUnavailable,
    setQuantity,
    removeItem,
    retainItems,
  } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [hydrating, setHydrating] = useState(false);
  const [hydrationError, setHydrationError] = useState(false);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const itemIds = useMemo(() => items.map(({ id }) => id).join(","), [items]);

  useEffect(() => {
    if (!ready || !itemIds) {
      let active = true;
      queueMicrotask(() => {
        if (!active) return;
        setProducts([]);
        setHydrating(false);
        setHydrationError(false);
      });
      return () => {
        active = false;
      };
    }
    const controller = new AbortController();
    const query = new URLSearchParams({ locale });
    const requestedIds = itemIds.split(",");
    requestedIds.forEach((id) => query.append("id", id));
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setHydrating(true);
      setHydrationError(false);
    });

    fetch(`/api/catalog/cart?${query.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("cart hydration failed");
        return response.json() as Promise<{ products: CartProduct[] }>;
      })
      .then(({ products: hydratedProducts }) => {
        const validIds = new Set(hydratedProducts.map(({ id }) => id));
        const removed = requestedIds.length - validIds.size;
        setProducts(hydratedProducts);
        if (removed > 0) {
          retainItems(validIds);
          setAnnouncement(unavailableRemoved);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setProducts([]);
        setHydrationError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHydrating(false);
      });

    return () => controller.abort();
  }, [
    hydrationAttempt,
    itemIds,
    unavailableRemoved,
    locale,
    ready,
    retainItems,
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const resolvedItems = items.flatMap((item) => {
    const product = productById.get(item.id);
    return product ? [{ item, product }] : [];
  });
  const totalMinor = resolvedItems.reduce(
    (sum, { item, product }) =>
      sum + BigInt(product.priceMinor) * BigInt(item.quantity),
    BigInt(0),
  );
  const resolvedCount = resolvedItems.reduce(
    (sum, { item }) => sum + item.quantity,
    0,
  );
  return {
    items,
    ready,
    storageUnavailable,
    setQuantity,
    removeItem,
    announcement,
    setAnnouncement,
    hydrating,
    hydrationError,
    setHydrationAttempt,
    resolvedItems,
    resolvedCount,
    totalMinor,
  };
}
