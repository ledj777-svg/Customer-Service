"use client";

import { useEffect, useState } from "react";
import { CartDrawer } from "./CartDrawer";
import { ChatWidget } from "./ChatWidget";
import { Header } from "./Header";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    const pop = window.setTimeout(() => setSupportOpen(true), 420);
    return () => window.clearTimeout(pop);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div
        className={`flex min-h-full flex-1 flex-col transition-[padding] duration-500 ease-out ${
          supportOpen ? "lg:pr-[400px]" : ""
        }`}
      >
        <Header onCart={() => setCartOpen(true)} />
        <main className="flex-1">{children}</main>
        <footer className="mt-auto border-t border-[var(--line)] px-5 py-6 text-center text-sm text-[var(--ink-soft)]">
          Copyright © 2026 - 2028  TermsFeed®. All rights reserved.
        </footer>
      </div>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ChatWidget open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
