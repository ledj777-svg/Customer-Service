"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { inr } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const { items, total, customerId, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cod");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!items.length) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: method,
          items,
          customer: {
            id: customerId,
            name: String(form.get("name")),
            phone: String(form.get("phone")),
            email: String(form.get("email")),
            address: String(form.get("address")),
            city: String(form.get("city")),
            pincode: String(form.get("pincode")),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      clear();
      router.push(`/orders/${data.order.id}?fresh=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <h1 className="display text-4xl">Bag is empty</h1>
        <p className="mt-2 text-[var(--ink-soft)]">Add something from the floor first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="display text-4xl">Checkout</h1>
        <p className="text-[var(--ink-soft)]">A unique order ID is minted the moment this lands.</p>
        {[
          ["name", "Full name", "Priya Nair"],
          ["phone", "Phone", "9876543210"],
          ["email", "Email", "priya@example.com"],
          ["address", "Address", "14, 2nd Cross, Indiranagar"],
          ["city", "City", "Bengaluru"],
          ["pincode", "PIN", "560038"],
        ].map(([name, label, placeholder]) => (
          <label key={name} className="block text-sm">
            {label}
            <input
              required
              name={name}
              placeholder={placeholder}
              defaultValue={placeholder}
              className="mt-1 w-full rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-2.5"
            />
          </label>
        ))}
        <fieldset className="grid grid-cols-2 gap-3">
          <label className={`rounded-2xl border p-4 ${method === "cod" ? "border-[var(--teal)] bg-white" : "border-[var(--line)]"}`}>
            <input type="radio" name="pay" className="mr-2" checked={method === "cod"} onChange={() => setMethod("cod")} />
            Cash on delivery
            <p className="text-xs text-[var(--ink-soft)]">SUPPORTER can mint a UPI QR for this ID.</p>
          </label>
          <label className={`rounded-2xl border p-4 ${method === "prepaid" ? "border-[var(--teal)] bg-white" : "border-[var(--line)]"}`}>
            <input type="radio" name="pay" className="mr-2" checked={method === "prepaid"} onChange={() => setMethod("prepaid")} />
            Prepaid (demo)
            <p className="text-xs text-[var(--ink-soft)]">Marked paid instantly.</p>
          </label>
        </fieldset>
        {error ? <p className="text-sm text-[var(--coral)]">{error}</p> : null}
        <button disabled={busy} className="w-full rounded-full bg-[var(--teal-deep)] py-3 text-[#f4efe6] disabled:opacity-60">
          {busy ? "Minting unique ID…" : `Place order · ${inr(total)}`}
        </button>
      </form>
      <aside className="h-fit rounded-3xl border border-[var(--line)] bg-white/60 p-5">
        {items.map((item) => (
          <div key={item.productId} className="mb-3 flex justify-between gap-3 text-sm">
            <span>
              {item.qty}× {item.name}
            </span>
            <span>{inr(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-3 font-semibold">
          <span>Total</span>
          <span>{inr(total)}</span>
        </div>
      </aside>
    </div>
  );
}
