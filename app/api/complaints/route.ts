import { NextResponse } from "next/server";
import { fileComplaint, snapshot } from "@/lib/orders";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    orderId: string;
    description: string;
    imageUrl?: string;
    visionSummary?: string;
  };
  if (!body.orderId || !body.description) {
    return NextResponse.json({ error: "orderId and description are required" }, { status: 400 });
  }
  const result = await fileComplaint(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    complaint: result.complaint,
    order: result.order,
    tracking: snapshot(result.order),
  });
}
