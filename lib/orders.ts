import { getProduct } from "./catalog";
import { newOrderId, newTicketId } from "./ids";
import { readStore, upsertOrder } from "./store";
import { canCancel, canPayCod, canReplace, liveStatus, snapshot } from "./tracking";
import type { CartItem, Complaint, Customer, Order, PaymentMethod } from "./types";

export function refreshOrder(order: Order): Order {
  const next = liveStatus(order);
  if (next !== order.status && next === "delivered" && !order.deliveredAt) {
    return { ...order, status: next, deliveredAt: new Date().toISOString() };
  }
  if (next !== order.status) return { ...order, status: next };
  return order;
}

export async function listOrders(customerId?: string) {
  const store = await readStore();
  const orders = store.orders.map(refreshOrder);
  if (!customerId) return orders;
  return orders.filter((o) => o.customer.id === customerId || o.customer.id === "cust_demo");
}

export async function getOrder(orderId: string) {
  const store = await readStore();
  const found = store.orders.find((o) => o.id.toUpperCase() === orderId.toUpperCase());
  if (!found) return undefined;
  const refreshed = refreshOrder(found);
  if (refreshed !== found) await upsertOrder(refreshed);
  return refreshed;
}

export async function createOrder(input: {
  customer: Customer;
  items: CartItem[];
  paymentMethod: PaymentMethod;
}) {
  const items = input.items.map((item) => {
    const product = getProduct(item.productId);
    return {
      productId: item.productId,
      name: product?.name ?? item.name,
      price: product?.price ?? item.price,
      image: product?.image ?? item.image,
      qty: item.qty,
    };
  });
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const prepaid = input.paymentMethod === "prepaid";
  const order: Order = {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    customer: input.customer,
    items,
    total,
    paymentMethod: input.paymentMethod,
    paymentStatus: prepaid ? "paid" : "pending",
    paidAt: prepaid ? new Date().toISOString() : undefined,
    status: "confirmed",
    complaints: [],
  };
  await upsertOrder(order);
  return order;
}

export async function cancelOrder(orderId: string, reason: string) {
  const order = await getOrder(orderId);
  if (!order) return { ok: false as const, error: "No order found for that unique ID." };
  if (!canCancel(order.status)) {
    return {
      ok: false as const,
      error: `Order ${order.id} is ${order.status.replaceAll("_", " ")} and can no longer be cancelled. Try a replacement after delivery.`,
    };
  }
  const next: Order = {
    ...order,
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    cancelReason: reason,
    paymentStatus: order.paymentStatus === "paid" ? "refunded" : order.paymentStatus,
  };
  await upsertOrder(next);
  return { ok: true as const, order: next };
}

export async function replaceOrder(orderId: string, reason: string) {
  const order = await getOrder(orderId);
  if (!order) return { ok: false as const, error: "No order found for that unique ID." };
  if (order.replacementId) {
    const existing = await getOrder(order.replacementId);
    return {
      ok: true as const,
      order,
      replacement: existing,
      message: `A replacement is already moving as ${order.replacementId}.`,
    };
  }
  if (!canReplace(order)) {
    return {
      ok: false as const,
      error: `Replacement is only available for delivered orders within 7 days. ${order.id} is currently ${order.status.replaceAll("_", " ")}.`,
    };
  }
  const replacement: Order = {
    id: newOrderId(),
    createdAt: new Date().toISOString(),
    customer: order.customer,
    items: order.items,
    total: order.total,
    paymentMethod: "prepaid",
    paymentStatus: "paid",
    paidAt: new Date().toISOString(),
    status: "confirmed",
    replacementOf: order.id,
    complaints: [],
  };
  const updated: Order = {
    ...order,
    status: "replacement_requested",
    replaceReason: reason,
    replacementId: replacement.id,
  };
  await upsertOrder(updated);
  await upsertOrder(replacement);
  return { ok: true as const, order: updated, replacement };
}

export async function markPaid(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return { ok: false as const, error: "No order found for that unique ID." };
  if (!canPayCod(order)) {
    return {
      ok: false as const,
      error:
        order.paymentStatus === "paid"
          ? `Order ${order.id} is already paid.`
          : `COD QR is not available for ${order.id}.`,
    };
  }
  const next: Order = {
    ...order,
    paymentStatus: "paid",
    paidAt: new Date().toISOString(),
  };
  await upsertOrder(next);
  return { ok: true as const, order: next };
}

export async function fileComplaint(input: {
  orderId: string;
  description: string;
  imageUrl?: string;
  visionSummary?: string;
}) {
  const order = await getOrder(input.orderId);
  if (!order) return { ok: false as const, error: "No order found for that unique ID." };
  if (order.status === "cancelled") {
    return { ok: false as const, error: "Cannot file a complaint on a cancelled order." };
  }
  const complaint: Complaint = {
    id: newTicketId(),
    ticketId: "",
    orderId: order.id,
    createdAt: new Date().toISOString(),
    description: input.description,
    imageUrl: input.imageUrl,
    visionSummary: input.visionSummary,
    status: "in_review",
  };
  complaint.ticketId = complaint.id;
  const next: Order = { ...order, complaints: [complaint, ...order.complaints] };
  await upsertOrder(next);
  return { ok: true as const, order: next, complaint };
}

export async function publicOrderView(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return undefined;
  return { order, tracking: snapshot(order) };
}

export { snapshot, canCancel, canPayCod, canReplace };
