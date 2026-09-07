"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { extractOrderId } from "@/lib/order-id";
import type { ChatAttachment, ChatMessage } from "@/lib/types";
import { Attachments } from "./Attachments";

const QUICK = [
  { label: "Track order", text: "Track my order" },
  { label: "Cancel", text: "I want to cancel my order" },
  { label: "Replace", text: "I need a replacement" },
  { label: "Pay COD QR", text: "Generate a COD payment QR" },
  { label: "Complaint", text: "I want to file a complaint with a photo of what I received" },
];

const DEMOS = ["SPT-DEMO-TRCK01", "SPT-DEMO-CNCL02", "SPT-DEMO-RPLC03"];

type UiMessage = ChatMessage & { pending?: boolean };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { customerId } = useCart();
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [engine, setEngine] = useState<"grok" | "local" | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      content:
        "I'm SUPPORTER. Every Cartly order gets a unique ID. Track it, cancel before it ships, replace after delivery, pay COD with a QR, or upload a photo of what arrived.",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 520);
    return () => window.clearTimeout(t);
  }, [open]);

  function pickFile(next: File | null) {
    setFile(next);
    if (!next) return setPreview(undefined);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(next);
  }

  async function toDataUrl(image: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(image);
    });
  }

  async function send(text: string, image?: File | null) {
    const content = text.trim();
    if ((!content && !image) || busy) return;
    const imageUrl = image ? await toDataUrl(image) : preview;
    const userMsg: UiMessage = { role: "user", content: content || "Please inspect this photo of my order.", imageUrl };
    const nextMessages: UiMessage[] = [...messages.filter((m) => !m.pending), userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "Checking the desk…", pending: true }]);
    setInput("");
    setFile(null);
    setPreview(undefined);
    setBusy(true);
    try {
      const activeOrderId = [...nextMessages].reverse().map((m) => extractOrderId(m.content)).find(Boolean);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ pending: _p, ...m }) => m),
          customerId,
          activeOrderId,
          imageDataUrl: imageUrl,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        attachments?: ChatAttachment[];
        engine?: "grok" | "local";
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setEngine(data.engine ?? null);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.reply || "Done.", attachments: data.attachments },
      ]);
    } catch (error) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "SUPPORTER hit a snag. Try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(orderId: string) {
    await send(`I have paid the COD QR for ${orderId}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input, file);
  }

  return (
    <>
      {open ? (
        <aside className="fixed bottom-24 right-5 z-50 flex h-[min(640px,calc(100vh-7.5rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#10231f] text-[#f4efe6] shadow-[var(--shadow)]">
        <header className="flex items-start justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#e7b45a]">Cartly care desk</p>
            <h2 className="display text-2xl">SUPPORTER</h2>
            <p className="text-xs text-[#c9b89a]">
              {engine === "grok"
                ? "Grok on the line"
                : engine === "local"
                  ? "Desk mode · add XAI_API_KEY for Grok"
                  : "Unique-ID support"}
            </p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg leading-none"
            aria-label="Close SUPPORTER"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>

        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK.map((q) => (
            <button
              key={q.label}
              className="chip bg-white/10 text-[11px] text-[#f4efe6]"
              onClick={() => void send(q.text)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div ref={scroller} className="scrollbar-thin flex-1 space-y-3 overflow-auto px-4 py-2">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "ml-8" : "mr-4"}>
              <div
                className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-[#1c3d37]" : "bg-[#f4efe6] text-[#14201c]"
                } ${msg.pending ? "opacity-70" : ""}`}
              >
                {msg.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.imageUrl} alt="Uploaded" className="mb-2 max-h-32 rounded-xl object-cover" />
                ) : null}
                {msg.content}
                {msg.role === "assistant" ? <Attachments items={msg.attachments} onPay={markPaid} /> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#9aa89f]">Demo unique IDs</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMOS.map((id) => (
              <button
                key={id}
                className="chip bg-white/10 text-[11px]"
                onClick={() => setInput((prev) => (prev ? `${prev} ${id}` : id))}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="border-t border-white/10 p-3">
          {preview ? (
            <div className="mb-2 flex items-center gap-2 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <span>Photo ready to send</span>
              <button type="button" onClick={() => pickFile(null)} className="underline">
                remove
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <label
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-2xl bg-white/10"
              title="Upload photo of received order"
            >
              +
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input, file);
                }
              }}
              rows={1}
              placeholder="Unique ID + what you need…"
              className="max-h-28 flex-1 resize-none rounded-2xl bg-white/10 px-3 py-2.5 text-sm outline-none placeholder:text-[#9aa89f]"
            />
            <button
              disabled={busy}
              className="h-11 rounded-2xl bg-[#e7b45a] px-4 text-sm font-semibold text-[#10231f] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
        </aside>
      ) : null}

      <button
        type="button"
        aria-label={open ? "Close SUPPORTER" : "Open SUPPORTER"}
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-50 grid h-16 w-16 place-items-center rounded-full bg-[#5B2FD6] text-white shadow-[0_10px_28px_rgba(91,47,214,0.45)] transition hover:scale-105"
      >
        {open ? (
          <span className="text-3xl leading-none">×</span>
        ) : (
          <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
            <path
              fill="currentColor"
              d="M10 12.5c0-2.5 2-4.5 4.5-4.5h19c2.5 0 4.5 2 4.5 4.5v15c0 2.5-2 4.5-4.5 4.5H22.2L15 38v-6.5H14.5C12 31.5 10 29.5 10 27z"
            />
            <path
              d="M18.2 22.2c1.4 2.2 3.4 3.4 5.8 3.4s4.4-1.2 5.8-3.4"
              stroke="#5B2FD6"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
      </button>
    </>
  );
}
