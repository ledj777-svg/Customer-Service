import type { Product } from "./types";

export const CATALOG: Product[] = [
  {
    id: "aeroquiet-720",
    name: "AeroQuiet 720",
    tagline: "Studio-quiet ANC headphones",
    price: 7499,
    mrp: 9999,
    category: "Audio",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    rating: 4.6,
    reviews: 2140,
  },
  {
    id: "stride-one",
    name: "Stride One",
    tagline: "Daily trainers with carbon plate",
    price: 4299,
    mrp: 5999,
    category: "Footwear",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    rating: 4.5,
    reviews: 980,
  },
  {
    id: "kiln-bottle",
    name: "Kiln Steel Bottle",
    tagline: "1L, keeps cold for 24 hours",
    price: 899,
    mrp: 1299,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=80",
    rating: 4.7,
    reviews: 4310,
  },
  {
    id: "typeforge-kbd",
    name: "TypeForge MK",
    tagline: "Hot-swap mechanical keyboard",
    price: 6199,
    mrp: 8499,
    category: "Computers",
    image:
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80",
    rating: 4.8,
    reviews: 640,
  },
  {
    id: "everyday-tee",
    name: "Everyday Heavy Tee",
    tagline: "240 GSM cotton, washed black",
    price: 799,
    mrp: 1299,
    category: "Apparel",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    rating: 4.4,
    reviews: 1877,
  },
  {
    id: "halo-lamp",
    name: "Halo Arc Lamp",
    tagline: "Warm desk light with USB-C",
    price: 2499,
    mrp: 3499,
    category: "Home",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
    rating: 4.3,
    reviews: 512,
  },
  {
    id: "pulse-mini",
    name: "Pulse Mini",
    tagline: "Compact earbuds, 36-hour case",
    price: 2999,
    mrp: 4499,
    category: "Audio",
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80",
    rating: 4.5,
    reviews: 3204,
  },
  {
    id: "nomad-24",
    name: "Nomad 24L",
    tagline: "Laptop backpack, rain shell",
    price: 3499,
    mrp: 4999,
    category: "Travel",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80",
    rating: 4.6,
    reviews: 1102,
  },
];

export function getProduct(id: string) {
  return CATALOG.find((p) => p.id === id);
}

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
