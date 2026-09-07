import { NextResponse } from "next/server";
import { createOrder, listOrders, snapshot } from "@/lib/orders";
import type { CartItem, Customer, PaymentMethod } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const customerId = new URL(req.url).searchParams.get("customerId") ?? undefined;
  const orders = await listOrders(customerId);
  return NextResponse.json({
    orders: orders.map((order) => ({ order, tracking: snapshot(order) })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    customer: Customer;
    items: CartItem[];
    paymentMethod: PaymentMethod;
  };
  if (!body?.customer?.name || !body?.customer?.city || !body.items?.length) {
    return NextResponse.json({ error: "Name, city, and at least one item are required." }, { status: 400 });
  }
  const order = await createOrder(body);
  return NextResponse.json({ order, tracking: snapshot(order) });
}
