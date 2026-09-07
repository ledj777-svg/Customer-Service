import { NextResponse } from "next/server";
import { getOrder, markPaid, snapshot } from "@/lib/orders";
import { paymentQr } from "@/lib/qr";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Unknown unique ID" }, { status: 404 });
  const qr = await paymentQr(order);
  return NextResponse.json({ order, tracking: snapshot(order), qr });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await markPaid(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ order: result.order, tracking: snapshot(result.order) });
}
