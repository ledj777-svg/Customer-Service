import { extractOrderId } from "./order-id";

export const SUPPORTER_INTRO = `I'm SUPPORTER — Cartly's customer support desk.

I only help with your orders. Here's what I can do:

• Track your package with the unique ID
• Cancel an order before it ships (confirmed or packed)
• Replace a delivered order within 7 days
• Generate a UPI QR to pay cash-on-delivery
• File a complaint with a photo of what you received

Share a unique order ID (SPT- then 4 characters, a dash, then 6 more) and tell me what you need.
Demo IDs: SPT-DEMO-TRCK01 (track + QR), SPT-DEMO-CNCL02 (cancel), SPT-DEMO-RPLC03 (replace / complaint).`;

const ON_TOPIC =
  /\b(order|orders|track|tracking|where.*package|courier|delivery|deliver|eta|cancel|replace|replacement|exchange|return|refund|money back|upi|qr|pay|payment|paid|complaint|complain|damaged|broken|wrong item|missing|photo|image|upload|ticket|unique id|spt-|my bag|checkout|cartly|supporter|help|size|colour|color|quality|review)\b/i;

const CONFIRMING = /\b(yes|yeah|yep|confirm|go ahead|do it|please cancel|ha|haan)\b/i;
const FILLER = /^(there|mate|bro|buddy|man|guys|team|dear|sir|mam|ji|friend|pal)$/;
const GREETING_REPLY = `Hey! I'm SUPPORTER, Cartly's order desk.

I can:
• Track your package
• Cancel an order before it ships
• Replace a delivered order
• Generate a COD payment QR
• File a complaint with a photo

Share a unique order ID (SPT- then 4 characters, a dash, then 6 more) and tell me what you need.`;
const ACK_REPLY =
  "You're welcome. I'm here if you need to track, cancel, replace, pay COD, or file a photo complaint.";

export function isGreeting(text: string) {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[!?.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || extractOrderId(t)) return false;
  if (/\b(track|cancel|replace|pay|qr|complaint|weather|code|joke|news)\b/i.test(t)) return false;
  if (/^(what'?s up|wassup|how are you|how r u|hows it going|good (morning|afternoon|evening|night)|who are you|what can you do|help me|help)$/.test(t)) {
    return true;
  }
  const lead = t.match(/^(hi|hello|hey|yo|sup|hiya|howdy|hola)\s*(.*)$/);
  if (!lead) return false;
  const rest = lead[2].trim();
  if (!rest) return true;
  return rest.split(" ").every((word) => FILLER.test(word));
}

export function isAcknowledgement(text: string) {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 80) return false;
  if (extractOrderId(t)) return false;
  if (/\b(track|cancel|replace|pay|qr|complaint|order|photo|upload|return|refund)\b/i.test(t)) return false;
  if (/thank/i.test(t) && t.split(/\s+/).length <= 8) return true;
  return /^(ok(ay)?|k|fine|thanks?( you)?|thx|ty|cool|great|got it|alright|sure|no problem|np|perfect|nice|done|cheers)([\s,!.]+(ok(ay)?|fine|thanks?( you)?|thx|ty))*[\s!.,?]*$/i.test(
    t,
  );
}

export function isOrderContext(text: string, hasImage = false) {
  if (hasImage) return true;
  if (!text.trim()) return false;
  if (extractOrderId(text)) return true;
  return ON_TOPIC.test(text);
}

export function shouldReintroduce(text: string, opts?: { hasImage?: boolean; orderIdInPlay?: string }) {
  if (opts?.hasImage) return false;
  if (isGreeting(text) || isAcknowledgement(text)) return false;
  if (isOrderContext(text, opts?.hasImage)) return false;
  if (opts?.orderIdInPlay && CONFIRMING.test(text)) return false;
  return true;
}

export function offTopicReply() {
  return `That is outside what I handle.\n\n${SUPPORTER_INTRO}`;
}

export function gateOffTopic(
  text: string,
  opts?: {
    hasImage?: boolean;
    orderIdInPlay?: string;
    waitingForConfirm?: boolean;
    waitingForReason?: boolean;
  },
) {
  if (!text.trim() && !opts?.hasImage) return GREETING_REPLY;
  if (opts?.waitingForReason) return null;
  if (isGreeting(text)) return GREETING_REPLY;
  if (isAcknowledgement(text) && !opts?.waitingForConfirm) return ACK_REPLY;
  if (shouldReintroduce(text, opts)) return offTopicReply();
  return null;
}
