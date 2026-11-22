import {
  Bike,
  ChefHat,
  Clock,
  Flame,
  MapPin,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Store,
} from "lucide-react";
import { getDriverById, getLocationById } from "@/lib/campus";
import {
  describeLine,
  formatAed,
  getDeliveryProgress,
  getOrderTotal,
  getPrepProgress,
  type CookState,
  type DriverFleetState,
  type Order,
} from "@/lib/types";

interface KitchenBoardProps {
  orders: ReadonlyArray<Order>;
  now: number;
  trackedOrderId: number | null;
  cookStates: ReadonlyArray<CookState>;
  driverFleetStates: ReadonlyArray<DriverFleetState>;
  hasLowOrOutStock: boolean;
  onSelectOrder: (orderId: number) => void;
  onRestockMenu: () => void;
  onViewReceipt: (order: Order) => void;
  onReorder: (order: Order) => void;
}

export function KitchenBoard({
  orders,
  now,
  trackedOrderId,
  cookStates,
  driverFleetStates,
  hasLowOrOutStock,
  onSelectOrder,
  onRestockMenu,
  onViewReceipt,
  onReorder,
}: KitchenBoardProps) {
  const queued = orders.filter((o) => o.status === "Placed");
  const cooking = orders.filter((o) => o.status === "Preparing");
  const ready = orders.filter((o) => o.status === "Ready");
  const outForDelivery = orders.filter((o) => o.status === "OutForDelivery");

  const history = orders
    .filter(
      (o) =>
        o.status === "Delivered" ||
        o.status === "Collected" ||
        (o.status === "Ready" && o.fulfillment === "pickup"),
    )
    .sort(
      (a, b) => (b.doneAt ?? b.readyAt ?? b.createdAt) - (a.doneAt ?? a.readyAt ?? a.createdAt),
    );

  const lanes = [
    {
      id: "queued",
      title: "Queued",
      badgeClass: "bg-placed text-placed-foreground",
      items: queued,
      emptyText: "No orders waiting",
    },
    {
      id: "cooking",
      title: "Cooking",
      badgeClass: "bg-prep text-prep-foreground",
      items: cooking,
      emptyText: "Cooks on standby",
    },
    {
      id: "ready",
      title: "Ready / Dispatch",
      badgeClass: "bg-ready text-ready-foreground",
      items: ready,
      emptyText: "None waiting",
    },
    {
      id: "delivery",
      title: "Out for Delivery",
      badgeClass: "bg-delivery text-delivery-foreground",
      items: outForDelivery,
      emptyText: "No active rides",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Live Operations Strip: 3 Cooks + 3 Campus Riders */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-foreground">Live Kitchen &amp; Fleet</h2>
            <p className="text-xs text-muted-foreground">
              Click any order card below to focus it in the Live Tracker &amp; GPS map above.
            </p>
          </div>
          {hasLowOrOutStock && (
            <button
              type="button"
              onClick={onRestockMenu}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-accent px-3.5 py-2 text-xs font-extrabold text-accent-foreground transition hover:bg-primary hover:text-primary-foreground cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              Restock Kitchen
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* 3 Cooks */}
          <div className="rounded-xl border border-border bg-background/70 p-3.5">
            <div className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <ChefHat className="size-3.5 text-primary" />
              Kitchen Line (3 Cooks)
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {cookStates.map((cook) => {
                const pct = Math.round(cook.progress * 100);
                return (
                  <button
                    key={cook.name}
                    type="button"
                    disabled={!cook.order}
                    onClick={() => cook.order && onSelectOrder(cook.order.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      cook.order
                        ? "border-prep bg-card hover:border-primary cursor-pointer"
                        : "border-border/70 bg-muted/40 opacity-75 cursor-default"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{cook.name}</span>
                      {cook.order ? (
                        <span className="font-mono text-primary">#{cook.order.id}</span>
                      ) : (
                        <span className="text-[11px] font-medium text-muted-foreground">Idle</span>
                      )}
                    </div>
                    {cook.order ? (
                      <>
                        <div className="mt-1 truncate text-[11px] text-muted-foreground">
                          {cook.order.customer} · {cook.remainingSeconds}s left
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-150"
                            style={{ width: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-[11px] text-muted-foreground">Ready for ticket</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Campus Riders */}
          <div className="rounded-xl border border-border bg-background/70 p-3.5">
            <div className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <Bike className="size-3.5 text-primary" />
              Campus Delivery Fleet (3 Riders)
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {driverFleetStates.map((fleet) => {
                const pct = Math.round(fleet.progress * 100);
                const loc = fleet.order ? getLocationById(fleet.order.locationId) : null;
                return (
                  <button
                    key={fleet.driver.id}
                    type="button"
                    disabled={!fleet.order}
                    onClick={() => fleet.order && onSelectOrder(fleet.order.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      fleet.state === "delivering"
                        ? "border-delivery bg-card hover:border-primary cursor-pointer"
                        : fleet.state === "returning"
                          ? "border-placed bg-card cursor-default"
                          : "border-border/70 bg-muted/40 opacity-80 cursor-default"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-bold">
                      <span className="truncate">{fleet.driver.name.split(" ")[0]}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          fleet.state === "delivering"
                            ? "bg-delivery text-delivery-foreground"
                            : fleet.state === "returning"
                              ? "bg-placed text-placed-foreground"
                              : "bg-ready text-ready-foreground"
                        }`}
                      >
                        {fleet.state === "delivering"
                          ? `#${fleet.order?.id}`
                          : fleet.state === "returning"
                            ? "Return"
                            : "Ready"}
                      </span>
                    </div>
                    {fleet.state === "delivering" && loc ? (
                      <>
                        <div className="mt-1 truncate text-[11px] text-muted-foreground">
                          → {loc.shortName} ({fleet.remainingSeconds}s)
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-150"
                            style={{ width: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                      </>
                    ) : fleet.state === "returning" ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Back to kitchen ({fleet.remainingSeconds}s)
                      </div>
                    ) : (
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {fleet.driver.vehicle} · {fleet.driver.plate}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Live Order Queue Board */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${lane.badgeClass}`}
              >
                {lane.title}
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {lane.items.length}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {lane.items.length === 0 ? (
                <div className="grid min-h-20 place-items-center rounded-xl border border-dashed border-border bg-muted/35 p-3 text-xs font-medium text-muted-foreground">
                  {lane.emptyText}
                </div>
              ) : (
                lane.items.map((order) => {
                  const isFocused = order.id === trackedOrderId;
                  const loc =
                    order.fulfillment === "delivery" ? getLocationById(order.locationId) : null;
                  const driver = getDriverById(order.driverId);
                  const pct =
                    order.status === "Preparing"
                      ? Math.round(getPrepProgress(order, now) * 100)
                      : order.status === "OutForDelivery"
                        ? Math.round(getDeliveryProgress(order, now) * 100)
                        : null;

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => onSelectOrder(order.id)}
                      className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                        isFocused
                          ? "border-primary bg-accent/65 shadow-xs ring-1 ring-primary/25"
                          : order.isUserOrder
                            ? "border-primary/45 bg-card hover:border-primary"
                            : "border-border bg-background/80 hover:border-foreground/25 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-extrabold text-foreground">
                            #{order.id}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {order.customer}
                          </span>
                        </div>
                        {order.isUserOrder && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                            Yours
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {order.lines.map(describeLine).join(" · ")}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold">
                        {loc ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPin className="size-3 text-primary" />
                            {loc.shortName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Store className="size-3 text-primary" />
                            Pickup
                          </span>
                        )}

                        {order.status === "Preparing" && order.cook && (
                          <span className="inline-flex items-center gap-1 text-prep-foreground">
                            <Flame className="size-3" />
                            {order.cook}
                          </span>
                        )}
                        {order.status === "OutForDelivery" && driver && (
                          <span className="inline-flex items-center gap-1 text-delivery-foreground">
                            <Bike className="size-3" />
                            {driver.name.split(" ")[0]}
                          </span>
                        )}
                        {order.status === "Ready" && (
                          <span className="inline-flex items-center gap-1 text-ready-foreground">
                            <PackageCheck className="size-3" />
                            {order.fulfillment === "delivery" ? "Awaiting rider" : "Counter ready"}
                          </span>
                        )}
                        {order.status === "Placed" && (
                          <span className="inline-flex items-center gap-1 text-placed-foreground">
                            <Clock className="size-3" />
                            In queue
                          </span>
                        )}
                      </div>

                      {pct !== null && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-150"
                            style={{ width: `${Math.max(6, pct)}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Order History */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-foreground">Order History</h3>
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {history.length} completed
          </span>
        </div>

        {history.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Completed pickups and delivered orders will appear here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {history.slice(0, 15).map((order) => {
              const loc =
                order.fulfillment === "delivery" ? getLocationById(order.locationId) : null;
              return (
                <li
                  key={order.id}
                  className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={() => onSelectOrder(order.id)}
                    className="min-w-0 flex-1 text-left hover:opacity-80 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-foreground">
                        #{order.id}
                      </span>
                      <span className="text-sm font-bold text-foreground">{order.customer}</span>
                      {order.isUserOrder && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-accent-foreground">
                          Yours
                        </span>
                      )}
                      <span className="rounded-full bg-done px-2 py-0.5 text-[11px] font-bold text-done-foreground">
                        {order.status === "Delivered"
                          ? `Delivered → ${loc?.shortName ?? "Campus"}`
                          : order.status === "Collected"
                            ? "Picked up"
                            : "Ready at counter"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {order.lines.map(describeLine).join(" · ")}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {formatAed(getOrderTotal(order))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewReceipt(order)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted cursor-pointer"
                    >
                      <ReceiptText className="size-3.5" />
                      Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => onReorder(order)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/12 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      Reorder
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
