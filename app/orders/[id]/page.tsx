"use client";

import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { TrackMap } from "@/components/TrackMap";
import { inr, prettyStatus, when } from "@/lib/format";
import type { Order, TrackingSnapshot } from "@/lib/types";

type View = { order: Order; tracking: TrackingSnapshot; qr?: { qrDataUrl: string; upi: string; paid: boolean } };

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${params.id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      return;
    }
    let qr;
    if (data.order.paymentMethod === "cod" && data.order.paymentStatus === "pending") {
      const pay = await fetch(`/api/orders/${params.id}/pay`).then((r) => r.json());
      qr = pay.qr;
    }
    setView({ ...data, qr });
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(path: string, body?: unknown) {
    setBusy(path);
    setError("");
    const res = await fetch(`/api/orders/${params.id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Action failed");
      return;
    }
    if (data.replacement?.id) setNote(`Replacement unique ID: ${data.replacement.id}`);
    await load();
  }

  async function complain(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const description = String(new FormData(form).get("description") || "");
    const file = (form.elements.namedItem("photo") as HTMLInputElement).files?.[0];
    let imageUrl: string | undefined;
    if (file) {
      const fd = new FormData();
      fd.set("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      imageUrl = up.url;
    }
    setBusy("complaint");
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: params.id, description, imageUrl }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Complaint failed");
      return;
    }
    setNote(`Ticket ${data.complaint.ticketId} is open.`);
    form.reset();
    await load();
  }

  if (!view) {
    return <div className="px-5 py-16">{error || "Loading unique ID…"}</div>;
  }

  const { order, tracking, qr } = view;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      {Date.now() - new Date(order.createdAt).getTime() < 5 * 60_000 ? (
        <div className="rounded-2xl bg-[#e7f3ef] px-4 py-3 text-sm">
          Order received. Your unique ID is <b>{order.id}</b>. Open SUPPORTER anytime with this ID.
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--teal)]">Unique order ID</p>
          <h1 className="display text-4xl">{order.id}</h1>
          <p className="text-[var(--ink-soft)]">
            {prettyStatus(tracking.status)} · {order.paymentMethod.toUpperCase()} {order.paymentStatus} · {when(order.createdAt)}
          </p>
        </div>
        <p className="display text-3xl">{inr(order.total)}</p>
      </div>

      <TrackMap tracking={tracking} orderId={order.id} />

      <section className="rounded-3xl border border-[var(--line)] bg-white/65 p-5">
        {order.items.map((item) => (
          <div key={item.productId} className="mb-3 flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <div>
              <p className="font-medium">
                {item.qty}× {item.name}
              </p>
              <p className="text-sm text-[var(--ink-soft)]">{inr(item.price)}</p>
            </div>
          </div>
        ))}
        <p className="text-sm text-[var(--ink-soft)]">
          {order.customer.name} · {order.customer.address}, {order.customer.city} {order.customer.pincode}
        </p>
      </section>

      {qr && !qr.paid ? (
        <section className="rounded-3xl bg-[#10231f] p-5 text-center text-[#f4efe6]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#e7b45a]">Pay this unique ID</p>
          <p className="display text-3xl">{inr(order.total)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qrDataUrl} alt="COD QR" className="mx-auto my-4 w-48 rounded-2xl" />
          <button
            disabled={busy === "pay"}
            onClick={() => void act("pay")}
            className="rounded-full bg-[#e7b45a] px-5 py-2 text-sm font-semibold text-[#10231f]"
          >
            Mark COD paid
          </button>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button disabled={!!busy} className="chip" onClick={() => void act("cancel", { reason: "Changed mind" })}>
          Cancel order
        </button>
        <button disabled={!!busy} className="chip" onClick={() => void act("replace", { reason: "Item not as expected" })}>
          Replace order
        </button>
      </div>

      <form onSubmit={complain} className="space-y-3 rounded-3xl border border-[var(--line)] bg-white/65 p-5">
        <h2 className="display text-2xl">Photo complaint</h2>
        <p className="text-sm text-[var(--ink-soft)]">Upload what you received. The ticket is tied to {order.id}.</p>
        <textarea
          required
          name="description"
          placeholder="Cracked cup, wrong colour, missing item…"
          className="w-full rounded-2xl border border-[var(--line)] p-3"
          rows={3}
        />
        <input name="photo" type="file" accept="image/png,image/jpeg" />
        <button disabled={busy === "complaint"} className="rounded-full bg-[var(--ink)] px-5 py-2 text-sm text-[var(--paper)]">
          File complaint
        </button>
      </form>

      {order.complaints.length ? (
        <section className="space-y-3">
          {order.complaints.map((c) => (
            <article key={c.id} className="rounded-2xl bg-[#fff8f1] p-4">
              <p className="font-semibold">{c.ticketId}</p>
              <p className="text-sm">{c.description}</p>
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt="" className="mt-2 max-h-40 rounded-xl object-cover" />
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {note ? <p className="text-sm text-[var(--teal)]">{note}</p> : null}
      {error ? <p className="text-sm text-[var(--coral)]">{error}</p> : null}
    </div>
  );
}
