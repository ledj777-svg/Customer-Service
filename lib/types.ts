export type OrderStatus =
  | "confirmed"
  | "packed"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "replacement_requested"
  | "replaced";

export type PaymentMethod = "cod" | "prepaid";
export type PaymentStatus = "pending" | "paid" | "refunded";
export type ComplaintStatus = "open" | "in_review" | "resolved";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  mrp: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  qty: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
};

export type TrackingStop = {
  code: string;
  label: string;
  city: string;
  lat: number;
  lng: number;
  at?: string;
};

export type TrackingSnapshot = {
  status: OrderStatus;
  progress: number;
  eta: string;
  currentCity: string;
  headline: string;
  courier: string;
  lat: number;
  lng: number;
  stops: TrackingStop[];
};

export type Complaint = {
  id: string;
  ticketId: string;
  orderId: string;
  createdAt: string;
  description: string;
  imageUrl?: string;
  visionSummary?: string;
  status: ComplaintStatus;
};

export type Order = {
  id: string;
  createdAt: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  cancelledAt?: string;
  cancelReason?: string;
  replacementOf?: string;
  replacementId?: string;
  replaceReason?: string;
  paidAt?: string;
  deliveredAt?: string;
  complaints: Complaint[];
};

export type StoreShape = {
  orders: Order[];
  complaints: Complaint[];
};

export type ChatRole = "user" | "assistant";

export type ChatAttachment =
  | { type: "order"; order: Order; tracking: TrackingSnapshot }
  | { type: "tracking"; orderId: string; tracking: TrackingSnapshot }
  | {
      type: "qr";
      orderId: string;
      amount: number;
      upi: string;
      qrDataUrl: string;
      paid: boolean;
    }
  | { type: "complaint"; complaint: Complaint }
  | { type: "receipt"; title: string; body: string; tone: "ok" | "warn" | "info" };

export type ChatMessage = {
  role: ChatRole;
  content: string;
  imageUrl?: string;
  attachments?: ChatAttachment[];
};

export type ChatRequest = {
  messages: ChatMessage[];
  customerId?: string;
  activeOrderId?: string;
};
