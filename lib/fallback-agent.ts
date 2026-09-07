import { extractOrderId, lastRealOrderId } from "./order-id";
import { gateOffTopic, SUPPORTER_INTRO } from "./intro";
import { CUSTOM_REASON, reasonPrompt, REFUND_REPLY, refundFor, thanksForFeedback } from "./reasons";
import { getOrder } from "./orders";
import { runTool } from "./tools";
import type { ChatAttachment, ChatMessage } from "./types";

type Result = { reply: string; attachments: ChatAttachment[] };

function lastUser(messages: ChatMessage[]) {
  return [...messages].reverse().find((m) => m.role === "user");
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
  const orderId = extractOrderId(text) ?? lastRealOrderId(input.messages, input.activeOrderId);
  const ctx = { customerId: input.customerId, imageUrl: input.imageUrl };
  const confirmed = /\b(yes|yeah|yep|confirm|go ahead|do it|please cancel|ha|haan)\b/i.test(text);

  const lastAssistant = [...input.messages].reverse().find((m) => m.role === "assistant");
  const waitingForConfirm = Boolean(lastAssistant && /reply yes|to confirm/i.test(lastAssistant.content));
  const waitingForReason = Boolean(lastAssistant && /what is the reason|pick one option/i.test(lastAssistant.content));
  const waitingForReview = Boolean(lastAssistant && /please type your review/i.test(lastAssistant.content));
  const pendingReplace = Boolean(lastAssistant && /replace|replacement/i.test(lastAssistant.content));
  const pendingCancel = Boolean(lastAssistant && /\bcancel/i.test(lastAssistant.content));
  const gated = gateOffTopic(text, {
    hasImage: Boolean(input.imageUrl),
    orderIdInPlay: orderId,
    waitingForConfirm,
    waitingForReason: waitingForReason || waitingForReview,
  });
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

  async function finishAction(kind: "cancel" | "replace", reason: string) {
    if (!orderId) {
      return { reply: `Share the unique ID you want to ${kind}.`, attachments: [] as ChatAttachment[] };
    }
    const tool = kind === "cancel" ? "cancel_order" : "replace_order";
    const result = await runTool(tool, { orderId, reason }, ctx);
    if (!result.attachments.length) {
      return { reply: toolError(result.text, `Could not ${kind} that order.`), attachments: [] };
    }
    const order = (await getOrder(orderId))!;
    return { reply: thanksForFeedback(kind, order, reason), attachments: result.attachments };
  }

  if (waitingForReview && orderId) {
    const kind: "cancel" | "replace" = pendingReplace && !pendingCancel ? "replace" : pendingCancel ? "cancel" : pendingReplace ? "replace" : "cancel";
    return finishAction(kind, text);
  }

  if (waitingForReason && orderId) {
    const kind: "cancel" | "replace" = pendingReplace && !pendingCancel ? "replace" : "cancel";
    if (text.trim().toLowerCase() === CUSTOM_REASON.toLowerCase()) {
      return {
        reply: "Please type your review — what went wrong, or what you expected.",
        attachments: [],
      };
    }
    if (/^(yes|yeah|yep|ok|okay)$/i.test(text.trim())) {
      return reasonPrompt(kind, orderId);
    }
    return finishAction(kind, text);
  }

  if (wants(lower, /refund|money back|when.{0,20}(money|amount|upi)/)) {
    if (!orderId) return { reply: REFUND_REPLY, attachments: [] };
    const order = await getOrder(orderId);
    return { reply: order ? refundFor(order) : REFUND_REPLY, attachments: [] };
  }

  if (wants(lower, /cancel/)) {
    if (!orderId) return { reply: "Which unique ID should I cancel? Try SPT-DEMO-CNCL02.", attachments: [] };
    return reasonPrompt("cancel", orderId);
  }

  if (wants(lower, /replace|replacement|exchange/)) {
    if (!orderId) return { reply: "Share the unique ID of the delivered order you want replaced.", attachments: [] };
    return reasonPrompt("replace", orderId);
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
    if (!result.attachments.length) {
      return { reply: "I couldn't find that unique ID. Use a real ID such as SPT-DEMO-TRCK01.", attachments: [] };
    }
    return {
      reply: `Found ${orderId}. I can track it, cancel (if not shipped), replace after delivery, take COD via QR, or file a photo complaint.`,
      attachments: result.attachments,
    };
  }

  return { reply: SUPPORTER_INTRO, attachments: [] };
}
