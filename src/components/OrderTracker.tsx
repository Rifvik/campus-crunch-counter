import { useMemo } from "react";
import {
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Gauge,
  MapPin,
  MessageSquare,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Send,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { DeliveryMap } from "@/components/DeliveryMap";
import { DRIVER_QUICK_PINGS, getDriverById, getLocationById } from "@/lib/campus";
import {
  describeLine,
  formatAed,
  formatDistance,
  getDeliveryProgress,
  getOrderTotal,
  getPrepProgress,
  getRemainingEtaSeconds,
  getStatusLabel,
  isOrderActive,
  type DriverFleetState,
  type Order,
} from "@/lib/types";

interface OrderTrackerProps {
  orders: ReadonlyArray<Order>;
  trackedOrder: Order | null;
  now: number;
  driverFleetStates: ReadonlyArray<DriverFleetState>;
  onSelectOrder: (orderId: number) => void;
  onBrowseMenu: () => void;
  onTryDemoDelivery: () => void;
  onViewReceipt: (order: Order) => void;
  onMarkCollected: (orderId: number) => void;
  onReorder: (order: Order) => void;
  onSendDriverPing: (orderId: number, message: string, reply: string) => void;
}

function getStatusBadgeClasses(status: Order["status"]): string {
  switch (status) {
    case "Placed":
      return "bg-placed text-placed-foreground";
    case "Preparing":
      return "bg-prep text-prep-foreground";
    case "Ready":
      return "bg-ready text-ready-foreground";
    case "OutForDelivery":
      return "bg-delivery text-delivery-foreground";
    case "Delivered":
    case "Collected":
      return "bg-done text-done-foreground";
  }
}

export function OrderTracker({
  orders,
  trackedOrder,
  now,
  driverFleetStates,
  onSelectOrder,
  onBrowseMenu,
  onTryDemoDelivery,
  onViewReceipt,
  onMarkCollected,
  onReorder,
  onSendDriverPing,
}: OrderTrackerProps) {
  // Sort user's orders first, then active orders, newest first
  const switcherOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.isUserOrder !== b.isUserOrder) return a.isUserOrder ? -1 : 1;
      const aActive = isOrderActive(a);
      const bActive = isOrderActive(b);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.id - a.id;
    });
  }, [orders]);

  if (!trackedOrder) {
    return (
      <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
          <Bike className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-foreground">No active order to track</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Order fresh food from Set El Sham or launch a 1-click live campus delivery demo to watch
          the kitchen cooks and delivery driver in real time.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBrowseMenu}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted cursor-pointer"
          >
            <UtensilsCrossed className="size-4 text-primary" />
            Browse Menu
          </button>
          <button
            type="button"
            onClick={onTryDemoDelivery}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary-hover cursor-pointer"
          >
            <Bike className="size-4" />
            Try Live Delivery Demo
          </button>
        </div>
      </section>
    );
  }

  const location = getLocationById(trackedOrder.locationId);
  const driver = getDriverById(trackedOrder.driverId);
  const etaSeconds = getRemainingEtaSeconds(trackedOrder, now, location.rideSeconds);
  const prepPct = Math.round(getPrepProgress(trackedOrder, now) * 100);
  const deliveryPct = Math.round(getDeliveryProgress(trackedOrder, now) * 100);
  const remainingMeters =
    trackedOrder.status === "Delivered"
      ? 0
      : trackedOrder.status === "OutForDelivery"
        ? Math.max(15, Math.round(location.distanceMeters * (1 - deliveryPct / 100)))
        : location.distanceMeters;

  const isCompleted = trackedOrder.status === "Delivered" || trackedOrder.status === "Collected";
  const isReadyPickup = trackedOrder.fulfillment === "pickup" && trackedOrder.status === "Ready";

  const steps =
    trackedOrder.fulfillment === "delivery"
      ? [
          { id: "Placed", label: "Placed", icon: Clock },
          { id: "Preparing", label: "Preparing", icon: Flame },
          { id: "Ready", label: "Packed", icon: PackageCheck },
          { id: "OutForDelivery", label: "On the Way", icon: Bike },
          { id: "Delivered", label: "Delivered", icon: CheckCircle2 },
        ]
      : [
          { id: "Placed", label: "Placed", icon: Clock },
          { id: "Preparing", label: "Preparing", icon: Flame },
          { id: "Ready", label: "Ready at Counter", icon: CheckCircle2 },
        ];

  const currentStepIndex =
    trackedOrder.status === "Collected"
      ? steps.length - 1
      : Math.max(
          0,
          steps.findIndex((s) => s.id === trackedOrder.status),
        );

  const progressTrackPercent =
    trackedOrder.fulfillment === "delivery"
      ? trackedOrder.status === "Delivered"
        ? 100
        : trackedOrder.status === "OutForDelivery"
          ? 75 + deliveryPct * 0.25
          : trackedOrder.status === "Ready"
            ? 50
            : trackedOrder.status === "Preparing"
              ? 25 + prepPct * 0.25
              : 6
      : trackedOrder.status === "Ready" || trackedOrder.status === "Collected"
        ? 100
        : trackedOrder.status === "Preparing"
          ? 50 + prepPct * 0.5
          : 10;

  return (
    <div className="flex flex-col gap-5">
      {/* Multi-order switcher pills */}
      {switcherOrders.length > 1 && (
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {switcherOrders.slice(0, 14).map((ord) => {
            const active = ord.id === trackedOrder.id;
            const live = isOrderActive(ord);
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => onSelectOrder(ord.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    live
                      ? active
                        ? "bg-white animate-pulse"
                        : "bg-primary animate-pulse"
                      : active
                        ? "bg-white/75"
                        : "bg-emerald-500"
                  }`}
                />
                <span>#{ord.id}</span>
                <span className={active ? "text-white/90" : "text-muted-foreground"}>
                  {ord.customer}
                </span>
                {ord.isUserOrder && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-accent text-accent-foreground"
                    }`}
                  >
                    Yours
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Hero Tracking Card */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        {/* Top order header */}
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-extrabold text-foreground">
                Order #{trackedOrder.id}
              </span>
              {trackedOrder.isUserOrder && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold text-accent-foreground">
                  Your Order
                </span>
              )}
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${getStatusBadgeClasses(trackedOrder.status)}`}
              >
                {getStatusLabel(trackedOrder.status, trackedOrder.fulfillment)}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{trackedOrder.customer}</span>
              <span>·</span>
              {trackedOrder.fulfillment === "delivery" ? (
                <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>
                    Delivery to {location.name}
                    {trackedOrder.deliveryNote ? ` (${trackedOrder.deliveryNote})` : ""}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                      location.category === "hostel"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                    }`}
                  >
                    {location.category === "hostel" ? "Hostel" : "University"}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Store className="size-3.5 text-primary" />
                  Counter Pickup · Set El Sham
                </span>
              )}
              <span>·</span>
              <span className="font-mono font-semibold text-foreground">
                {formatAed(getOrderTotal(trackedOrder))}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isCompleted && !isReadyPickup ? (
              <div className="rounded-xl border border-primary/25 bg-accent/60 px-3.5 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Estimated ETA
                </div>
                <div className="font-mono text-lg font-extrabold leading-tight text-primary">
                  {etaSeconds}s
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-ready bg-ready/60 px-3.5 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ready-foreground">
                  Status
                </div>
                <div className="text-sm font-extrabold leading-tight text-ready-foreground">
                  {trackedOrder.status === "Delivered"
                    ? "Arrived!"
                    : trackedOrder.status === "Collected"
                      ? "Picked Up"
                      : "Ready Now!"}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => onViewReceipt(trackedOrder)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted cursor-pointer"
            >
              <ReceiptText className="size-4 text-primary" />
              Receipt
            </button>

            {isReadyPickup && (
              <button
                type="button"
                onClick={() => onMarkCollected(trackedOrder.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-xs transition hover:bg-primary-hover cursor-pointer"
              >
                <Check className="size-4" />
                Mark Collected
              </button>
            )}

            {isCompleted && (
              <button
                type="button"
                onClick={() => onReorder(trackedOrder)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-xs transition hover:bg-primary-hover cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Reorder
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Stepper */}
        <div className="mt-5">
          <div className="relative mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted || isReadyPickup ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, Math.max(4, progressTrackPercent))}%` }}
            />
          </div>

          <div
            className={`grid gap-2 ${
              steps.length === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-3"
            }`}
          >
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const done =
                isCompleted ||
                (isReadyPickup && idx === steps.length - 1) ||
                idx < currentStepIndex;
              const current = !isCompleted && !isReadyPickup && idx === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                    current
                      ? "border-primary bg-accent/70 shadow-xs"
                      : done
                        ? "border-ready bg-ready/45"
                        : "border-border/70 bg-background/60 opacity-60"
                  }`}
                >
                  <div
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      current
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done && !current ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-extrabold text-foreground">
                      {step.label}
                    </div>
                    <div className="truncate text-[11px] font-medium text-muted-foreground">
                      {current && step.id === "Preparing" && trackedOrder.cook
                        ? `${trackedOrder.cook} · ${prepPct}%`
                        : current && step.id === "OutForDelivery"
                          ? `${deliveryPct}% · ${formatDistance(remainingMeters)}`
                          : current
                            ? "In progress"
                            : done
                              ? "Complete"
                              : "Pending"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dish summary chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {trackedOrder.lines.map((line) => (
            <span
              key={line.id}
              className="rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold text-foreground"
            >
              {describeLine(line)}
            </span>
          ))}
          {trackedOrder.cook && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-prep/70 px-2.5 py-1 text-xs font-bold text-prep-foreground">
              <ChefHat className="size-3.5" />
              {trackedOrder.cook}
            </span>
          )}
        </div>

        {/* Live Delivery Driver Tracker Section (Map + Driver Profile + Quick Ping) */}
        {trackedOrder.fulfillment === "delivery" && (
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
            <DeliveryMap order={trackedOrder} now={now} driverFleetStates={driverFleetStates} />

            {/* Driver Telemetry & Quick Ping Card */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-background/80 p-4">
              {driver ? (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                        {trackedOrder.status === "Delivered"
                          ? "Delivered By"
                          : "Assigned Campus Rider"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 font-mono text-xs font-bold text-foreground border border-border">
                        <Star className="size-3 fill-amber-400 text-amber-500" />
                        {driver.rating.toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white shadow-xs"
                        style={{ backgroundColor: driver.accentHue }}
                      >
                        {driver.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-extrabold text-foreground">
                          {driver.name}
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground">
                          {driver.vehicle} · Plate{" "}
                          <span className="font-mono font-bold text-foreground">
                            {driver.plate}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Live telemetry strip */}
                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">
                          Distance
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-extrabold text-foreground">
                          {formatDistance(remainingMeters)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">
                          Speed
                        </div>
                        <div className="mt-0.5 flex items-center justify-center gap-1 font-mono text-sm font-extrabold text-foreground">
                          <Gauge className="size-3 text-primary" />
                          {trackedOrder.status === "OutForDelivery" ? driver.speedKmh : 0} km/h
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                        <div className="text-[10px] font-bold uppercase text-muted-foreground">
                          ETA
                        </div>
                        <div className="mt-0.5 font-mono text-sm font-extrabold text-primary">
                          {trackedOrder.status === "Delivered" ? "0s" : `${etaSeconds}s`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Ping & Driver Messages */}
                  <div className="border-t border-border pt-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <MessageSquare className="size-3.5 text-primary" />
                      Quick Ping Driver
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DRIVER_QUICK_PINGS.map((ping) => (
                        <button
                          key={ping.id}
                          type="button"
                          onClick={() =>
                            onSendDriverPing(trackedOrder.id, ping.message, ping.reply)
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground transition hover:border-primary hover:bg-accent cursor-pointer"
                        >
                          <Send className="size-2.5 text-primary" />
                          {ping.label}
                        </button>
                      ))}
                    </div>

                    {trackedOrder.driverMessages.length > 0 && (
                      <div className="mt-3 max-h-32 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-card p-2.5">
                        {trackedOrder.driverMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col rounded-lg px-2.5 py-1.5 text-xs ${
                              msg.sender === "user"
                                ? "ml-4 bg-primary/10 text-foreground"
                                : "mr-4 bg-muted text-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-muted-foreground">
                              <span>
                                {msg.sender === "user" ? "You" : driver.name.split(" ")[0]}
                              </span>
                              <span className="font-mono">{msg.time}</span>
                            </div>
                            <p className="mt-0.5 font-medium">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-prep-foreground">
                      Campus Rider Dispatch
                    </span>
                    <h3 className="mt-1.5 text-base font-extrabold text-foreground">
                      {trackedOrder.status === "Ready"
                        ? "Packing bag & assigning nearest rider..."
                        : "Rider will be assigned once kitchen finishes"}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Destination: <strong className="text-foreground">{location.name}</strong> (
                      {formatDistance(location.distanceMeters)} · ~{location.rideSeconds}s ride once
                      dispatched)
                    </p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                    <div className="text-[11px] font-bold text-muted-foreground">
                      Standby Campus Fleet
                    </div>
                    {driverFleetStates.map((fleet) => (
                      <div
                        key={fleet.driver.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="grid size-6 place-items-center rounded-full text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: fleet.driver.accentHue }}
                          >
                            {fleet.driver.initials}
                          </span>
                          <span className="font-bold text-foreground">{fleet.driver.name}</span>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            fleet.state === "available"
                              ? "bg-ready text-ready-foreground"
                              : "bg-delivery text-delivery-foreground"
                          }`}
                        >
                          {fleet.state === "available"
                            ? "Ready at Canteen"
                            : fleet.state === "returning"
                              ? `Returning (${fleet.remainingSeconds}s)`
                              : `Delivering #${fleet.order?.id ?? ""}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compact Live Activity Timeline */}
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Live Order Timeline
          </h3>
          <ol className="mt-2.5 flex flex-wrap gap-2">
            {trackedOrder.events.map((evt) => (
              <li
                key={evt.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs"
              >
                <span className="font-mono text-[11px] font-bold text-primary">{evt.time}</span>
                <span className="font-bold text-foreground">{evt.label}</span>
                {evt.detail && <span className="text-muted-foreground">· {evt.detail}</span>}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
