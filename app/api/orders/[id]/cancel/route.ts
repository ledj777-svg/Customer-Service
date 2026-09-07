import { NextResponse } from "next/server";
import { cancelOrder, snapshot } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const result = await cancelOrder(id, body.reason || "Cancelled from order page");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ order: result.order, tracking: snapshot(result.order) });
}
