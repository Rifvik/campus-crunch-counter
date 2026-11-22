import { useEffect } from "react";
import { X } from "lucide-react";
import { getDriverById, getLocationById } from "@/lib/campus";
import { describeLine, formatAed, getOrderTotal, type Order } from "@/lib/types";

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const location = order.fulfillment === "delivery" ? getLocationById(order.locationId) : null;
  const driver = getDriverById(order.driverId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Receipt for Order #${order.id}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Set El Sham · Campus Canteen
            </span>
            <h2 className="mt-0.5 text-xl font-extrabold text-foreground">
              Order Receipt #{order.id}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close receipt"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-bold text-foreground">{order.customer}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Placed at</span>
            <span className="text-foreground">{order.createdTimeLabel}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Fulfillment</span>
            <span className="font-bold text-foreground">
              {location ? `Delivery · ${location.name}` : "Counter Pickup"}
            </span>
          </div>
          {order.deliveryNote && (
            <div className="mt-1 flex justify-between gap-4">
              <span className="text-muted-foreground">Note</span>
              <span className="text-right text-foreground">{order.deliveryNote}</span>
            </div>
          )}
          {order.cook && (
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Prepared by</span>
              <span className="text-foreground">{order.cook}</span>
            </div>
          )}
          {driver && (
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Campus Rider</span>
              <span className="text-foreground">
                {driver.name} ({driver.plate})
              </span>
            </div>
          )}

          <div className="my-3 space-y-1.5 border-y border-dashed border-border py-3">
            {order.lines.map((line) => (
              <div key={line.id} className="flex justify-between gap-3">
                <span className="text-foreground">{describeLine(line)}</span>
                <span className="shrink-0 font-bold text-foreground">
                  {formatAed(line.unitPrice * line.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Fee</span>
            <span>{location ? "FREE" : "N/A"}</span>
          </div>
          <div className="mt-1.5 flex justify-between text-sm font-extrabold text-foreground">
            <span>TOTAL</span>
            <span>{formatAed(getOrderTotal(order))}</span>
          </div>
        </div>

        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-primary-foreground transition hover:bg-primary-hover cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
