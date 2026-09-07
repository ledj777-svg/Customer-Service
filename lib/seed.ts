import { CATALOG } from "./catalog";
import type { Order } from "./types";

const demoCustomer = {
  id: "cust_demo",
  name: "Priya Nair",
  phone: "9876543210",
  email: "priya.nair@example.com",
  address: "14, 2nd Cross, Indiranagar",
  city: "Bengaluru",
  pincode: "560038",
};

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export function seedOrders(): Order[] {
  const headphones = CATALOG[0];
  const shoes = CATALOG[1];
  const bottle = CATALOG[2];
  const earbuds = CATALOG[6];

  return [
    {
      id: "SPT-DEMO-TRCK01",
      createdAt: hoursAgo(4),
      customer: demoCustomer,
      items: [{ productId: headphones.id, name: headphones.name, price: headphones.price, image: headphones.image, qty: 1 }],
      total: headphones.price,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "in_transit",
      complaints: [],
    },
    {
      id: "SPT-DEMO-CNCL02",
      createdAt: hoursAgo(0.08),
      customer: { ...demoCustomer, city: "Pune", address: "902, Koregaon Park", pincode: "411001" },
      items: [{ productId: shoes.id, name: shoes.name, price: shoes.price, image: shoes.image, qty: 1 }],
      total: shoes.price,
      paymentMethod: "prepaid",
      paymentStatus: "paid",
      paidAt: hoursAgo(0.08),
      status: "confirmed",
      complaints: [],
    },
    {
      id: "SPT-DEMO-RPLC03",
      createdAt: hoursAgo(30),
      customer: { ...demoCustomer, city: "Chennai", address: "7, Besant Nagar", pincode: "600090" },
      items: [
        { productId: earbuds.id, name: earbuds.name, price: earbuds.price, image: earbuds.image, qty: 1 },
        { productId: bottle.id, name: bottle.name, price: bottle.price, image: bottle.image, qty: 1 },
      ],
      total: earbuds.price + bottle.price,
      paymentMethod: "cod",
      paymentStatus: "paid",
      paidAt: hoursAgo(18),
      deliveredAt: hoursAgo(18),
      status: "delivered",
      complaints: [],
    },
  ];
}
