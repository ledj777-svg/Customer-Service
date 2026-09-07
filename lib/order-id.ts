export const ORDER_ID_RE = /SPT-[A-Z0-9]{4}-[A-Z0-9]{6}/i;

export function extractOrderId(text: string) {
  const match = text.toUpperCase().match(ORDER_ID_RE);
  return match ? match[0] : undefined;
}
