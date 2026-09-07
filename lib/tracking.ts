import type { Order, OrderStatus, TrackingSnapshot, TrackingStop } from "./types";

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
};

const HUB_FOR: Record<string, string> = {
  Bengaluru: "Hyderabad",
  Chennai: "Bengaluru",
  Hyderabad: "Bengaluru",
  Pune: "Mumbai",
  Mumbai: "Pune",
  Delhi: "Jaipur",
  Kolkata: "Hyderabad",
  Jaipur: "Delhi",
  Kochi: "Bengaluru",
  Ahmedabad: "Mumbai",
};

const STATUS_FLOW: OrderStatus[] = [
  "confirmed",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
];

export function cityCoords(city: string) {
  return CITY_COORDS[city] ?? CITY_COORDS.Bengaluru;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function buildStops(order: Order): TrackingStop[] {
  const dest = order.customer.city;
  const destCoords = cityCoords(dest);
  const hub = HUB_FOR[dest] ?? "Hyderabad";
  const hubCoords = cityCoords(hub);
  const origin = cityCoords("Bengaluru");
  return [
    { code: "WH", label: "Cartly warehouse", city: "Bengaluru", lat: origin.lat, lng: origin.lng },
    { code: "HUB", label: "Sortation hub", city: hub, lat: hubCoords.lat, lng: hubCoords.lng },
    { code: "DC", label: "Local delivery centre", city: dest, lat: destCoords.lat + 0.04, lng: destCoords.lng - 0.03 },
    { code: "DOOR", label: "Your address", city: dest, lat: destCoords.lat, lng: destCoords.lng },
  ];
}

function progressFromAge(order: Order) {
  if (order.status === "cancelled") return 0;
  if (order.status === "replaced") return 1;
  if (order.status === "replacement_requested") return 1;
  if (order.id.startsWith("SPT-DEMO-")) {
    if (order.status === "delivered") return 1;
    if (order.status === "confirmed") return 0.08;
    if (order.status === "packed") return 0.22;
    if (order.status === "shipped") return 0.4;
    if (order.status === "in_transit") return 0.62;
    if (order.status === "out_for_delivery") return 0.82;
  }
  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const hours = ageMs / 3_600_000;
  if (hours < 2) return 0.08;
  if (hours < 6) return 0.22;
  if (hours < 18) return 0.4;
  if (hours < 36) return 0.62;
  if (hours < 48) return 0.82;
  return 1;
}

export function statusFromProgress(progress: number): OrderStatus {
  if (progress >= 0.98) return "delivered";
  if (progress >= 0.8) return "out_for_delivery";
  if (progress >= 0.55) return "in_transit";
  if (progress >= 0.35) return "shipped";
  if (progress >= 0.18) return "packed";
  return "confirmed";
}

export function canCancel(status: OrderStatus) {
  return status === "confirmed" || status === "packed";
}

export function canReplace(order: Order) {
  if (order.status !== "delivered" && order.status !== "replacement_requested") return false;
  const delivered = new Date(order.deliveredAt ?? order.createdAt).getTime();
  return Date.now() - delivered <= 7 * 24 * 3_600_000;
}

export function canPayCod(order: Order) {
  return order.paymentMethod === "cod" && order.paymentStatus === "pending" && order.status !== "cancelled";
}

export function liveStatus(order: Order): OrderStatus {
  if (
    order.status === "cancelled" ||
    order.status === "replaced" ||
    order.status === "replacement_requested" ||
    order.id.startsWith("SPT-DEMO-")
  ) {
    return order.status;
  }
  const next = statusFromProgress(progressFromAge(order));
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextIdx = STATUS_FLOW.indexOf(next);
  if (currentIdx === -1) return order.status;
  return nextIdx > currentIdx ? next : order.status;
}

export function snapshot(order: Order): TrackingSnapshot {
  const status = liveStatus(order);
  const stops = buildStops(order);
  const locked =
    status === "cancelled"
      ? 0
      : status === "delivered" || status === "replaced" || status === "replacement_requested"
        ? 1
        : progressFromAge(order);

  const progress =
    status === "confirmed"
      ? 0.08
      : status === "packed"
        ? 0.22
        : status === "shipped"
          ? 0.4
          : status === "in_transit"
            ? 0.62
            : status === "out_for_delivery"
              ? 0.82
              : locked;

  const segs = stops.length - 1;
  const x = Math.min(0.999, Math.max(0, progress));
  const seg = Math.min(segs - 1, Math.floor(x * segs));
  const t = x * segs - seg;
  const a = stops[seg];
  const b = stops[seg + 1];
  const lat = lerp(a.lat, b.lat, t);
  const lng = lerp(a.lng, b.lng, t);

  const reached = Math.round(progress * segs);
  const stamped = stops.map((stop, i) => ({
    ...stop,
    at: i <= reached ? new Date(new Date(order.createdAt).getTime() + i * 2.4 * 3_600_000).toISOString() : undefined,
  }));

  const headlines: Record<OrderStatus, string> = {
    confirmed: "Order confirmed. Warehouse is picking your items.",
    packed: "Packed and waiting for the line-haul truck.",
    shipped: "Left the Cartly warehouse in Bengaluru.",
    in_transit: `Moving through the ${stamped[1].city} hub.`,
    out_for_delivery: `Out for delivery in ${order.customer.city}.`,
    delivered: "Delivered. Keep your unique ID handy for returns.",
    cancelled: "This order was cancelled. Refund is queued if you had prepaid.",
    replacement_requested: "Replacement requested. A new shipment will be created.",
    replaced: "Replacement order is on the way.",
  };

  const etaDate = new Date(new Date(order.createdAt).getTime() + 12 * 3_600_000);
  return {
    status,
    progress,
    eta: etaDate.toISOString(),
    currentCity: progress < 0.35 ? "Bengaluru" : progress < 0.7 ? stamped[1].city : order.customer.city,
    headline: headlines[status],
    courier: "Cartly Express · rider #CE-441",
    lat,
    lng,
    stops: stamped,
  };
}
