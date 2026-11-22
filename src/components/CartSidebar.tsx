import { useMemo, useState } from "react";
import {
  Bike,
  Clock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  User,
  X,
} from "lucide-react";
import {
  HOSTEL_LOCATIONS,
  UNIVERSITY_LOCATIONS,
  getLocationById,
  type CampusLocationId,
} from "@/lib/campus";
import { POPULAR_ITEM_IDS, type MenuItem } from "@/lib/menu";
import { formatAed, formatDistance, type CartLine, type FulfillmentType } from "@/lib/types";

const QUICK_NAMES = ["Sara", "Rahul", "Fatima", "Alex"] as const;

export interface CheckoutFormState {
  customer: string;
  fulfillment: FulfillmentType;
  locationId: CampusLocationId;
  deliveryNote: string;
}

interface CartPanelProps {
  menu: ReadonlyArray<MenuItem>;
  cart: ReadonlyArray<CartLine>;
  cartSubtotal: number;
  cartItemCount: number;
  checkout: CheckoutFormState;
  onCheckoutChange: (next: CheckoutFormState) => void;
  onQuickAdd: (itemId: number) => void;
  onUpdateCartLineQty: (lineId: string, delta: number) => void;
  onRemoveCartLine: (lineId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: () => { ok: boolean; error?: string };
  onCloseDrawer?: () => void;
}

export function CartPanel({
  menu,
  cart,
  cartSubtotal,
  cartItemCount,
  checkout,
  onCheckoutChange,
  onQuickAdd,
  onUpdateCartLineQty,
  onRemoveCartLine,
  onClearCart,
  onPlaceOrder,
  onCloseDrawer,
}: CartPanelProps) {
  const [nameError, setNameError] = useState<string | null>(null);

  const popularItems = useMemo(
    () =>
      POPULAR_ITEM_IDS.map((id) => menu.find((m) => m.id === id)).filter(
        (m): m is MenuItem => m !== undefined,
      ),
    [menu],
  );

  const selectedLocation = getLocationById(checkout.locationId);
  const estimatedPrepSeconds = cart.length > 0 ? Math.max(...cart.map((l) => l.item.prep)) : 0;
  const estimatedTotalEta =
    cart.length > 0
      ? estimatedPrepSeconds +
        (checkout.fulfillment === "delivery" ? selectedLocation.rideSeconds + 1 : 0)
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkout.customer.trim()) {
      setNameError("Please enter your name so the kitchen & rider know who it's for.");
      return;
    }
    setNameError(null);
    const result = onPlaceOrder();
    if (!result.ok && result.error) {
      setNameError(result.error);
    }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${
        onCloseDrawer ? "h-full" : "max-h-[calc(100vh-7rem)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-xl bg-accent text-primary">
            <ShoppingBag className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground sm:text-base">Your Order</h2>
            <p className="text-[11px] text-muted-foreground">
              {cartItemCount === 0
                ? "Empty tray"
                : `${cartItemCount} item${cartItemCount > 1 ? "s" : ""} · Ready to fire`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-destructive cursor-pointer"
            >
              Clear
            </button>
          )}
          {onCloseDrawer && (
            <button
              type="button"
              aria-label="Close order drawer"
              onClick={onCloseDrawer}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Fulfillment segmented toggle */}
      <div className="px-4 pt-3">
        <div
          role="radiogroup"
          aria-label="Fulfillment method"
          className="grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={checkout.fulfillment === "delivery"}
            onClick={() => onCheckoutChange({ ...checkout, fulfillment: "delivery" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
              checkout.fulfillment === "delivery"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bike className="size-3.5 text-primary" />
            Campus Delivery
            <span className="rounded bg-ready px-1.5 py-0.5 text-[10px] font-extrabold text-ready-foreground">
              Free
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={checkout.fulfillment === "pickup"}
            onClick={() => onCheckoutChange({ ...checkout, fulfillment: "pickup" })}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
              checkout.fulfillment === "pickup"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="size-3.5 text-primary" />
            Counter Pickup
          </button>
        </div>
      </div>

      {/* Cart items or empty state */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-center">
            <p className="text-xs font-extrabold text-foreground">Start with a campus favorite</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              1-tap add below or pick any dish from the menu.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {popularItems.map((item) => {
                const soldOut = item.stock <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => onQuickAdd(item.id)}
                    className="flex items-center justify-between gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 text-left text-xs transition hover:border-primary/40 hover:bg-accent/50 disabled:opacity-45 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-foreground">{item.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {formatAed(item.price)}
                      </div>
                    </div>
                    <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Plus className="size-3" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {cart.map((line) => (
              <li
                key={line.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-background/70 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{line.item.name}</div>
                  {(line.cheese || line.large) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {line.cheese && (
                        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                          + Extra cheese
                        </span>
                      )}
                      {line.large && (
                        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                          + Large
                        </span>
                      )}
                    </div>
                  )}
                  {line.note && (
                    <p className="mt-1 truncate text-[11px] italic text-muted-foreground">
                      “{line.note}”
                    </p>
                  )}

                  <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.item.name}`}
                      onClick={() => onUpdateCartLineQty(line.id, -1)}
                      className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="min-w-5 text-center font-mono text-xs font-bold">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.item.name}`}
                      onClick={() => onUpdateCartLineQty(line.id, 1)}
                      className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-foreground">
                    {formatAed(line.unitPrice * line.qty)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${line.item.name} from order`}
                    onClick={() => onRemoveCartLine(line.id)}
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/12 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Express inline checkout */}
      <form onSubmit={handleSubmit} className="border-t border-border bg-muted/35 p-4">
        <div className="flex flex-col gap-2.5">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor={onCloseDrawer ? "checkout-name-mobile" : "checkout-name"}
                className="flex items-center gap-1.5 text-xs font-bold text-foreground"
              >
                <User className="size-3.5 text-primary" />
                Your Name
              </label>
              <div className="flex items-center gap-1">
                {QUICK_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setNameError(null);
                      onCheckoutChange({ ...checkout, customer: name });
                    }}
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                      checkout.customer === name
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <input
              id={onCloseDrawer ? "checkout-name-mobile" : "checkout-name"}
              type="text"
              value={checkout.customer}
              onChange={(e) => {
                if (nameError) setNameError(null);
                onCheckoutChange({ ...checkout, customer: e.target.value });
              }}
              placeholder="Enter name (e.g. Sara)"
              className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {checkout.fulfillment === "delivery" && (
            <>
              <div>
                <label
                  htmlFor={onCloseDrawer ? "checkout-loc-mobile" : "checkout-loc"}
                  className="flex items-center justify-between text-xs font-bold text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    Delivery Destination (Hostel / Uni)
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                    {formatDistance(selectedLocation.distanceMeters)} · ~
                    {selectedLocation.rideSeconds}s
                  </span>
                </label>
                <select
                  id={onCloseDrawer ? "checkout-loc-mobile" : "checkout-loc"}
                  value={checkout.locationId}
                  onChange={(e) =>
                    onCheckoutChange({
                      ...checkout,
                      locationId: e.target.value as CampusLocationId,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                >
                  <optgroup label="Hostels & Student Residences">
                    {HOSTEL_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({formatDistance(loc.distanceMeters)})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Major Universities">
                    {UNIVERSITY_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({formatDistance(loc.distanceMeters)})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={50}
                  aria-label="Drop-off note"
                  value={checkout.deliveryNote}
                  onChange={(e) => onCheckoutChange({ ...checkout, deliveryNote: e.target.value })}
                  placeholder="Optional note (e.g. Tower B lobby, Gate 2, Reception)"
                  className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </>
          )}

          {nameError && (
            <p role="alert" className="text-xs font-semibold text-destructive">
              {nameError}
            </p>
          )}

          <div className="space-y-1 border-t border-border/80 pt-2.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono font-semibold text-foreground">
                {formatAed(cartSubtotal)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{checkout.fulfillment === "delivery" ? "Campus delivery" : "Pickup"}</span>
              <span className="font-bold text-ready-foreground">
                {checkout.fulfillment === "delivery" ? "Free" : "Counter"}
              </span>
            </div>
            {cart.length > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" /> Estimated ready &amp; arrival
                </span>
                <span className="font-mono font-semibold text-foreground">
                  ~{estimatedTotalEta}s
                </span>
              </div>
            )}
            <div className="flex justify-between pt-0.5 text-base font-extrabold text-foreground">
              <span>Total</span>
              <span className="font-mono">{formatAed(cartSubtotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={cart.length === 0}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none cursor-pointer"
          >
            {cart.length === 0 ? "Add items to order" : `Place Order · ${formatAed(cartSubtotal)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
