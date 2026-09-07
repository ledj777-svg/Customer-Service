import { extractOrderId, lastRealOrderId } from "./order-id";
import { gateOffTopic, SUPPORTER_INTRO } from "./intro";
import { reasonPrompt, REFUND_REPLY, refundFor, thanksForFeedback } from "./reasons";
import { getOrder } from "./orders";
import { runTool } from "./tools";
import type { ChatAttachment, ChatMessage } from "./types";

type Result = { reply: string; attachments: ChatAttachment[] };
type Action = "track" | "cancel" | "replace" | "pay" | "complaint";

function lastUser(messages: ChatMessage[]) {
  return [...messages].reverse().find((m) => m.role === "user");
}

function wants(text: string, words: RegExp) {
  return words.test(text);
}

function actionFromText(text: string): Action | undefined {
  const t = text.toLowerCase();
  if (/\bcancel\b/.test(t)) return "cancel";
  if (/\breplace|replacement|exchange\b/.test(t)) return "replace";
  if (/\bcomplaint|damaged|broken|wrong item\b/.test(t)) return "complaint";
  if (/\b(qr|upi|pay|cod|cash on delivery)\b/.test(t) && !/\brefund\b/.test(t)) return "pay";
  if (/\btrack|where is|location|status|eta\b/.test(t)) return "track";
}

function actionFromAssistant(content?: string): Action | undefined {
  if (!content) return;
  const t = content.toLowerCase();
  if (/to cancel your order|want to cancel/.test(t)) return "cancel";
  if (/to replace your order|want to replace/.test(t)) return "replace";
  if (/file a complaint/.test(t)) return "complaint";
  if (/cod qr|payment qr/.test(t)) return "pay";
  if (/to track your order/.test(t)) return "track";
}

function askForId(action: Action): Result {
  const labels: Record<Action, string> = {
    track: "track your order",
    cancel: "cancel your order",
    replace: "replace your order",
    pay: "generate the COD QR",
    complaint: "file a complaint",
  };
  return {
    reply: `Please enter your unique order ID to ${labels[action]}.\nTap TRCK01, CNCL02, or RPLC03 below, or paste your ID, then send.`,
    attachments: [],
  };
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
  const idInMessage = extractOrderId(text);
  const ctx = { customerId: input.customerId, imageUrl: input.imageUrl };
  const confirmed = /\b(yes|yeah|yep|confirm|go ahead|do it|please cancel|ha|haan)\b/i.test(text);
  const chosen = actionFromText(text);

  const lastAssistant = [...input.messages].reverse().find((m) => m.role === "assistant");
  const waitingForConfirm = Boolean(lastAssistant && /reply yes|to confirm/i.test(lastAssistant.content));
  const waitingForReason = Boolean(lastAssistant && /what is the reason|pick one option/i.test(lastAssistant.content));
  const pendingReplace = Boolean(lastAssistant && /replace|replacement/i.test(lastAssistant.content));
  const pendingCancel = Boolean(lastAssistant && /\bcancel/i.test(lastAssistant.content));
  const pendingAction = actionFromAssistant(lastAssistant?.content);
  const orderId = idInMessage ?? lastRealOrderId(input.messages, input.activeOrderId);
  const gated = gateOffTopic(text, {
    hasImage: Boolean(input.imageUrl),
    orderIdInPlay: orderId,
    waitingForConfirm,
    waitingForReason,
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

  if (chosen && !idInMessage) {
    return askForId(chosen);
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

  if (waitingForReason && orderId) {
    const kind: "cancel" | "replace" = pendingReplace && !pendingCancel ? "replace" : "cancel";
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

  const action = chosen ?? (idInMessage ? pendingAction : undefined);

  if (action === "cancel") {
    if (!orderId) return askForId("cancel");
    return reasonPrompt("cancel", orderId);
  }

  if (action === "replace") {
    if (!orderId) return askForId("replace");
    return reasonPrompt("replace", orderId);
  }

  if (action === "pay" || (wants(lower, /paid|i paid|payment done|scanned/) && orderId)) {
    if (!orderId) return askForId("pay");
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

  if (action === "complaint") {
    if (!orderId) return askForId("complaint");
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

  if (action === "track") {
    if (!orderId) return askForId("track");
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

  if (wants(lower, /track|cancel|replace|pay|qr|cod|complaint|refund/)) {
    return {
      reply: "That's something I can help with. Send your unique order ID and I'll take the next step.",
      attachments: [],
    };
  }

  return { reply: SUPPORTER_INTRO, attachments: [] };
}
