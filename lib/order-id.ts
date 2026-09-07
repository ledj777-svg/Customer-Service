export const ORDER_ID_RE = /SPT-[A-Z0-9]{4}-[A-Z0-9]{6}/i;
export const ID_FORMAT = "SPT- then 4 characters, a dash, then 6 more";

function isPlaceholderId(id: string) {
  return /^SPT-X{4}-X{6}$/i.test(id);
}

export function extractOrderIds(text: string) {
  const found: string[] = [];
  const re = /SPT-[A-Z0-9]{4}-[A-Z0-9]{6}/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const id = match[0].toUpperCase();
    if (!isPlaceholderId(id) && !found.includes(id)) found.push(id);
  }
  return found;
}

export function extractOrderId(text: string) {
  return extractOrderIds(text)[0];
}

export function lastRealOrderId(
  messages: { role: string; content: string }[],
  active?: string,
) {
  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;
    const id = extractOrderId(message.content);
    if (id) return id;
  }
  for (const message of [...messages].reverse()) {
    const id = extractOrderId(message.content);
    if (id) return id;
  }
  if (active && !isPlaceholderId(active)) return active.toUpperCase();
  return undefined;
}
