"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { inr, prettyStatus, when } from "@/lib/format";
import type { Order, TrackingSnapshot } from "@/lib/types";

export default function OrdersPage() {
  const { customerId } = useCart();
  const [rows, setRows] = useState<{ order: Order; tracking: TrackingSnapshot }[]>([]);

  useEffect(() => {
    fetch(`/api/orders?customerId=${customerId}`)
      .then((r) => r.json())
      .then((d) => setRows(d.orders ?? []));
  }, [customerId]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <h1 className="display text-4xl">My orders</h1>
      <p className="mt-2 text-[var(--ink-soft)]">
        Demo IDs are included so you can try SUPPORTER immediately: SPT-DEMO-TRCK01, SPT-DEMO-CNCL02, SPT-DEMO-RPLC03.
      </p>
      <div className="mt-6 space-y-4">
        {rows.map(({ order, tracking }) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="card-lift flex gap-4 rounded-3xl border border-[var(--line)] bg-white/65 p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.items[0]?.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{order.id}</b>
                <span className="chip capitalize">{prettyStatus(tracking.status)}</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">
                {order.items.map((i) => i.name).join(", ")} · {inr(order.total)}
              </p>
              <p className="text-xs text-[var(--ink-soft)]">
                {order.paymentMethod.toUpperCase()} · {order.paymentStatus} · {when(order.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
