import type { CampusLocationId, DriverProfile } from "@/lib/campus";
import type { MenuItem } from "@/lib/menu";

export type FulfillmentType = "delivery" | "pickup";

export type OrderStatus =
  "Placed" | "Preparing" | "Ready" | "OutForDelivery" | "Delivered" | "Collected";

export interface CartLine {
  id: string;
  item: MenuItem;
  cheese: boolean;
  large: boolean;
  note?: string | undefined;
  qty: number;
  unitPrice: number;
}

export interface OrderEvent {
  id: string;
  time: string;
  label: string;
  detail?: string | undefined;
}

export interface DriverMessage {
  id: string;
  sender: "user" | "driver";
  text: string;
  time: string;
}

export interface Order {
  id: number;
  customer: string;
  lines: CartLine[];
  fulfillment: FulfillmentType;
  locationId?: CampusLocationId | undefined;
  deliveryNote?: string | undefined;
  status: OrderStatus;
  cook?: string | undefined;
  driverId?: string | undefined;
  isUserOrder: boolean;
  createdAt: number;
  createdTimeLabel: string;
  prepSeconds: number;
  prepStartedAt?: number | undefined;
  readyAt?: number | undefined;
  deliveryStartedAt?: number | undefined;
  deliverySeconds?: number | undefined;
  doneAt?: number | undefined;
  events: OrderEvent[];
  driverMessages: DriverMessage[];
}

export interface CookState {
  name: string;
  order?: Order | undefined;
  progress: number;
  remainingSeconds: number;
}

export interface DriverFleetState {
  driver: DriverProfile;
  state: "available" | "delivering" | "returning";
  order?: Order | undefined;
  progress: number;
  remainingSeconds: number;
  lat: number;
  lng: number;
}

export const EXTRA_CHEESE_PRICE = 3;
export const LARGE_SIZE_PRICE = 4;

export function formatAed(amount: number): string {
  return `AED ${amount.toFixed(2)}`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function getLineKey(
  itemId: number,
  cheese: boolean,
  large: boolean,
  note?: string | undefined,
): string {
  const cleanNote = (note ?? "").trim().toLowerCase();
  return `${itemId}::c=${cheese ? 1 : 0}::l=${large ? 1 : 0}::n=${cleanNote}`;
}

export function describeLine(line: CartLine): string {
  const base = line.qty > 1 ? `${line.qty}× ${line.item.name}` : line.item.name;
  const extras = [line.cheese ? "Extra cheese" : "", line.large ? "Large" : ""].filter(Boolean);
  const withExtras = extras.length > 0 ? `${base} (${extras.join(", ")})` : base;
  return line.note ? `${withExtras} — "${line.note}"` : withExtras;
}

export function getOrderTotal(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
}

export function getOrderItemCount(order: Order): number {
  return order.lines.reduce((sum, line) => sum + line.qty, 0);
}

export function isOrderActive(order: Order): boolean {
  if (order.status === "Delivered" || order.status === "Collected") return false;
  if (order.status === "Ready" && order.fulfillment === "pickup") return false;
  return true;
}

export function getPrepProgress(order: Order, now: number): number {
  if (order.status === "Placed") return 0;
  if (
    order.status === "Ready" ||
    order.status === "OutForDelivery" ||
    order.status === "Delivered" ||
    order.status === "Collected"
  ) {
    return 1;
  }
  if (!order.prepStartedAt || order.prepSeconds <= 0) return 0;
  const elapsed = Math.max(0, now - order.prepStartedAt);
  return Math.min(1, elapsed / (order.prepSeconds * 1000));
}

export function getDeliveryProgress(order: Order, now: number): number {
  if (order.fulfillment !== "delivery") return 0;
  if (order.status === "Delivered") return 1;
  if (order.status !== "OutForDelivery" || !order.deliveryStartedAt || !order.deliverySeconds) {
    return 0;
  }
  const elapsed = Math.max(0, now - order.deliveryStartedAt);
  return Math.min(1, elapsed / (order.deliverySeconds * 1000));
}

export function getRemainingEtaSeconds(order: Order, now: number, locationRideSeconds = 0): number {
  if (order.status === "Delivered" || order.status === "Collected") return 0;
  if (order.fulfillment === "pickup" && order.status === "Ready") return 0;

  const rideSeconds = order.deliverySeconds ?? locationRideSeconds;

  if (order.status === "Placed") {
    return order.prepSeconds + (order.fulfillment === "delivery" ? rideSeconds + 1 : 0);
  }
  if (order.status === "Preparing") {
    const prepLeft = order.prepStartedAt
      ? Math.max(0, Math.ceil((order.prepStartedAt + order.prepSeconds * 1000 - now) / 1000))
      : order.prepSeconds;
    return prepLeft + (order.fulfillment === "delivery" ? rideSeconds + 1 : 0);
  }
  if (order.status === "Ready" && order.fulfillment === "delivery") {
    const dispatchLeft = order.readyAt
      ? Math.max(0, Math.ceil((order.readyAt + 1200 - now) / 1000))
      : 1;
    return dispatchLeft + rideSeconds;
  }
  if (order.status === "OutForDelivery" && order.deliveryStartedAt) {
    return Math.max(0, Math.ceil((order.deliveryStartedAt + rideSeconds * 1000 - now) / 1000));
  }
  return 0;
}

export function getStatusLabel(status: OrderStatus, fulfillment: FulfillmentType): string {
  switch (status) {
    case "Placed":
      return "Order Placed";
    case "Preparing":
      return "Cooking Now";
    case "Ready":
      return fulfillment === "delivery" ? "Packed · Awaiting Rider" : "Ready at Counter";
    case "OutForDelivery":
      return "Driver En Route";
    case "Delivered":
      return "Delivered";
    case "Collected":
      return "Picked Up";
  }
}
