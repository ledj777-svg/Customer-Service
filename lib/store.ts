import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Order, StoreShape } from "./types";
import { seedOrders } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let queue: Promise<void> = Promise.resolve();

async function readRaw(): Promise<StoreShape> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.complaints) parsed.complaints = [];
    for (const demo of seedOrders()) {
      if (!parsed.orders.some((o) => o.id === demo.id)) parsed.orders.push(demo);
    }
    return parsed;
  } catch {
    const seeded: StoreShape = { orders: seedOrders(), complaints: [] };
    seeded.complaints = seeded.orders.flatMap((o) => o.complaints);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function withStore<T>(fn: (store: StoreShape) => Promise<T> | T): Promise<T> {
  return enqueue(async () => {
    const store = await readRaw();
    const result = await fn(store);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
    return result;
  });
}

export function readStore() {
  return enqueue(() => readRaw());
}

export function upsertOrder(order: Order) {
  return withStore((store) => {
    const idx = store.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) store.orders[idx] = order;
    else store.orders.unshift(order);
    store.complaints = store.orders.flatMap((o) => o.complaints);
    return order;
  });
}
