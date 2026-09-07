import { inr } from "./catalog";
import {
  cancelOrder,
  fileComplaint,
  getOrder,
  listOrders,
  markPaid,
  replaceOrder,
  snapshot,
} from "./orders";
import { paymentQr } from "./qr";
import { canCancel, canPayCod, canReplace } from "./tracking";
import type { ChatAttachment, Order } from "./types";

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "lookup_order",
      description: "Look up a Cartly order by its unique ID (SPT-XXXX-XXXXXX).",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string", description: "Unique order ID" } },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_recent_orders",
      description: "List recent orders for the current customer if they have shopped in this browser.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "track_order",
      description: "Get live courier location, route stops, and ETA for an order ID.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_order",
      description:
        "Cancel an order that is still confirmed or packed. Ask the customer to confirm before calling this.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["orderId", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "replace_order",
      description:
        "Create a free replacement shipment for a delivered order within 7 days. Confirm with the customer first.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["orderId", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_payment_qr",
      description: "Generate a UPI QR code so the customer can pay a pending cash-on-delivery order.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "mark_cod_paid",
      description: "Mark a COD order as paid after the customer confirms they scanned the QR.",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "file_complaint",
      description:
        "File a support ticket against an order. Use when the customer reports damage, wrong item, or quality issues. Include a description of any uploaded photo.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          description: { type: "string" },
          visionSummary: { type: "string", description: "What is visible in the uploaded photo" },
          imageUrl: { type: "string" },
        },
        required: ["orderId", "description"],
      },
    },
  },
];

type ToolCtx = {
  customerId?: string;
  imageUrl?: string;
};

function summarize(order: Order) {
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: inr(order.total),
    city: order.customer.city,
    items: order.items.map((i) => `${i.qty}× ${i.name}`),
    canCancel: canCancel(order.status),
    canReplace: canReplace(order),
    canPayCod: canPayCod(order),
    replacementId: order.replacementId,
    createdAt: order.createdAt,
  };
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCtx,
): Promise<{ text: string; attachments: ChatAttachment[] }> {
  const orderId = String(args.orderId ?? "").trim().toUpperCase();

  if (name === "list_recent_orders") {
    const orders = await listOrders(ctx.customerId);
    const mine = orders.slice(0, 8);
    if (!mine.length) {
      return {
        text: JSON.stringify({ orders: [], hint: "No orders yet. Use demo IDs SPT-DEMO-TRCK01, SPT-DEMO-CNCL02, SPT-DEMO-RPLC03." }),
        attachments: [],
      };
    }
    return {
      text: JSON.stringify({ orders: mine.map(summarize) }),
      attachments: mine.slice(0, 1).map((order) => ({ type: "order" as const, order, tracking: snapshot(order) })),
    };
  }

  if (name === "lookup_order" || name === "track_order") {
    const order = await getOrder(orderId);
    if (!order) return { text: JSON.stringify({ error: "Unknown order ID" }), attachments: [] };
    const tracking = snapshot(order);
    return {
      text: JSON.stringify({ order: summarize(order), tracking }),
      attachments: [
        name === "track_order"
          ? { type: "tracking", orderId: order.id, tracking }
          : { type: "order", order, tracking },
      ],
    };
  }

  if (name === "cancel_order") {
    const result = await cancelOrder(orderId, String(args.reason ?? "Requested in chat"));
    if (!result.ok) return { text: JSON.stringify({ error: result.error }), attachments: [] };
    return {
      text: JSON.stringify({ cancelled: true, order: summarize(result.order) }),
      attachments: [
        {
          type: "receipt",
          title: `Cancelled ${result.order.id}`,
          body: result.order.paymentStatus === "refunded" ? "Refund queued to original payment." : "COD was never collected.",
          tone: "warn",
        },
      ],
    };
  }

  if (name === "replace_order") {
    const result = await replaceOrder(orderId, String(args.reason ?? "Requested in chat"));
    if (!result.ok) return { text: JSON.stringify({ error: result.error }), attachments: [] };
    const attachments: ChatAttachment[] = [
      {
        type: "receipt",
        title: result.replacement ? `Replacement ${result.replacement.id}` : "Replacement already open",
        body: result.replacement
          ? `Original ${result.order.id} is flagged. Pickup of the old item will be arranged.`
          : result.message ?? "Replacement in progress.",
        tone: "ok",
      },
    ];
    if (result.replacement) {
      attachments.push({ type: "order", order: result.replacement, tracking: snapshot(result.replacement) });
    }
    return { text: JSON.stringify({ ...result, order: summarize(result.order), replacement: result.replacement ? summarize(result.replacement) : undefined }), attachments };
  }

  if (name === "generate_payment_qr") {
    const order = await getOrder(orderId);
    if (!order) return { text: JSON.stringify({ error: "Unknown order ID" }), attachments: [] };
    if (!canPayCod(order)) {
      return {
        text: JSON.stringify({ error: order.paymentStatus === "paid" ? "Already paid" : "QR not available" }),
        attachments: [],
      };
    }
    const qr = await paymentQr(order);
    return {
      text: JSON.stringify({ qr: { orderId: qr.orderId, amount: qr.amountLabel, upi: qr.upi } }),
      attachments: [
        {
          type: "qr",
          orderId: order.id,
          amount: order.total,
          upi: qr.upi,
          qrDataUrl: qr.qrDataUrl,
          paid: false,
        },
      ],
    };
  }

  if (name === "mark_cod_paid") {
    const result = await markPaid(orderId);
    if (!result.ok) return { text: JSON.stringify({ error: result.error }), attachments: [] };
    return {
      text: JSON.stringify({ paid: true, order: summarize(result.order) }),
      attachments: [
        {
          type: "receipt",
          title: `Payment received for ${result.order.id}`,
          body: `COD of ${inr(result.order.total)} is marked paid.`,
          tone: "ok",
        },
      ],
    };
  }

  if (name === "file_complaint") {
    const result = await fileComplaint({
      orderId,
      description: String(args.description ?? ""),
      visionSummary: args.visionSummary ? String(args.visionSummary) : undefined,
      imageUrl: args.imageUrl ? String(args.imageUrl) : ctx.imageUrl,
    });
    if (!result.ok) return { text: JSON.stringify({ error: result.error }), attachments: [] };
    return {
      text: JSON.stringify({ ticket: result.complaint }),
      attachments: [{ type: "complaint", complaint: result.complaint }],
    };
  }

  return { text: JSON.stringify({ error: `Unknown tool ${name}` }), attachments: [] };
}
