"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { inr } from "@/lib/format";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, setQty, total } = useCart();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <button className="absolute inset-0 bg-black/35" onClick={onClose} aria-label="Close bag" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[var(--paper)] shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <h2 className="display text-2xl">Bag</h2>
          <button onClick={onClose} className="chip">
            Close
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {items.length === 0 ? <p className="text-[var(--ink-soft)]">Your bag is empty.</p> : null}
          {items.map((item) => (
            <div key={item.productId} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-[var(--ink-soft)]">{inr(item.price)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button className="chip" onClick={() => setQty(item.productId, item.qty - 1)}>
                    −
                  </button>
                  <span>{item.qty}</span>
                  <button className="chip" onClick={() => setQty(item.productId, item.qty + 1)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--line)] p-5">
          <div className="mb-3 flex justify-between">
            <span>Total</span>
            <b>{inr(total)}</b>
          </div>
          <Link
            href="/checkout"
            onClick={onClose}
            className="block rounded-full bg-[var(--teal-deep)] py-3 text-center text-sm font-semibold text-[#f4efe6]"
          >
            Checkout · unique ID on confirm
          </Link>
        </div>
      </aside>
    </div>
  );
}
