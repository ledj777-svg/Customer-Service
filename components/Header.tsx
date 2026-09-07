"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function Header({ onCart }: { onCart?: () => void }) {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[color:color-mix(in_srgb,var(--paper)_86%,white)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--teal-deep)] text-sm font-semibold tracking-widest text-[#f4efe6]">
            C
          </span>
          <span>
            <span className="display block text-xl leading-none">Cartly</span>
            <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">
              powered by SUPPORTER
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link className="chip" href="/orders">
            My orders
          </Link>
          <button type="button" className="chip" onClick={onCart}>
            Bag
            <b className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--teal)] px-1 text-[11px] text-white">
              {count}
            </b>
          </button>
        </nav>
      </div>
    </header>
  );
}
