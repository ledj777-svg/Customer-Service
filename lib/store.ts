import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Order, StoreShape } from "./types";
import { seedOrders } from "./seed";
import { writableDir } from "./runtime";

const DATA_DIR = writableDir("data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let memory: StoreShape | null = null;
let queue: Promise<void> = Promise.resolve();

function seedStore(): StoreShape {
  const seeded: StoreShape = { orders: seedOrders(), complaints: [] };
  seeded.complaints = seeded.orders.flatMap((o) => o.complaints);
  return seeded;
}

function withDemos(store: StoreShape): StoreShape {
  if (!store.orders) store.orders = [];
  if (!store.complaints) store.complaints = [];
  for (const demo of seedOrders()) {
    if (!store.orders.some((o) => o.id === demo.id)) store.orders.push(demo);
  }
  return store;
}

async function persist(store: StoreShape) {
  memory = store;
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(store), "utf8");
  } catch {
    // Serverless filesystems can be read-only outside /tmp. Memory still holds the store.
  }
}

async function readRaw(): Promise<StoreShape> {
  if (memory) return memory;
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    memory = withDemos(JSON.parse(raw) as StoreShape);
    return memory;
  } catch {
    memory = seedStore();
    await persist(memory);
    return memory;
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
    await persist(store);
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
