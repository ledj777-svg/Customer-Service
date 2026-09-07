import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { CartProvider } from "@/lib/cart-context";
import { StoreShell } from "@/components/StoreShell";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cartly · SUPPORTER",
  description:
    "Place an order, get a unique ID, then ask SUPPORTER to track, cancel, replace, pay COD by QR, or file a photo complaint.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <StoreShell>{children}</StoreShell>
        </CartProvider>
      </body>
    </html>
  );
}
