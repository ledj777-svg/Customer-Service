import OpenAI from "openai";
import { fallbackAgent } from "./fallback-agent";
import { extractOrderId } from "./order-id";
import { gateOffTopic, SUPPORTER_INTRO } from "./intro";
import { runTool, TOOL_DEFINITIONS } from "./tools";
import type { ChatAttachment, ChatMessage } from "./types";

const SYSTEM = `You are SUPPORTER, Cartly's customer-support specialist.
Cartly is an Indian marketplace. Every order has a unique ID like SPT-XXXX-XXXXXX.

You can ONLY:
- look up and track orders (live courier location)
- cancel only while status is confirmed or packed
- replace a delivered order within 7 days (creates a new unique ID)
- generate a UPI QR for unpaid cash-on-delivery orders, then mark paid when the customer confirms
- file a complaint with an optional photo of the received item

Off-topic rule (strict):
- If the user asks anything not about Cartly orders, unique IDs, tracking, cancel, replace, COD/QR payment, or photo complaints — do not answer it.
- Do not chat about weather, news, coding, jokes, general knowledge, or other products.
- Instead, re-introduce yourself with this exact pitch:

${SUPPORTER_INTRO}

Greetings like hi/hello/help also get that introduction.
- If the user only says thanks, ok, fine, cool, or similar after you already helped, reply briefly. Do not look the order up again.

Rules:
- Never invent order data. Always call tools.
- Ask for the unique ID if it is missing.
- Confirm before cancel or replace.
- If the user uploaded a photo, inspect it, describe the issue plainly, then file_complaint.
- Keep replies short, warm, and specific. Mention the unique ID.
- Demo IDs: SPT-DEMO-TRCK01 (in transit, COD unpaid), SPT-DEMO-CNCL02 (fresh, cancellable), SPT-DEMO-RPLC03 (delivered).
- If the user writes Hindi or Hinglish, reply in the same mix — still stay on order support.`;

function client() {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function toApiMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM }];
  for (const msg of messages) {
    if (msg.role === "assistant") {
      out.push({ role: "assistant", content: msg.content });
      continue;
    }
    const parts: ContentPart[] = [{ type: "text", text: msg.content || "(photo attached)" }];
    if (msg.imageUrl) parts.push({ type: "image_url", image_url: { url: msg.imageUrl } });
    out.push({ role: "user", content: parts });
  }
  return out;
}

export async function runSupporter(input: {
  messages: ChatMessage[];
  customerId?: string;
  activeOrderId?: string;
  imageUrl?: string;
}): Promise<{ reply: string; attachments: ChatAttachment[]; engine: "grok" | "local" }> {
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  const lastText = lastUser?.content ?? "";
  const orderIdInPlay =
    extractOrderId(lastText) ??
    [...input.messages].reverse().map((m) => extractOrderId(m.content)).find(Boolean) ??
    input.activeOrderId;
  const lastAssistant = [...input.messages].reverse().find((m) => m.role === "assistant");
  const gated = lastUser
    ? gateOffTopic(lastText, {
        hasImage: Boolean(lastUser.imageUrl || input.imageUrl),
        orderIdInPlay,
        waitingForConfirm: Boolean(lastAssistant && /reply yes|to confirm/i.test(lastAssistant.content)),
      })
    : SUPPORTER_INTRO;
  if (gated) {
    return { reply: gated, attachments: [], engine: client() ? "grok" : "local" };
  }

  const grok = client();
  if (!grok) {
    const local = await fallbackAgent(input);
    return { ...local, engine: "local" };
  }

  const apiMessages = toApiMessages(input.messages);
  if (input.activeOrderId) {
    apiMessages.splice(1, 0, {
      role: "system",
      content: `Active unique ID in the widget: ${input.activeOrderId}. Customer browser id: ${input.customerId ?? "unknown"}.`,
    });
  }

  const attachments: ChatAttachment[] = [];
  let lastImage = input.imageUrl ?? [...input.messages].reverse().find((m) => m.imageUrl)?.imageUrl;

  for (let step = 0; step < 6; step++) {
    const completion = await grok.chat.completions.create({
      model: "grok-4.6",
      messages: apiMessages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      temperature: 0.4,
    });
    const message = completion.choices[0]?.message;
    if (!message) break;

    if (message.tool_calls?.length) {
      apiMessages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      });
      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const args = safeJson(call.function.arguments);
        if (lastImage && call.function.name === "file_complaint" && !args.imageUrl) {
          args.imageUrl = lastImage;
        }
        const result = await runTool(call.function.name, args, {
          customerId: input.customerId,
          imageUrl: lastImage,
        });
        attachments.push(...result.attachments);
        apiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.text,
        });
      }
      continue;
    }

    const reply = (message.content ?? "").trim() || "I'm here. Share a unique order ID and I will take it from there.";
    return { reply, attachments, engine: "grok" };
  }

  const local = await fallbackAgent(input);
  return { reply: local.reply, attachments: attachments.length ? attachments : local.attachments, engine: "grok" };
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
