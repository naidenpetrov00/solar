"use client";

import { useSyncExternalStore } from "react";
import { findShopProductById } from "../_lib/shop-catalog";

type CartItem = { id: string; quantity: number };
type CartSnapshot = {
  items: CartItem[];
  ready: boolean;
  storageUnavailable: boolean;
};

const storageKey = "solar-cart:v1";
export const maxCartQuantity = 999;
const serverSnapshot: CartSnapshot = { items: [], ready: false, storageUnavailable: false };
let snapshot = serverSnapshot;
let initialized = false;
const listeners = new Set<() => void>();

function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];

  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1 || !("items" in value) || !Array.isArray(value.items)) return [];

    const quantities = new Map<string, number>();
    for (const item of value.items) {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || !findShopProductById(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) continue;
      quantities.set(item.id, Math.min(maxCartQuantity, (quantities.get(item.id) ?? 0) + item.quantity));
    }
    return Array.from(quantities, ([id, quantity]) => ({ id, quantity }));
  } catch {
    return [];
  }
}

function emit(next: CartSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    emit({ items: parseCart(window.localStorage.getItem(storageKey)), ready: true, storageUnavailable: false });
  } catch {
    emit({ items: [], ready: true, storageUnavailable: true });
  }

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) {
      emit({ ...snapshot, items: parseCart(event.key === null ? null : event.newValue) });
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  return () => { listeners.delete(listener); };
}

function updateItems(change: (items: CartItem[]) => CartItem[]) {
  initialize();
  const items = change(snapshot.items);
  let storageUnavailable = snapshot.storageUnavailable;

  if (!storageUnavailable) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, items }));
    } catch {
      storageUnavailable = true;
    }
  }

  emit({ items, ready: true, storageUnavailable });
}

function addItem(id: string) {
  if (!findShopProductById(id)) return;
  updateItems((items) => {
    const found = items.find((item) => item.id === id);
    return found
      ? items.map((item) => item.id === id ? { ...item, quantity: Math.min(maxCartQuantity, item.quantity + 1) } : item)
      : [...items, { id, quantity: 1 }];
  });
}

function setQuantity(id: string, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return;
  updateItems((items) => items.map((item) => item.id === id ? { ...item, quantity: Math.min(maxCartQuantity, quantity) } : item));
}

function removeItem(id: string) {
  updateItems((items) => items.filter((item) => item.id !== id));
}

export function useCart() {
  const { items, ready, storageUnavailable } = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  return {
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    ready,
    storageUnavailable,
    addItem,
    setQuantity,
    removeItem,
  };
}
