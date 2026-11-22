import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Flame,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import canteenBg from "@/assets/canteen-bg.jpg";
import { CATEGORIES, type MenuItem } from "@/lib/menu";
import {
  EXTRA_CHEESE_PRICE,
  LARGE_SIZE_PRICE,
  formatAed,
  getLineKey,
  type CartLine,
} from "@/lib/types";

interface MenuBrowserProps {
  menu: ReadonlyArray<MenuItem>;
  cart: ReadonlyArray<CartLine>;
  queuedOrdersCount: number;
  activeCooksCount: number;
  activeDriversCount: number;
  onQuickAdd: (itemId: number) => void;
  onUpdateCartLineQty: (lineId: string, delta: number) => void;
  onAddCustomized: (
    itemId: number,
    options: { cheese: boolean; large: boolean; qty: number; note?: string | undefined },
  ) => void;
}

export function MenuBrowser({
  menu,
  cart,
  queuedOrdersCount,
  activeCooksCount,
  activeDriversCount,
  onQuickAdd,
  onUpdateCartLineQty,
  onAddCustomized,
}: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [fastPrepOnly, setFastPrepOnly] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of menu) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menu.filter((item) => {
      if (selectedCategory !== "All" && item.category !== selectedCategory) return false;
      if (fastPrepOnly && item.prep > 4) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [fastPrepOnly, menu, searchQuery, selectedCategory]);

  const cartSummaryByItem = useMemo(() => {
    const summary = new Map<
      number,
      { totalQty: number; standardQty: number; standardLineId: string }
    >();
    for (const line of cart) {
      const prev = summary.get(line.item.id) ?? {
        totalQty: 0,
        standardQty: 0,
        standardLineId: getLineKey(line.item.id, false, false),
      };
      const isStandard = !line.cheese && !line.large && !line.note;
      summary.set(line.item.id, {
        totalQty: prev.totalQty + line.qty,
        standardQty: prev.standardQty + (isStandard ? line.qty : 0),
        standardLineId: prev.standardLineId,
      });
    }
    return summary;
  }, [cart]);

  const customizingRemainingStock = useMemo(() => {
    if (!customizingItem) return 0;
    const live = menu.find((m) => m.id === customizingItem.id) ?? customizingItem;
    const inCart = cartSummaryByItem.get(live.id)?.totalQty ?? 0;
    return Math.max(0, live.stock - inCart);
  }, [cartSummaryByItem, customizingItem, menu]);

  return (
    <div className="flex flex-col gap-5">
      {/* Compact culinary hero banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
        <img
          src={canteenBg}
          alt="Set El Sham campus kitchen counter"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, oklch(0.16 0.025 38 / 0.94) 0%, oklch(0.20 0.03 42 / 0.84) 55%, oklch(0.22 0.035 45 / 0.62) 100%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-end sm:p-6">
          <div className="max-w-lg text-white">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>3 Cooks · 3 Campus Riders Ready</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Set El Sham · Academic City
            </h2>
            <p className="mt-1 text-sm text-white/80">
              Hot shawarma, charcoal grills, biryani &amp; shakes — delivered from Dubai Outsource
              City to major DIAC hostels and universities.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
            <div className="rounded-xl bg-white/12 px-3.5 py-2 text-xs text-white backdrop-blur-sm border border-white/15">
              <div className="font-medium text-white/75">Kitchen Status</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-bold">
                <Flame className="size-3.5 text-amber-300" />
                {queuedOrdersCount > 0
                  ? `${queuedOrdersCount} queued · ${activeCooksCount}/3 cooking`
                  : activeCooksCount > 0
                    ? `${activeCooksCount}/3 cooks active`
                    : "No wait · Instant prep"}
              </div>
            </div>
            <div className="rounded-xl bg-white/12 px-3.5 py-2 text-xs text-white backdrop-blur-sm border border-white/15">
              <div className="font-medium text-white/75">Campus Fleet</div>
              <div className="mt-0.5 font-bold">
                {activeDriversCount > 0
                  ? `${activeDriversCount}/3 riders out`
                  : "All 3 riders standby"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search + quick filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${menu.length} dishes (e.g. shawarma, biryani, tacos)...`}
            aria-label="Search dishes"
            className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-10 text-sm font-medium text-foreground shadow-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFastPrepOnly((v) => !v)}
          aria-pressed={fastPrepOnly}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition cursor-pointer ${
            fastPrepOnly
              ? "border-primary bg-accent text-accent-foreground shadow-xs"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Zap className={`size-4 ${fastPrepOnly ? "text-primary" : "text-muted-foreground"}`} />
          Fast Prep ≤4s
        </button>
      </div>

      {/* Category pill strip */}
      <div
        role="tablist"
        aria-label="Menu categories"
        className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === "All"}
          onClick={() => setSelectedCategory("All")}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
            selectedCategory === "All"
              ? "border-primary bg-primary text-primary-foreground shadow-xs"
              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          All ({menu.length})
        </button>
        {CATEGORIES.map((category) => {
          const active = selectedCategory === category;
          const count = categoryCounts.get(category) ?? 0;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>

      {/* Dish cards grid */}
      {filteredMenu.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <Utensils className="size-8 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-bold text-foreground">No matching dishes</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try clearing your search or turning off the Fast Prep filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setFastPrepOnly(false);
            }}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {filteredMenu.map((item) => {
            const summary = cartSummaryByItem.get(item.id);
            const totalInCart = summary?.totalQty ?? 0;
            const standardQty = summary?.standardQty ?? 0;
            const customQty = totalInCart - standardQty;
            const standardLineId = summary?.standardLineId ?? getLineKey(item.id, false, false);
            const available = Math.max(0, item.stock - totalInCart);
            const isUnavailable = available === 0;

            return (
              <li
                key={item.id}
                className={`group flex flex-col justify-between rounded-2xl border bg-card p-4 transition ${
                  totalInCart > 0
                    ? "border-primary/50 shadow-sm ring-1 ring-primary/15"
                    : "border-border shadow-xs hover:border-primary/35 hover:shadow-sm"
                } ${isUnavailable && totalInCart === 0 ? "opacity-65" : ""}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {item.category}
                      </span>
                      <h3 className="mt-0.5 text-base font-bold leading-snug text-foreground">
                        {item.name}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-lg bg-muted px-2.5 py-1 font-mono text-sm font-bold text-foreground">
                      {formatAed(item.price)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 font-semibold text-muted-foreground">
                      <Clock className="size-3" />
                      {item.prep}s prep
                    </span>

                    {isUnavailable ? (
                      <span className="rounded-md bg-destructive/12 px-2 py-0.5 font-bold text-destructive">
                        Unavailable
                      </span>
                    ) : (
                      <span className="rounded-md bg-ready/70 px-2 py-0.5 font-semibold text-ready-foreground">
                        Available
                      </span>
                    )}

                    {customQty > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 font-bold text-accent-foreground">
                        <Sparkles className="size-3 text-primary" />
                        {customQty} custom in bag
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                  <button
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => setCustomizingItem(item)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-foreground/30 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                  >
                    <SlidersHorizontal className="size-3.5" />
                    Customize
                  </button>

                  {standardQty > 0 ? (
                    <div className="inline-flex items-center gap-1 rounded-xl bg-primary p-1 text-primary-foreground shadow-xs">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => onUpdateCartLineQty(standardLineId, -1)}
                        className="grid size-7 place-items-center rounded-lg transition hover:bg-white/20 cursor-pointer"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-6 text-center font-mono text-sm font-bold">
                        {standardQty}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        disabled={isUnavailable}
                        onClick={() => onUpdateCartLineQty(standardLineId, 1)}
                        className="grid size-7 place-items-center rounded-lg transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isUnavailable}
                      onClick={() => onQuickAdd(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      Add
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {customizingItem && (
        <CustomizeItemModal
          item={customizingItem}
          maxAvailable={customizingRemainingStock}
          onClose={() => setCustomizingItem(null)}
          onConfirm={(options) => {
            onAddCustomized(customizingItem.id, options);
            setCustomizingItem(null);
          }}
        />
      )}
    </div>
  );
}

interface CustomizeItemModalProps {
  item: MenuItem;
  maxAvailable: number;
  onClose: () => void;
  onConfirm: (options: {
    cheese: boolean;
    large: boolean;
    qty: number;
    note?: string | undefined;
  }) => void;
}

function CustomizeItemModal({ item, maxAvailable, onClose, onConfirm }: CustomizeItemModalProps) {
  const [cheese, setCheese] = useState(false);
  const [large, setLarge] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const unitPrice = item.price + (cheese ? EXTRA_CHEESE_PRICE : 0) + (large ? LARGE_SIZE_PRICE : 0);
  const totalPrice = unitPrice * qty;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Customize ${item.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {item.category}
            </span>
            <h3 className="mt-0.5 text-xl font-extrabold text-foreground">{item.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Base {formatAed(item.price)} · Prep {item.prep}s ·{" "}
              {maxAvailable > 0 ? "Available" : "Unavailable"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close customization modal"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background p-3.5 transition hover:border-primary/40">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={cheese}
                onChange={(e) => setCheese(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              <div>
                <div className="text-sm font-bold text-foreground">Extra cheese</div>
                <div className="text-xs text-muted-foreground">Melted double cheddar blend</div>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-primary">
              +{formatAed(EXTRA_CHEESE_PRICE)}
            </span>
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-background p-3.5 transition hover:border-primary/40">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={large}
                onChange={(e) => setLarge(e.target.checked)}
                className="size-4 rounded accent-primary"
              />
              <div>
                <div className="text-sm font-bold text-foreground">Large size</div>
                <div className="text-xs text-muted-foreground">Generous campus hunger portion</div>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-primary">
              +{formatAed(LARGE_SIZE_PRICE)}
            </span>
          </label>
        </div>

        <div className="mt-4">
          <label htmlFor="dish-note" className="block text-xs font-bold text-muted-foreground">
            Kitchen note (optional)
          </label>
          <input
            id="dish-note"
            type="text"
            maxLength={60}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. No onions, extra garlic sauce"
            className="mt-1.5 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              aria-label="Decrease modal quantity"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid size-8 place-items-center rounded-lg text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-7 text-center font-mono text-sm font-bold">{qty}</span>
            <button
              type="button"
              aria-label="Increase modal quantity"
              disabled={qty >= maxAvailable}
              onClick={() => setQty((q) => Math.min(maxAvailable, q + 1))}
              className="grid size-8 place-items-center rounded-lg text-foreground hover:bg-muted disabled:opacity-40 cursor-pointer"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <button
            type="button"
            disabled={maxAvailable <= 0}
            onClick={() =>
              onConfirm({
                cheese,
                large,
                qty,
                note: note.trim() || undefined,
              })
            }
            className="flex-1 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:opacity-45 cursor-pointer"
          >
            Add to Order · {formatAed(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
