"use client";

import { useState } from "react";
import { CartDrawer } from "./CartDrawer";
import { ChatWidget } from "./ChatWidget";
import { Header } from "./Header";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header onCart={() => setCartOpen(true)} />
      <main className="flex-1">{children}</main>
      <footer className="mt-auto border-t border-[var(--line)] px-5 py-6 text-center text-sm text-[var(--ink-soft)]">
        Copyright © 2026 - 2028  TermsFeed®. All rights reserved.
      </footer>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ChatWidget />
    </div>
  );
}
