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
      content: "Hello! How can I assist you today?",
    },
  ]);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 280);
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
        <aside className="fixed bottom-24 right-5 z-50 flex h-[min(620px,calc(100vh-7.5rem))] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[28px] bg-white text-[#1b1b1f] shadow-[0_18px_50px_rgba(28,16,56,0.22)]">
          <header className="flex items-center gap-2 border-b border-black/5 px-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#5B2FD6] text-sm font-black text-white">
              S
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">SUPPORTER</p>
              <p className="truncate text-xs text-[#6b6578]">Cartly customer support</p>
            </div>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full text-lg text-[#6b6578] hover:bg-black/5"
              aria-label="Close SUPPORTER"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div ref={scroller} className="scrollbar-thin flex-1 space-y-3 overflow-auto px-3 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-br-md bg-[#5B2FD6] text-white"
                      : "rounded-bl-md bg-[#f3f1f6] text-[#1b1b1f]"
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
            {messages.length === 1 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    className="rounded-full border border-[#5B2FD6]/25 bg-white px-3 py-1.5 text-[11px] text-[#5B2FD6]"
                    onClick={() => void send(q.text)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="px-3 pb-2">
            {preview ? (
              <div className="mb-2 flex items-center gap-2 text-xs text-[#6b6578]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <span>Photo ready</span>
                <button type="button" onClick={() => pickFile(null)} className="underline">
                  remove
                </button>
              </div>
            ) : null}
            <div className="rounded-[22px] border border-black/10 bg-white px-3 py-2">
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
                placeholder="Message..."
                className="max-h-24 w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#9a94a6]"
              />
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#6b6578] hover:bg-black/5" title="Upload photo">
                    <span className="text-lg leading-none">📎</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {DEMOS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="rounded-full bg-[#f3f1f6] px-2 py-0.5 text-[10px] text-[#5B2FD6]"
                        onClick={() => setInput((prev) => (prev ? `${prev} ${id}` : id))}
                      >
                        {id.replace("SPT-DEMO-", "")}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  disabled={busy || (!input.trim() && !file)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#5B2FD6] text-white disabled:opacity-40"
                  aria-label="Send"
                >
                  ↑
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-[#9a94a6]">
              {engine === "grok" ? "Powered by Grok · SUPPORTER" : "Powered by SUPPORTER"}
            </p>
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
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
