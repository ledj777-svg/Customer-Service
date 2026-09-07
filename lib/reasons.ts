import type { ChatAttachment, Order } from "./types";

export const REASON_OPTIONS = [
  "Size doesn't fit",
  "Wrong colour",
  "Quality is not as expected",
  "Write my own review",
] as const;

export const CUSTOM_REASON = "Write my own review";

export const REFUND_REPLY =
  "The amount will be deposited to the registered UPI ID within 1 business day.";

export function isPresetReason(text: string) {
  const t = text.trim().toLowerCase();
  return REASON_OPTIONS.some((option) => option.toLowerCase() === t);
}

export function refundFor(order: Order) {
  if (order.paymentMethod === "cod" && order.paymentStatus !== "refunded" && order.paymentStatus !== "paid") {
    return "No payment was collected on this COD order, so there is no refund due.";
  }
  return REFUND_REPLY;
}

export function reasonPrompt(kind: "cancel" | "replace", orderId: string): {
  reply: string;
  attachments: ChatAttachment[];
} {
  const verb = kind === "cancel" ? "cancel" : "replace";
  return {
    reply: `What is the reason you want to ${verb} ${orderId}?\nPick one option below, or choose Write my own review to type your opinion.`,
    attachments: [{ type: "choices", options: [...REASON_OPTIONS] }],
  };
}

export function thanksForFeedback(kind: "cancel" | "replace", order: Order, reason: string) {
  const action = kind === "cancel" ? "cancellation" : "replacement";
  let reply = `Thank you for the feedback.\n\nYour ${action} for ${order.id} is confirmed.\nReason: ${reason}.`;
  if (kind === "cancel") reply += `\n\n${refundFor(order)}`;
  if (kind === "replace" && order.replacementId) {
    reply += `\nReplacement unique ID: ${order.replacementId}.`;
  }
  return reply;
}
