import { NextResponse } from "next/server";
import { runSupporter } from "@/lib/grok";
import { persistDataUrl } from "@/lib/save-image";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest & { imageDataUrl?: string };
    const messages = body.messages ?? [];
    const stored = await persistDataUrl(body.imageDataUrl);
    if (body.imageDataUrl && messages.length) {
      const last = messages[messages.length - 1];
      if (last.role === "user" && !last.imageUrl) last.imageUrl = body.imageDataUrl;
    }
    const result = await runSupporter({
      messages,
      customerId: body.customerId,
      activeOrderId: body.activeOrderId,
      imageUrl: stored,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
