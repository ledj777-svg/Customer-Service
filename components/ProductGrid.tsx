"use client";

import { CATALOG } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import { inr } from "@/lib/format";

export function ProductGrid() {
  const { add } = useCart();
  return (
    <section className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--teal)]">This week&apos;s floor</p>
          <h2 className="display text-4xl">Goods with a paper trail</h2>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CATALOG.map((product) => (
          <article key={product.id} className="card-lift overflow-hidden rounded-3xl border border-[var(--line)] bg-white/65">
            <div className="relative aspect-[4/5] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
              <span className="absolute left-3 top-3 chip bg-white/80">{product.category}</span>
            </div>
            <div className="space-y-2 p-4">
              <h3 className="display text-xl">{product.name}</h3>
              <p className="text-sm text-[var(--ink-soft)]">{product.tagline}</p>
              <div className="flex items-baseline gap-2">
                <b>{inr(product.price)}</b>
                <s className="text-xs text-[var(--ink-soft)]">{inr(product.mrp)}</s>
              </div>
              <p className="text-xs text-[var(--ink-soft)]">
                {product.rating} ★ · {product.reviews.toLocaleString("en-IN")} reviews
              </p>
              <button
                type="button"
                onClick={() => add(product)}
                className="w-full rounded-full bg-[var(--ink)] py-2.5 text-sm font-medium text-[var(--paper)]"
              >
                Add to bag
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
