import { extractOrderId } from "./order-id";

export const SUPPORTER_INTRO = `I'm SUPPORTER — Cartly's customer support desk.

I only help with your orders. Here's what I can do:

• Track your package with the unique ID
• Cancel an order before it ships (confirmed or packed)
• Replace a delivered order within 7 days
• Generate a UPI QR to pay cash-on-delivery
• File a complaint with a photo of what you received

Share a unique order ID like SPT-XXXX-XXXXXX and tell me what you need.
Demo IDs: SPT-DEMO-TRCK01 (track + QR), SPT-DEMO-CNCL02 (cancel), SPT-DEMO-RPLC03 (replace / complaint).`;

const ON_TOPIC =
  /\b(order|orders|track|tracking|where.*package|courier|delivery|deliver|eta|cancel|replace|replacement|exchange|return|refund|cod|cash on delivery|upi|qr|pay|payment|paid|complaint|complain|damaged|broken|wrong item|missing|photo|image|upload|ticket|unique id|spt-|my bag|checkout|cartly|supporter|help)\b/i;

const CONFIRMING = /\b(yes|yeah|yep|confirm|go ahead|do it|please cancel|ha|haan|ok|okay)\b/i;
const GREETING = /^(hi|hello|hey|yo|sup|help|what can you do|who are you)[\s!.,?]*$/i;

export function isOrderContext(text: string, hasImage = false) {
  if (hasImage) return true;
  if (!text.trim()) return false;
  if (extractOrderId(text)) return true;
  return ON_TOPIC.test(text);
}

export function shouldReintroduce(text: string, opts?: { hasImage?: boolean; orderIdInPlay?: string }) {
  if (opts?.hasImage) return false;
  if (isOrderContext(text, opts?.hasImage)) return false;
  if (opts?.orderIdInPlay && CONFIRMING.test(text)) return false;
  return true;
}

export function offTopicReply() {
  return `That is outside what I handle.\n\n${SUPPORTER_INTRO}`;
}

export function gateOffTopic(text: string, opts?: { hasImage?: boolean; orderIdInPlay?: string }) {
  if (!text.trim() && !opts?.hasImage) return SUPPORTER_INTRO;
  if (GREETING.test(text.trim())) return SUPPORTER_INTRO;
  if (shouldReintroduce(text, opts)) return offTopicReply();
  return null;
}
