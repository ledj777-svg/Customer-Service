"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, Product } from "./types";

type CartState = {
  items: CartItem[];
  customerId: string;
  add: (product: Product) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
};

const CartContext = createContext<CartState | null>(null);

function readId() {
  const key = "cartly_customer";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `cust_${Math.random().toString(36).slice(2, 12)}`;
  localStorage.setItem(key, id);
  return id;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState("cust_pending");

  useEffect(() => {
    setCustomerId(readId());
    const raw = localStorage.getItem("cartly_cart");
    if (raw) setItems(JSON.parse(raw) as CartItem[]);
  }, []);

  useEffect(() => {
    localStorage.setItem("cartly_cart", JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartState>(() => {
    const add = (product: Product) => {
      setItems((prev) => {
        const found = prev.find((i) => i.productId === product.id);
        if (found) {
          return prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i));
        }
        return [
          ...prev,
          { productId: product.id, name: product.name, price: product.price, image: product.image, qty: 1 },
        ];
      });
    };
    const setQty = (productId: string, qty: number) => {
      setItems((prev) => (qty <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, qty } : i))));
    };
    return {
      items,
      customerId,
      add,
      setQty,
      clear: () => setItems([]),
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.price, 0),
    };
  }, [items, customerId]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
