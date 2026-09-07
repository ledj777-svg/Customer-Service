import QRCode from "qrcode";
import { inr } from "./catalog";
import type { Order } from "./types";

export function upiPayload(order: Order) {
  const params = new URLSearchParams({
    pa: "cartly.payments@okaxis",
    pn: "Cartly SUPPORTER",
    am: order.total.toFixed(2),
    cu: "INR",
    tn: `Cartly order ${order.id}`,
    tr: order.id,
  });
  return `upi://pay?${params.toString()}`;
}

export async function paymentQr(order: Order) {
  const upi = upiPayload(order);
  const qrDataUrl = await QRCode.toDataURL(upi, {
    margin: 1,
    width: 360,
    color: { dark: "#10231f", light: "#f4efe6" },
  });
  return {
    orderId: order.id,
    amount: order.total,
    amountLabel: inr(order.total),
    upi,
    qrDataUrl,
    paid: order.paymentStatus === "paid",
  };
}
