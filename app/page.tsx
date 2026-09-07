import { ProductGrid } from "@/components/ProductGrid";

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="chip mb-4">Order ID · live desk · photo claims</p>
          <h1 className="display text-5xl leading-[1.05] sm:text-7xl">
            Shop on Cartly.
            <span className="block text-[var(--teal)]">Talk to SUPPORTER.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--ink-soft)]">
            Every checkout mints a unique ID. Use it to cancel before the truck leaves, replace a bad delivery,
            pay cash-on-delivery with a QR, follow the van, or upload a photo of what actually arrived.
          </p>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Place the order", "COD or prepaid. You get SPT-XXXX-XXXXXX."],
              ["02", "Open SUPPORTER", "Bottom-right. Paste the unique ID."],
              ["03", "Act on it", "Track, cancel, replace, pay, or complain."],
            ].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <span className="text-xs text-[var(--gold)]">{n}</span>
                <p className="display text-xl">{t}</p>
                <p className="text-sm text-[var(--ink-soft)]">{d}</p>
              </li>
            ))}
          </ol>
        </div>
        <aside className="rounded-[32px] bg-[var(--teal-deep)] p-6 text-[#f4efe6] shadow-[var(--shadow)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#e7b45a]">Try without buying</p>
          <h2 className="display mt-2 text-3xl">Demo unique IDs</h2>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="rounded-2xl bg-white/8 p-3">
              <b>SPT-DEMO-TRCK01</b>
              <p className="text-[#c9b89a]">In transit · unpaid COD · generate QR + live map</p>
            </li>
            <li className="rounded-2xl bg-white/8 p-3">
              <b>SPT-DEMO-CNCL02</b>
              <p className="text-[#c9b89a]">Just confirmed · still cancellable</p>
            </li>
            <li className="rounded-2xl bg-white/8 p-3">
              <b>SPT-DEMO-RPLC03</b>
              <p className="text-[#c9b89a]">Delivered · replacement + photo complaint</p>
            </li>
          </ul>
        </aside>
      </section>
      <ProductGrid />
    </>
  );
}
