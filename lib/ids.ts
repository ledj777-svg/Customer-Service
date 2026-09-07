import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function take(n: number) {
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function newOrderId() {
  return `SPT-${take(4)}-${take(6)}`;
}

export function newTicketId() {
  return `CMP-${take(4)}-${take(4)}`;
}

export function newCustomerId() {
  return `cust_${take(10).toLowerCase()}`;
}

export { ORDER_ID_RE, extractOrderId } from "./order-id";
