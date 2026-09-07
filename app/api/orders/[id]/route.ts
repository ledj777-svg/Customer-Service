import { NextResponse } from "next/server";
import { publicOrderView } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await publicOrderView(id);
  if (!view) return NextResponse.json({ error: "Unknown unique ID" }, { status: 404 });
  return NextResponse.json(view);
}
