"use client";

import Link from "next/link";
import { inr, prettyStatus, when } from "@/lib/format";
import type { ChatAttachment } from "@/lib/types";
import { TrackMap } from "./TrackMap";

export function Attachments({
  items,
  onPay,
  onChoose,
}: {
  items?: ChatAttachment[];
  onPay?: (orderId: string) => void;
  onChoose?: (label: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 grid gap-3">
      {items.map((item, i) => {
        if (item.type === "tracking") {
          return <TrackMap key={i} tracking={item.tracking} orderId={item.orderId} />;
        }
        if (item.type === "order") {
          return (
            <div key={i} className="rounded-2xl border border-[var(--line)] bg-white/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/orders/${item.order.id}`} className="font-semibold">
                  {item.order.id}
                </Link>
                <span className="chip capitalize">{prettyStatus(item.tracking.status)}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                {item.order.items.map((it) => `${it.qty}× ${it.name}`).join(", ")} · {inr(item.order.total)}
              </p>
              <p className="text-xs text-[var(--ink-soft)]">
                {item.order.paymentMethod.toUpperCase()} · {item.order.paymentStatus} · {item.order.customer.city}
              </p>
            </div>
          );
        }
        if (item.type === "qr") {
          return (
            <div key={i} className="rounded-2xl bg-[#10231f] p-4 text-[#f4efe6]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#e7b45a]">COD UPI QR</p>
              <p className="display text-2xl">{inr(item.amount)}</p>
              <p className="text-xs text-[#c9b89a]">{item.orderId}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.qrDataUrl} alt="Payment QR" className="mx-auto my-3 w-44 rounded-xl" />
              <p className="break-all text-[10px] text-[#9aa89f]">{item.upi}</p>
              {onPay && !item.paid ? (
                <button
                  type="button"
                  className="mt-3 w-full rounded-full bg-[#e7b45a] px-4 py-2 text-sm font-semibold text-[#10231f]"
                  onClick={() => onPay(item.orderId)}
                >
                  I have paid
                </button>
              ) : null}
            </div>
          );
        }
        if (item.type === "complaint") {
          return (
            <div key={i} className="rounded-2xl border border-[var(--line)] bg-[#fff8f1] p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--coral)]">Complaint ticket</p>
              <p className="font-semibold">{item.complaint.ticketId}</p>
              <p className="text-sm text-[var(--ink-soft)]">{item.complaint.description}</p>
              {item.complaint.visionSummary ? (
                <p className="mt-1 text-xs italic text-[var(--ink-soft)]">{item.complaint.visionSummary}</p>
              ) : null}
              {item.complaint.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.complaint.imageUrl} alt="Uploaded evidence" className="mt-2 max-h-40 rounded-xl object-cover" />
              ) : null}
              <p className="mt-1 text-xs">{item.complaint.status} · {when(item.complaint.createdAt)}</p>
            </div>
          );
        }
        if (item.type === "choices") {
          return (
            <div key={i} className="mt-3 flex flex-col gap-2">
              {item.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="rounded-full border border-[#5B2FD6]/25 bg-white px-3 py-2 text-left text-sm text-[#5B2FD6] hover:bg-[#f3f1f6]"
                  onClick={() => onChoose?.(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          );
        }
        return (
          <div
            key={i}
            className={`rounded-2xl p-3 text-sm ${
              item.tone === "warn" ? "bg-[#f8e7df]" : item.tone === "ok" ? "bg-[#e7f3ef]" : "bg-white/70"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="text-[var(--ink-soft)]">{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}
