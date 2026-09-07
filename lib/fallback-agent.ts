import { extractOrderId } from "./ids";
import { gateOffTopic, SUPPORTER_INTRO } from "./intro";
import { runTool } from "./tools";
import type { ChatAttachment, ChatMessage } from "./types";

type Result = { reply: string; attachments: ChatAttachment[] };

function lastUser(messages: ChatMessage[]) {
  return [...messages].reverse().find((m) => m.role === "user");
}

function historyText(messages: ChatMessage[]) {
  return messages.map((m) => m.content).join("\n");
}

function wants(text: string, words: RegExp) {
  return words.test(text);
}

function toolError(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    return parsed.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fallbackAgent(input: {
  messages: ChatMessage[];
  customerId?: string;
  activeOrderId?: string;
  imageUrl?: string;
}): Promise<Result> {
  const user = lastUser(input.messages);
  const text = (user?.content ?? "").trim();
  const lower = text.toLowerCase();
  const orderId = extractOrderId(text) ?? extractOrderId(historyText(input.messages)) ?? input.activeOrderId;
  const ctx = { customerId: input.customerId, imageUrl: input.imageUrl };
  const confirmed = /\b(yes|yeah|yep|confirm|go ahead|do it|please cancel|ha|haan)\b/i.test(text);

  const gated = gateOffTopic(text, { hasImage: Boolean(input.imageUrl), orderIdInPlay: orderId });
  if (gated) {
    return { reply: gated, attachments: [] };
  }

  if (input.imageUrl) {
    if (!orderId) {
      return {
        reply: "Photo received. Drop the unique order ID that belongs to this delivery so I can open a complaint ticket.",
        attachments: [],
      };
    }
    const result = await runTool(
      "file_complaint",
      {
        orderId,
        description: text || "Customer uploaded a photo of the received order.",
        visionSummary: "Photo attached by customer (offline mode — add XAI_API_KEY for visual inspection).",
        imageUrl: input.imageUrl,
      },
      ctx,
    );
    return {
      reply: `Complaint logged against ${orderId}. A specialist will review the photo. Ticket is attached.`,
      attachments: result.attachments,
    };
  }

  if (wants(lower, /\b(hi|hello|hey|help|supporter)\b/) && !orderId && !wants(lower, /track|cancel|replace|pay|qr|complaint/)) {
    return { reply: SUPPORTER_INTRO, attachments: [] };
  }

  if (wants(lower, /my orders|list order|recent order/)) {
    const result = await runTool("list_recent_orders", {}, ctx);
    return {
      reply: "Here are the orders I can see for this browser, plus the public demo IDs.",
      attachments: result.attachments,
    };
  }

  if (wants(lower, /cancel/)) {
    if (!orderId) return { reply: "Which unique ID should I cancel? It looks like SPT-XXXX-XXXXXX.", attachments: [] };
    if (!confirmed && !wants(lower, /please cancel|cancel it|cancel now|cancel this/)) {
      return {
        reply: `I can cancel ${orderId} only if it is still confirmed or packed. Reply YES to confirm.`,
        attachments: [],
      };
    }
    const result = await runTool("cancel_order", { orderId, reason: text }, ctx);
    if (!result.attachments.length) {
      return { reply: toolError(result.text, "Could not cancel that order."), attachments: [] };
    }
    return { reply: `Done. ${orderId} is cancelled.`, attachments: result.attachments };
  }

  if (wants(lower, /replace|replacement|exchange/)) {
    if (!orderId) return { reply: "Share the unique ID of the delivered order you want replaced.", attachments: [] };
    if (!confirmed && !wants(lower, /replace it|replace now|please replace/)) {
      return {
        reply: `Replacement for ${orderId} is free if it was delivered in the last 7 days. Reply YES and tell me what was wrong.`,
        attachments: [],
      };
    }
    const result = await runTool("replace_order", { orderId, reason: text }, ctx);
    if (!result.attachments.length) {
      return { reply: toolError(result.text, "Could not start a replacement."), attachments: [] };
    }
    return { reply: `Replacement is moving. Keep both IDs — original and the new shipment.`, attachments: result.attachments };
  }

  if (wants(lower, /qr|upi|pay|cod|cash on delivery|payment/)) {
    if (!orderId) return { reply: "Give me the unique ID of the COD order and I will mint a UPI QR for that amount.", attachments: [] };
    if (wants(lower, /paid|i paid|payment done|scanned/)) {
      const paid = await runTool("mark_cod_paid", { orderId }, ctx);
      if (paid.attachments.length) return { reply: `Payment captured for ${orderId}.`, attachments: paid.attachments };
    }
    const result = await runTool("generate_payment_qr", { orderId }, ctx);
    if (!result.attachments.length) {
      return { reply: toolError(result.text, "No pending COD on that ID."), attachments: [] };
    }
    return {
      reply: `Scan this QR to pay the COD amount tied to ${orderId}. After paying, say "I paid".`,
      attachments: result.attachments,
    };
  }

  if (wants(lower, /complaint|damaged|broken|wrong item|missing|photo|image/)) {
    if (!orderId) return { reply: "Upload a photo of what arrived and the unique order ID. I will open a ticket.", attachments: [] };
    const result = await runTool(
      "file_complaint",
      { orderId, description: text || "Customer complaint from chat." },
      ctx,
    );
    if (!result.attachments.length) {
      return { reply: toolError(result.text, "Could not file that complaint."), attachments: [] };
    }
    return { reply: `Ticket opened on ${orderId}. Add a photo anytime to strengthen the claim.`, attachments: result.attachments };
  }

  if (orderId && wants(lower, /track|where|location|status|eta/)) {
    const result = await runTool("track_order", { orderId }, ctx);
    if (!result.attachments.length) return { reply: "That unique ID is not in the system.", attachments: [] };
    return { reply: `Live location for ${orderId} is on the map below.`, attachments: result.attachments };
  }

  if (orderId) {
    const result = await runTool("lookup_order", { orderId }, ctx);
    if (!result.attachments.length) return { reply: "I couldn't find that unique ID. Check the spacing: SPT-XXXX-XXXXXX.", attachments: [] };
    return {
      reply: `Found ${orderId}. I can track it, cancel (if not shipped), replace after delivery, take COD via QR, or file a photo complaint.`,
      attachments: result.attachments,
    };
  }

  return { reply: SUPPORTER_INTRO, attachments: [] };
}
