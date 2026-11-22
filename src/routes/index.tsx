import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Flame,
  MapPin,
  Radar,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { CartPanel, type CheckoutFormState } from "@/components/CartSidebar";
import { KitchenBoard } from "@/components/KitchenBoard";
import { MenuBrowser } from "@/components/MenuBrowser";
import { OrderTracker } from "@/components/OrderTracker";
import { ReceiptModal } from "@/components/ReceiptModal";
import { useCanteenSimulation } from "@/hooks/use-canteen-simulation";
import { getLocationById } from "@/lib/campus";
import {
  formatAed,
  getDeliveryProgress,
  getPrepProgress,
  getRemainingEtaSeconds,
  getStatusLabel,
  type Order,
} from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Canteen Rush — Campus Ordering & Live Delivery Tracker" },
      {
        name: "description",
        content:
          "Order from Set El Sham campus canteen, watch real-time kitchen prep, and track your delivery driver live across campus.",
      },
      { property: "og:title", content: "Canteen Rush — Campus Ordering & Live Delivery Tracker" },
      {
        property: "og:description",
        content:
          "Order from Set El Sham campus canteen, watch real-time kitchen prep, and track your delivery driver live across campus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type ActiveTab = "order" | "track";

function Index() {
  const sim = useCanteenSimulation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("order");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [checkout, setCheckout] = useState<CheckoutFormState>({
    customer: "",
    fulfillment: "delivery",
    locationId: "myriad",
    deliveryNote: "",
  });

  const queuedOrdersCount = sim.orders.filter((o) => o.status === "Placed").length;
  const activeCooksCount = sim.cookStates.filter((c) => c.order !== undefined).length;
  const activeDriversCount = sim.driverFleetStates.filter((d) => d.state === "delivering").length;
  const heroUserOrder = sim.activeUserOrders[0] ?? null;

  const handlePlaceOrder = () => {
    const result = sim.placeOrder({
      customer: checkout.customer,
      fulfillment: checkout.fulfillment,
      locationId: checkout.locationId,
      deliveryNote: checkout.deliveryNote,
    });
    if (result.ok) {
      setMobileCartOpen(false);
      setCheckout((prev) => ({ ...prev, deliveryNote: "" }));
      setActiveTab("track");
    }
    return result;
  };

  const handleSelectOrder = (orderId: number) => {
    sim.setTrackedOrderId(orderId);
    setActiveTab("track");
  };

  const handleReorder = (order: Order) => {
    const added = sim.reorderFromOrder(order);
    if (added > 0) {
      setActiveTab("order");
    }
  };

  const heroOrderLoc =
    heroUserOrder && heroUserOrder.fulfillment === "delivery"
      ? getLocationById(heroUserOrder.locationId)
      : null;

  const heroOrderProgress = heroUserOrder
    ? heroUserOrder.fulfillment === "delivery"
      ? heroUserOrder.status === "OutForDelivery"
        ? 55 + getDeliveryProgress(heroUserOrder, sim.now) * 45
        : heroUserOrder.status === "Ready"
          ? 52
          : heroUserOrder.status === "Preparing"
            ? 18 + getPrepProgress(heroUserOrder, sim.now) * 32
            : 8
      : heroUserOrder.status === "Ready"
        ? 100
        : heroUserOrder.status === "Preparing"
          ? 35 + getPrepProgress(heroUserOrder, sim.now) * 60
          : 12
    : 0;

  const heroOrderEta = heroUserOrder
    ? getRemainingEtaSeconds(heroUserOrder, sim.now, heroOrderLoc?.rideSeconds ?? 0)
    : 0;

  return (
    <div className="min-h-screen pb-24 lg:pb-10">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
                Canteen <span className="text-primary">Rush</span>
              </h1>
              <p className="hidden text-[11px] font-semibold text-muted-foreground sm:block">
                Set El Sham · Academic City Hostels &amp; Unis
              </p>
            </div>
          </div>

          {/* 2-Tab Segmented Switcher */}
          <nav
            aria-label="Primary workspace views"
            className="order-3 flex w-full items-center gap-1 rounded-xl border border-border bg-muted/80 p-1 sm:order-2 sm:w-auto"
          >
            <button
              type="button"
              onClick={() => setActiveTab("order")}
              aria-current={activeTab === "order" ? "page" : undefined}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition sm:flex-initial sm:text-sm cursor-pointer ${
                activeTab === "order"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === "order" && (
                <motion.span
                  layoutId="nav-tab-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-card shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <UtensilsCrossed className="size-4 text-primary" />
                Order Menu
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("track")}
              aria-current={activeTab === "track" ? "page" : undefined}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition sm:flex-initial sm:text-sm cursor-pointer ${
                activeTab === "track"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === "track" && (
                <motion.span
                  layoutId="nav-tab-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-card shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Radar className="size-4 text-primary" />
                Track &amp; Kitchen
                {sim.activeOrdersCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] font-extrabold text-primary-foreground">
                    <span className="size-1.5 rounded-full bg-white animate-pulse" />
                    {sim.activeOrdersCount}
                  </span>
                )}
              </span>
            </button>
          </nav>

          {/* Header actions */}
          <div className="order-2 flex items-center gap-2 sm:order-3">
            <button
              type="button"
              onClick={sim.triggerRushHour}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/35 bg-accent px-3.5 py-2 text-xs font-extrabold text-accent-foreground transition hover:bg-primary hover:text-primary-foreground cursor-pointer sm:text-sm"
            >
              <Zap className="size-4" />
              <span>Rush Hour</span>
              <span className="rounded-md bg-card/80 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                +10
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              aria-label={`Open cart, ${sim.cartItemCount} items`}
              className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground shadow-xs transition hover:border-primary lg:hidden cursor-pointer"
            >
              <ShoppingBag className="size-5" />
              {sim.cartItemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 font-mono text-[11px] font-extrabold text-primary-foreground">
                  {sim.cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Persistent Active Order Mini-Tracker Banner while browsing menu */}
        {activeTab === "order" && heroUserOrder && (
          <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-primary/40 bg-card p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                {heroUserOrder.status === "OutForDelivery" ? (
                  <Bike className="size-5" />
                ) : heroUserOrder.fulfillment === "pickup" ? (
                  <Store className="size-5" />
                ) : (
                  <Flame className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-foreground">
                    Order #{heroUserOrder.id}
                  </span>
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold text-primary">
                    {getStatusLabel(heroUserOrder.status, heroUserOrder.fulfillment)}
                  </span>
                  {heroOrderLoc && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <MapPin className="size-3 text-primary" />
                      {heroOrderLoc.shortName}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(8, heroOrderProgress))}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs font-bold text-foreground">
                    {heroOrderEta > 0 ? `${heroOrderEta}s ETA` : "Ready"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectOrder(heroUserOrder.id)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-xs transition hover:bg-primary-hover cursor-pointer"
            >
              Track Live
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}

        {activeTab === "order" ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
            <MenuBrowser
              menu={sim.menu}
              cart={sim.cart}
              queuedOrdersCount={queuedOrdersCount}
              activeCooksCount={activeCooksCount}
              activeDriversCount={activeDriversCount}
              onQuickAdd={sim.quickAdd}
              onUpdateCartLineQty={sim.updateCartLineQty}
              onAddCustomized={sim.addCustomized}
            />

            {/* Sticky Desktop Cart + Inline Express Checkout */}
            <aside className="hidden lg:sticky lg:top-24 lg:block">
              <CartPanel
                menu={sim.menu}
                cart={sim.cart}
                cartSubtotal={sim.cartSubtotal}
                cartItemCount={sim.cartItemCount}
                checkout={checkout}
                onCheckoutChange={setCheckout}
                onQuickAdd={sim.quickAdd}
                onUpdateCartLineQty={sim.updateCartLineQty}
                onRemoveCartLine={sim.removeCartLine}
                onClearCart={sim.clearCart}
                onPlaceOrder={handlePlaceOrder}
              />
            </aside>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <OrderTracker
              orders={sim.orders}
              trackedOrder={sim.trackedOrder}
              now={sim.now}
              driverFleetStates={sim.driverFleetStates}
              onSelectOrder={(id) => sim.setTrackedOrderId(id)}
              onBrowseMenu={() => setActiveTab("order")}
              onTryDemoDelivery={sim.placeDemoDeliveryOrder}
              onViewReceipt={setReceiptOrder}
              onMarkCollected={sim.markOrderCollected}
              onReorder={handleReorder}
              onSendDriverPing={sim.sendDriverPing}
            />

            <KitchenBoard
              orders={sim.orders}
              now={sim.now}
              trackedOrderId={sim.trackedOrder?.id ?? null}
              cookStates={sim.cookStates}
              driverFleetStates={sim.driverFleetStates}
              hasLowOrOutStock={sim.hasLowOrOutStock}
              onSelectOrder={(id) => sim.setTrackedOrderId(id)}
              onRestockMenu={sim.restockMenu}
              onViewReceipt={setReceiptOrder}
              onReorder={handleReorder}
            />
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Cart Bar */}
      {activeTab === "order" && sim.cartItemCount > 0 && !mobileCartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-lg backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-muted-foreground">
                {sim.cartItemCount} item{sim.cartItemCount > 1 ? "s" : ""} ·{" "}
                {checkout.fulfillment === "delivery" ? "Campus Delivery" : "Counter Pickup"}
              </div>
              <div className="font-mono text-base font-extrabold text-foreground">
                {formatAed(sim.cartSubtotal)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-sm hover:bg-primary-hover cursor-pointer"
            >
              Review &amp; Order
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Slide-Over Cart Drawer */}
      {mobileCartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-foreground/45 backdrop-blur-xs"
            onClick={() => setMobileCartOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Your order drawer"
            className="relative z-50 h-full w-full max-w-md p-3"
          >
            <CartPanel
              menu={sim.menu}
              cart={sim.cart}
              cartSubtotal={sim.cartSubtotal}
              cartItemCount={sim.cartItemCount}
              checkout={checkout}
              onCheckoutChange={setCheckout}
              onQuickAdd={sim.quickAdd}
              onUpdateCartLineQty={sim.updateCartLineQty}
              onRemoveCartLine={sim.removeCartLine}
              onClearCart={sim.clearCart}
              onPlaceOrder={handlePlaceOrder}
              onCloseDrawer={() => setMobileCartOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptOrder && <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    </div>
  );
}
