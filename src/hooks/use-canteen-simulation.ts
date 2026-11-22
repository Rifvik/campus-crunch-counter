import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CAMPUS_LOCATIONS,
  CANTEEN_LAT_LNG,
  DRIVERS,
  getDriverById,
  getLocationById,
  interpolateRoute,
  type CampusLocationId,
  type LatLng,
} from "@/lib/campus";
import { INITIAL_MENU, type MenuItem } from "@/lib/menu";
import {
  EXTRA_CHEESE_PRICE,
  LARGE_SIZE_PRICE,
  getDeliveryProgress,
  getLineKey,
  getPrepProgress,
  isOrderActive,
  type CartLine,
  type CookState,
  type DriverFleetState,
  type FulfillmentType,
  type Order,
} from "@/lib/types";

export const COOKS = ["Cook 1", "Cook 2", "Cook 3"] as const;
const RUSH_CUSTOMERS = ["Sara", "Rahul", "Fatima", "Leo", "Mei", "Yousef", "Priya", "Adam"];
const DISPATCH_DELAY_MS = 1200;
const DRIVER_RETURN_MS = 3000;
const TICK_MS = 150;

interface ReturningDriverState {
  until: number;
  startedAt: number;
  waypoints: LatLng[];
}

export interface PlaceOrderInput {
  customer: string;
  fulfillment: FulfillmentType;
  locationId: CampusLocationId;
  deliveryNote?: string | undefined;
}

export type PlaceOrderResult = { ok: true; order: Order } | { ok: false; error: string };

interface QueuedToast {
  kind: "success" | "info";
  title: string;
  description?: string | undefined;
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getCartQtyForItem(cart: ReadonlyArray<CartLine>, itemId: number): number {
  return cart.reduce((sum, line) => (line.item.id === itemId ? sum + line.qty : sum), 0);
}

function computeUnitPrice(item: MenuItem, cheese: boolean, large: boolean): number {
  return item.price + (cheese ? EXTRA_CHEESE_PRICE : 0) + (large ? LARGE_SIZE_PRICE : 0);
}

export function useCanteenSimulation() {
  const [menu, setMenu] = useState<MenuItem[]>(INITIAL_MENU);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trackedOrderId, setTrackedOrderId] = useState<number | null>(null);
  const [now, setNow] = useState<number>(0);
  const [returningDrivers, setReturningDrivers] = useState<Record<string, ReturningDriverState>>(
    {},
  );

  const nextOrderId = useRef(1001);
  const eventSeq = useRef(1);
  const replyTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const makeId = useCallback((prefix: string) => {
    eventSeq.current += 1;
    return `${prefix}-${eventSeq.current}`;
  }, []);

  // Initialize clock on client mount (keeps SSR hydration deterministic)
  useEffect(() => {
    setNow(Date.now());
    const timers = replyTimers.current;
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const hasActiveWork = useMemo(() => {
    if (Object.keys(returningDrivers).length > 0) return true;
    return orders.some(
      (order) =>
        order.status === "Placed" ||
        order.status === "Preparing" ||
        (order.status === "Ready" && order.fulfillment === "delivery") ||
        order.status === "OutForDelivery",
    );
  }, [orders, returningDrivers]);

  // Run single 150ms ticker only when kitchen or drivers have active work
  useEffect(() => {
    if (!hasActiveWork) return;
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);
    return () => clearInterval(intervalId);
  }, [hasActiveWork]);

  // Deterministic state machine step driven by `now`
  useEffect(() => {
    if (now === 0) return;
    if (orders.length === 0 && Object.keys(returningDrivers).length === 0) return;

    let ordersChanged = false;
    let returningChanged = false;
    const toasts: QueuedToast[] = [];
    const nextReturning: Record<string, ReturningDriverState> = { ...returningDrivers };

    // 1. Complete driver return-to-canteen journeys
    for (const [driverId, ret] of Object.entries(nextReturning)) {
      if (now >= ret.until) {
        delete nextReturning[driverId];
        returningChanged = true;
      }
    }

    let nextOrders = orders.map((order) => {
      // 2. Complete finished cooking orders
      if (
        order.status === "Preparing" &&
        order.prepStartedAt !== undefined &&
        now - order.prepStartedAt >= order.prepSeconds * 1000
      ) {
        ordersChanged = true;
        const isPickup = order.fulfillment === "pickup";
        if (order.isUserOrder && isPickup) {
          toasts.push({
            kind: "success",
            title: `Order #${order.id} is ready!`,
            description: "Head to the Set El Sham pickup counter.",
          });
        }
        return {
          ...order,
          status: "Ready" as const,
          readyAt: now,
          events: [
            ...order.events,
            {
              id: makeId("evt"),
              time: formatClock(now),
              label: isPickup ? "Ready at pickup counter" : "Packed & awaiting rider",
              detail: order.cook,
            },
          ],
        };
      }

      // 3. Complete delivered orders
      if (
        order.status === "OutForDelivery" &&
        order.deliveryStartedAt !== undefined &&
        order.deliverySeconds !== undefined &&
        now - order.deliveryStartedAt >= order.deliverySeconds * 1000
      ) {
        ordersChanged = true;
        const loc = getLocationById(order.locationId);
        const driver = getDriverById(order.driverId);

        if (driver) {
          nextReturning[driver.id] = {
            startedAt: now,
            until: now + DRIVER_RETURN_MS,
            waypoints: [...loc.waypoints].reverse(),
          };
          returningChanged = true;
        }

        if (order.isUserOrder) {
          toasts.push({
            kind: "success",
            title: `Order #${order.id} delivered!`,
            description: `${driver ? driver.name : "Your driver"} arrived at ${loc.name}.`,
          });
        }

        return {
          ...order,
          status: "Delivered" as const,
          doneAt: now,
          events: [
            ...order.events,
            {
              id: makeId("evt"),
              time: formatClock(now),
              label: `Delivered to ${loc.shortName}`,
              detail: driver ? `Handed off by ${driver.name}` : undefined,
            },
          ],
        };
      }

      return order;
    });

    // 4. Assign idle cooks to oldest Placed orders
    const busyCooks = new Set(
      nextOrders.filter((o) => o.status === "Preparing" && o.cook).map((o) => o.cook!),
    );
    const availableCooks = COOKS.filter((cook) => !busyCooks.has(cook));
    if (availableCooks.length > 0) {
      let cookIdx = 0;
      nextOrders = nextOrders.map((order) => {
        if (order.status !== "Placed" || cookIdx >= availableCooks.length) return order;
        const cook = availableCooks[cookIdx];
        if (!cook) return order;
        cookIdx += 1;
        ordersChanged = true;
        return {
          ...order,
          status: "Preparing" as const,
          cook,
          prepStartedAt: now,
          events: [
            ...order.events,
            {
              id: makeId("evt"),
              time: formatClock(now),
              label: "Cooking started",
              detail: `${cook} · est. ${order.prepSeconds}s`,
            },
          ],
        };
      });
    }

    // 5. Assign available riders to Ready delivery orders after brief packing pause
    const busyDrivers = new Set<string>([
      ...nextOrders
        .filter((o) => o.status === "OutForDelivery" && o.driverId)
        .map((o) => o.driverId!),
      ...Object.keys(nextReturning),
    ]);
    const freeDrivers = DRIVERS.filter((d) => !busyDrivers.has(d.id));
    if (freeDrivers.length > 0) {
      let driverIdx = 0;
      nextOrders = nextOrders.map((order) => {
        if (
          order.status !== "Ready" ||
          order.fulfillment !== "delivery" ||
          order.readyAt === undefined ||
          now - order.readyAt < DISPATCH_DELAY_MS ||
          driverIdx >= freeDrivers.length
        ) {
          return order;
        }
        const driver = freeDrivers[driverIdx];
        if (!driver) return order;
        driverIdx += 1;
        ordersChanged = true;
        const loc = getLocationById(order.locationId);

        if (order.isUserOrder) {
          toasts.push({
            kind: "info",
            title: `${driver.name} picked up Order #${order.id}`,
            description: `On the way to ${loc.name} (~${loc.rideSeconds}s).`,
          });
        }

        return {
          ...order,
          status: "OutForDelivery" as const,
          driverId: driver.id,
          deliveryStartedAt: now,
          deliverySeconds: loc.rideSeconds,
          events: [
            ...order.events,
            {
              id: makeId("evt"),
              time: formatClock(now),
              label: "Driver en route",
              detail: `${driver.name} (${driver.vehicle} · ${driver.plate}) → ${loc.shortName}`,
            },
          ],
        };
      });
    }

    if (ordersChanged) {
      setOrders(nextOrders);
    }
    if (returningChanged) {
      setReturningDrivers(nextReturning);
    }
    for (const t of toasts) {
      if (t.kind === "success") {
        toast.success(t.title, t.description ? { description: t.description } : undefined);
      } else {
        toast.info(t.title, t.description ? { description: t.description } : undefined);
      }
    }
  }, [now, orders, returningDrivers, makeId]);

  const addItemToCart = useCallback(
    (
      itemId: number,
      options: { cheese: boolean; large: boolean; qty: number; note?: string | undefined },
      showToast = true,
    ): boolean => {
      const item = menu.find((m) => m.id === itemId);
      if (!item) return false;
      const inCart = getCartQtyForItem(cart, item.id);
      const remaining = item.stock - inCart;
      if (remaining <= 0) {
        toast.error(`${item.name} is currently unavailable`, {
          description: "Restock the kitchen or pick another dish.",
        });
        return false;
      }
      const addQty = Math.min(options.qty, remaining);
      if (addQty < options.qty) {
        toast.warning(`Maximum available quantity added for ${item.name}`);
      }

      const trimmedNote = options.note?.trim();
      const lineId = getLineKey(item.id, options.cheese, options.large, trimmedNote);
      const unitPrice = computeUnitPrice(item, options.cheese, options.large);

      setCart((prev) => {
        const existing = prev.find((l) => l.id === lineId);
        if (existing) {
          return prev.map((l) => (l.id === lineId ? { ...l, qty: l.qty + addQty } : l));
        }
        return [
          ...prev,
          {
            id: lineId,
            item,
            cheese: options.cheese,
            large: options.large,
            note: trimmedNote || undefined,
            qty: addQty,
            unitPrice,
          },
        ];
      });

      if (showToast) {
        toast.success(`Added ${addQty > 1 ? `${addQty}× ` : ""}${item.name}`);
      }
      return true;
    },
    [cart, menu],
  );

  const quickAdd = useCallback(
    (itemId: number) => {
      return addItemToCart(itemId, { cheese: false, large: false, qty: 1 }, false);
    },
    [addItemToCart],
  );

  const addCustomized = useCallback(
    (
      itemId: number,
      options: { cheese: boolean; large: boolean; qty: number; note?: string | undefined },
    ) => {
      return addItemToCart(itemId, options, true);
    },
    [addItemToCart],
  );

  const updateCartLineQty = useCallback(
    (lineId: string, delta: number) => {
      setCart((prev) => {
        const target = prev.find((l) => l.id === lineId);
        if (!target) return prev;

        if (delta > 0) {
          const liveItem = menu.find((m) => m.id === target.item.id);
          const totalInCart = getCartQtyForItem(prev, target.item.id);
          if (!liveItem || totalInCart + delta > liveItem.stock) {
            toast.warning(`${target.item.name} is unavailable in a larger quantity`);
            return prev;
          }
        }

        const nextQty = target.qty + delta;
        if (nextQty <= 0) {
          return prev.filter((l) => l.id !== lineId);
        }
        return prev.map((l) => (l.id === lineId ? { ...l, qty: nextQty } : l));
      });
    },
    [menu],
  );

  const removeCartLine = useCallback((lineId: string) => {
    setCart((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const deductStockForLines = useCallback((lines: ReadonlyArray<CartLine>) => {
    const qtyByItemId = new Map<number, number>();
    for (const line of lines) {
      qtyByItemId.set(line.item.id, (qtyByItemId.get(line.item.id) ?? 0) + line.qty);
    }
    setMenu((prev) =>
      prev.map((item) => {
        const used = qtyByItemId.get(item.id) ?? 0;
        if (used === 0) return item;
        return { ...item, stock: Math.max(0, item.stock - used) };
      }),
    );
  }, []);

  const placeOrder = useCallback(
    (input: PlaceOrderInput): PlaceOrderResult => {
      if (cart.length === 0) {
        return { ok: false, error: "Add at least one dish to your order first." };
      }
      const customerName = input.customer.trim();
      if (!customerName) {
        return { ok: false, error: "Please enter your name for the order." };
      }

      // Verify live stock for every item
      const neededByItem = new Map<number, number>();
      for (const line of cart) {
        neededByItem.set(line.item.id, (neededByItem.get(line.item.id) ?? 0) + line.qty);
      }
      for (const [itemId, needed] of neededByItem.entries()) {
        const live = menu.find((m) => m.id === itemId);
        if (!live || live.stock < needed) {
          const msg = `${live?.name ?? "An item"} is currently unavailable in that quantity.`;
          toast.error("Availability changed", { description: msg });
          return { ok: false, error: msg };
        }
      }

      const currentNow = Date.now();
      setNow(currentNow);
      deductStockForLines(cart);

      const prepSeconds = Math.max(...cart.map((l) => l.item.prep));
      const loc = getLocationById(input.locationId);
      const trimmedNote = input.deliveryNote?.trim();

      const order: Order = {
        id: nextOrderId.current++,
        customer: customerName,
        lines: cart.map((l) => ({ ...l })),
        fulfillment: input.fulfillment,
        locationId: input.fulfillment === "delivery" ? input.locationId : undefined,
        deliveryNote: input.fulfillment === "delivery" && trimmedNote ? trimmedNote : undefined,
        status: "Placed",
        isUserOrder: true,
        createdAt: currentNow,
        createdTimeLabel: formatClock(currentNow),
        prepSeconds,
        deliverySeconds: input.fulfillment === "delivery" ? loc.rideSeconds : undefined,
        events: [
          {
            id: makeId("evt"),
            time: formatClock(currentNow),
            label: "Order placed",
            detail:
              input.fulfillment === "delivery"
                ? `Campus delivery to ${loc.shortName}`
                : "Counter pickup at Set El Sham",
          },
        ],
        driverMessages: [],
      };

      setOrders((prev) => [...prev, order]);
      setTrackedOrderId(order.id);
      setCart([]);

      toast.success(`Order #${order.id} confirmed!`, {
        description:
          input.fulfillment === "delivery"
            ? `Kitchen queued · Delivering to ${loc.name}`
            : "Kitchen queued · Counter pickup",
      });

      return { ok: true, order };
    },
    [cart, deductStockForLines, makeId, menu],
  );

  const placeDemoDeliveryOrder = useCallback((): Order | null => {
    const shawarma = menu.find((m) => m.name === "Arabic Shawarma" && m.stock > 0);
    const fries = menu.find((m) => m.name === "Loaded Fries" && m.stock > 0);
    const fallback = menu.find((m) => m.stock > 0);
    const chosen = [shawarma, fries].filter((x): x is MenuItem => x !== undefined);
    if (chosen.length === 0 && fallback) {
      chosen.push(fallback);
    }
    if (chosen.length === 0) {
      toast.error("Menu items currently unavailable", {
        description: "Click Restock Kitchen first.",
      });
      return null;
    }

    const demoLines: CartLine[] = chosen.map((item) => ({
      id: getLineKey(item.id, false, false),
      item,
      cheese: false,
      large: false,
      qty: 1,
      unitPrice: item.price,
    }));

    const currentNow = Date.now();
    setNow(currentNow);
    deductStockForLines(demoLines);

    const loc = getLocationById("myriad");
    const prepSeconds = Math.max(...demoLines.map((l) => l.item.prep));

    const order: Order = {
      id: nextOrderId.current++,
      customer: "You (Demo)",
      lines: demoLines,
      fulfillment: "delivery",
      locationId: loc.id,
      deliveryNote: "Tower A Lobby Entrance",
      status: "Placed",
      isUserOrder: true,
      createdAt: currentNow,
      createdTimeLabel: formatClock(currentNow),
      prepSeconds,
      deliverySeconds: loc.rideSeconds,
      events: [
        {
          id: makeId("evt"),
          time: formatClock(currentNow),
          label: "Demo delivery placed",
          detail: `Campus delivery to ${loc.shortName}`,
        },
      ],
      driverMessages: [],
    };

    setOrders((prev) => [...prev, order]);
    setTrackedOrderId(order.id);
    toast.success(`Demo Order #${order.id} started!`, {
      description: `Watch the kitchen cook & rider deliver to ${loc.name}.`,
    });
    return order;
  }, [deductStockForLines, makeId, menu]);

  const triggerRushHour = useCallback((): number => {
    const currentNow = Date.now();
    setNow(currentNow);

    const virtualStock = new Map<number, number>(menu.map((m) => [m.id, m.stock]));
    const newOrders: Order[] = [];
    const totalUsedLines: CartLine[] = [];

    for (let i = 0; i < 10; i++) {
      const available = menu.filter((m) => (virtualStock.get(m.id) ?? 0) > 0);
      if (available.length === 0) break;

      const firstItem = available[Math.floor(Math.random() * available.length)];
      if (!firstItem) break;
      virtualStock.set(firstItem.id, (virtualStock.get(firstItem.id) ?? 0) - 1);

      const cheese = Math.random() < 0.25;
      const large = Math.random() < 0.25;
      const orderLines: CartLine[] = [
        {
          id: getLineKey(firstItem.id, cheese, large),
          item: firstItem,
          cheese,
          large,
          qty: 1,
          unitPrice: computeUnitPrice(firstItem, cheese, large),
        },
      ];

      // 35% chance to include a second item
      if (Math.random() < 0.35) {
        const available2 = menu.filter((m) => (virtualStock.get(m.id) ?? 0) > 0);
        const secondItem = available2[Math.floor(Math.random() * available2.length)];
        if (secondItem) {
          virtualStock.set(secondItem.id, (virtualStock.get(secondItem.id) ?? 0) - 1);
          orderLines.push({
            id: getLineKey(secondItem.id, false, false),
            item: secondItem,
            cheese: false,
            large: false,
            qty: 1,
            unitPrice: secondItem.price,
          });
        }
      }

      totalUsedLines.push(...orderLines);

      const isDelivery = Math.random() < 0.65;
      const loc = CAMPUS_LOCATIONS[Math.floor(Math.random() * CAMPUS_LOCATIONS.length)]!;
      const customer = RUSH_CUSTOMERS[Math.floor(Math.random() * RUSH_CUSTOMERS.length)] ?? "Guest";
      const prepSeconds = Math.max(...orderLines.map((l) => l.item.prep));

      newOrders.push({
        id: nextOrderId.current++,
        customer,
        lines: orderLines,
        fulfillment: isDelivery ? "delivery" : "pickup",
        locationId: isDelivery ? loc.id : undefined,
        status: "Placed",
        isUserOrder: false,
        createdAt: currentNow,
        createdTimeLabel: formatClock(currentNow),
        prepSeconds,
        deliverySeconds: isDelivery ? loc.rideSeconds : undefined,
        events: [
          {
            id: makeId("evt"),
            time: formatClock(currentNow),
            label: "Order placed",
            detail: isDelivery ? `Campus delivery to ${loc.shortName}` : "Counter pickup",
          },
        ],
        driverMessages: [],
      });
    }

    if (newOrders.length === 0) {
      toast.error("Items currently unavailable for Rush Hour", {
        description: "Click Restock Kitchen to replenish dishes.",
      });
      return 0;
    }

    deductStockForLines(totalUsedLines);
    setOrders((prev) => [...prev, ...newOrders]);
    toast.info(`Rush hour! +${newOrders.length} campus orders incoming`, {
      description: "Cooks & delivery riders are dispatching now.",
    });
    return newOrders.length;
  }, [deductStockForLines, makeId, menu]);

  const markOrderCollected = useCallback(
    (orderId: number) => {
      const currentNow = Date.now();
      setNow(currentNow);
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId || order.status !== "Ready") return order;
          return {
            ...order,
            status: "Collected" as const,
            doneAt: currentNow,
            events: [
              ...order.events,
              {
                id: makeId("evt"),
                time: formatClock(currentNow),
                label: "Picked up at counter",
              },
            ],
          };
        }),
      );
      toast.success(`Order #${orderId} marked picked up`);
    },
    [makeId],
  );

  const reorderFromOrder = useCallback(
    (order: Order): number => {
      let addedCount = 0;
      const nextCart = [...cart];

      for (const line of order.lines) {
        const live = menu.find((m) => m.id === line.item.id);
        if (!live) continue;
        const alreadyInCart = getCartQtyForItem(nextCart, live.id);
        const canAdd = Math.min(line.qty, live.stock - alreadyInCart);
        if (canAdd <= 0) continue;

        const key = getLineKey(live.id, line.cheese, line.large, line.note);
        const idx = nextCart.findIndex((c) => c.id === key);
        if (idx >= 0) {
          const existing = nextCart[idx];
          if (existing) {
            nextCart[idx] = { ...existing, qty: existing.qty + canAdd };
          }
        } else {
          nextCart.push({
            id: key,
            item: live,
            cheese: line.cheese,
            large: line.large,
            note: line.note,
            qty: canAdd,
            unitPrice: computeUnitPrice(live, line.cheese, line.large),
          });
        }
        addedCount += canAdd;
      }

      if (addedCount === 0) {
        toast.error("Items from that order are currently unavailable");
        return 0;
      }

      setCart(nextCart);
      toast.success(
        `Added ${addedCount} item${addedCount > 1 ? "s" : ""} from #${order.id} to cart`,
      );
      return addedCount;
    },
    [cart, menu],
  );

  const restockMenu = useCallback(() => {
    setMenu(INITIAL_MENU.map((item) => ({ ...item })));
    toast.success("Kitchen restocked to full capacity");
  }, []);

  const sendDriverPing = useCallback(
    (orderId: number, pingText: string, driverReply: string) => {
      const currentNow = Date.now();
      setNow(currentNow);
      const userMsgId = makeId("msg");

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                driverMessages: [
                  ...order.driverMessages,
                  { id: userMsgId, sender: "user", text: pingText, time: formatClock(currentNow) },
                ],
              }
            : order,
        ),
      );

      const timer = setTimeout(() => {
        replyTimers.current.delete(timer);
        const replyNow = Date.now();
        setNow(replyNow);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  driverMessages: [
                    ...order.driverMessages,
                    {
                      id: makeId("msg"),
                      sender: "driver",
                      text: driverReply,
                      time: formatClock(replyNow),
                    },
                  ],
                }
              : order,
          ),
        );
      }, 900);

      replyTimers.current.add(timer);
    },
    [makeId],
  );

  // Derived telemetry for UI components
  const cookStates: CookState[] = useMemo(
    () =>
      COOKS.map((name) => {
        const order = orders.find((o) => o.status === "Preparing" && o.cook === name);
        const progress = order ? getPrepProgress(order, now) : 0;
        const remainingSeconds =
          order && order.prepStartedAt
            ? Math.max(0, Math.ceil((order.prepStartedAt + order.prepSeconds * 1000 - now) / 1000))
            : 0;
        return { name, order, progress, remainingSeconds };
      }),
    [now, orders],
  );

  const driverFleetStates: DriverFleetState[] = useMemo(
    () =>
      DRIVERS.map((driver) => {
        const activeOrder = orders.find(
          (o) => o.status === "OutForDelivery" && o.driverId === driver.id,
        );
        if (activeOrder) {
          const loc = getLocationById(activeOrder.locationId);
          const progress = getDeliveryProgress(activeOrder, now);
          const pos = interpolateRoute(loc.waypoints, progress, loc.checkpoints);
          const remainingSeconds =
            activeOrder.deliveryStartedAt && activeOrder.deliverySeconds
              ? Math.max(
                  0,
                  Math.ceil(
                    (activeOrder.deliveryStartedAt + activeOrder.deliverySeconds * 1000 - now) /
                      1000,
                  ),
                )
              : loc.rideSeconds;
          return {
            driver,
            state: "delivering" as const,
            order: activeOrder,
            progress,
            remainingSeconds,
            lat: pos.lat,
            lng: pos.lng,
          };
        }

        const ret = returningDrivers[driver.id];
        if (ret) {
          const progress = Math.min(1, Math.max(0, (now - ret.startedAt) / DRIVER_RETURN_MS));
          const pos = interpolateRoute(ret.waypoints, progress);
          const remainingSeconds = Math.max(0, Math.ceil((ret.until - now) / 1000));
          return {
            driver,
            state: "returning" as const,
            progress,
            remainingSeconds,
            lat: pos.lat,
            lng: pos.lng,
          };
        }

        return {
          driver,
          state: "available" as const,
          progress: 0,
          remainingSeconds: 0,
          lat: CANTEEN_LAT_LNG[0],
          lng: CANTEEN_LAT_LNG[1],
        };
      }),
    [now, orders, returningDrivers],
  );

  const activeUserOrders = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            o.isUserOrder &&
            (isOrderActive(o) || (o.fulfillment === "pickup" && o.status === "Ready")),
        )
        .sort((a, b) => b.id - a.id),
    [orders],
  );

  const trackedOrder = useMemo(() => {
    if (trackedOrderId !== null) {
      const explicit = orders.find((o) => o.id === trackedOrderId);
      if (explicit) return explicit;
    }
    if (activeUserOrders.length > 0) return activeUserOrders[0] ?? null;
    const latestUser = [...orders].reverse().find((o) => o.isUserOrder);
    if (latestUser) return latestUser;
    const activeAny = orders.find((o) => isOrderActive(o));
    if (activeAny) return activeAny;
    return orders[orders.length - 1] ?? null;
  }, [activeUserOrders, orders, trackedOrderId]);

  const cartItemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart]);
  const activeOrdersCount = useMemo(() => orders.filter(isOrderActive).length, [orders]);
  const hasLowOrOutStock = useMemo(() => menu.some((m) => m.stock <= 3), [menu]);

  return {
    menu,
    cart,
    cartItemCount,
    cartSubtotal,
    orders,
    now,
    trackedOrder,
    trackedOrderId,
    setTrackedOrderId,
    activeUserOrders,
    activeOrdersCount,
    cookStates,
    driverFleetStates,
    hasLowOrOutStock,
    quickAdd,
    addCustomized,
    updateCartLineQty,
    removeCartLine,
    clearCart,
    placeOrder,
    placeDemoDeliveryOrder,
    triggerRushHour,
    markOrderCollected,
    reorderFromOrder,
    restockMenu,
    sendDriverPing,
  };
}
