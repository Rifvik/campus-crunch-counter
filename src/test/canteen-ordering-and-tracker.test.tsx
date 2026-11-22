import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAMPUS_LOCATIONS,
  CANTEEN_LAT_LNG,
  HOSTEL_LOCATIONS,
  UNIVERSITY_LOCATIONS,
  getLocationById,
  interpolateRoute,
} from "@/lib/campus";
import { Route as IndexRoute } from "@/routes/index";

const IndexPage = IndexRoute.options.component!;

function advanceSimulation(totalMs: number, stepMs = 250) {
  const steps = Math.ceil(totalMs / stepMs);
  for (let i = 0; i < steps; i++) {
    act(() => {
      vi.advanceTimersByTime(stepMs);
    });
  }
}

describe("interpolateRoute geometry for Dubai Academic City", () => {
  it("interpolates [lat, lng] start, midpoint, destination, and clamps out-of-range progress", () => {
    const myriad = getLocationById("myriad");
    const start = interpolateRoute(myriad.waypoints, 0, myriad.checkpoints);
    expect(start.lat).toBe(CANTEEN_LAT_LNG[0]);
    expect(start.lng).toBe(CANTEEN_LAT_LNG[1]);
    expect(start.currentLandmark).toBe("Leaving Set El Sham (DOZ)");

    const mid = interpolateRoute(myriad.waypoints, 0.5, myriad.checkpoints);
    expect(mid.lat).toBeGreaterThan(25.12);
    expect(mid.lng).toBeGreaterThan(55.41);
    expect(mid.traveledLatLngs.length).toBeGreaterThan(2);

    const end = interpolateRoute(myriad.waypoints, 1, myriad.checkpoints);
    expect(end.lat).toBe(myriad.latLng[0]);
    expect(end.lng).toBe(myriad.latLng[1]);
    expect(end.currentLandmark).toBe("Arrived at The Myriad Dubai");

    const clampedLow = interpolateRoute(myriad.waypoints, -0.5, myriad.checkpoints);
    expect(clampedLow.lat).toBe(CANTEEN_LAT_LNG[0]);
    const clampedHigh = interpolateRoute(myriad.waypoints, 2.5, myriad.checkpoints);
    expect(clampedHigh.lat).toBe(myriad.latLng[0]);

    expect(CAMPUS_LOCATIONS.length).toBe(10);
    expect(HOSTEL_LOCATIONS.length).toBe(4);
    expect(UNIVERSITY_LOCATIONS.length).toBe(6);
  });
});

describe("Canteen Rush ordering & live delivery driver tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("supports menu search, category filtering, quick-add stepper, customization modal, and stock limits", () => {
    render(<IndexPage />);

    // Search filter
    const searchInput = screen.getByLabelText("Search dishes");
    fireEvent.change(searchInput, { target: { value: "Arabic Shawarma" } });
    const shawarmaHeading = screen.getByRole("heading", { name: "Arabic Shawarma" });
    expect(shawarmaHeading).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chicken Soup" })).not.toBeInTheDocument();

    // Quick add on menu card switches button to inline quantity stepper
    const shawarmaCard = shawarmaHeading.closest("li")!;
    fireEvent.click(within(shawarmaCard).getByRole("button", { name: /^Add$/i }));
    expect(
      within(shawarmaCard).getByLabelText("Increase Arabic Shawarma quantity"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order · AED 18\.00/i })).toBeInTheDocument();

    // Open customization modal and add Extra cheese (+3) + Large size (+4)
    fireEvent.click(within(shawarmaCard).getByRole("button", { name: /Customize/i }));
    const dialog = screen.getByRole("dialog", { name: "Customize Arabic Shawarma" });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(within(dialog).getByText("Extra cheese"));
    fireEvent.click(within(dialog).getByText("Large size"));
    fireEvent.click(within(dialog).getByRole("button", { name: /Add to Order · AED 25\.00/i }));

    // Cart now holds 1 standard (18) + 1 customized (25) = AED 43.00
    expect(screen.getByRole("button", { name: /Place Order · AED 43\.00/i })).toBeInTheDocument();
    expect(within(shawarmaCard).getByText("1 custom in bag")).toBeInTheDocument();

    // Clear search and test category filter
    fireEvent.click(screen.getByLabelText("Clear search"));
    fireEvent.click(screen.getByRole("tab", { name: /Soups/i }));
    expect(screen.getByRole("heading", { name: "Chicken Soup" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Arabic Shawarma" })).not.toBeInTheDocument();

    // Test availability status on Shawarma Pizza (stock cap -> Unavailable without showing quantities)
    fireEvent.click(screen.getByRole("tab", { name: /Pasta & Pizza/i }));
    const pizzaCard = screen.getByRole("heading", { name: "Shawarma Pizza" }).closest("li")!;
    expect(within(pizzaCard).getByText("Available")).toBeInTheDocument();
    expect(within(pizzaCard).queryByText(/in stock|Only .* left/i)).not.toBeInTheDocument();
    fireEvent.click(within(pizzaCard).getByRole("button", { name: /^Add$/i }));
    const incBtn = within(pizzaCard).getByLabelText("Increase Shawarma Pizza quantity");
    for (let i = 0; i < 12; i++) {
      fireEvent.click(incBtn);
    }
    expect(within(pizzaCard).getByText("Unavailable")).toBeInTheDocument();
    expect(incBtn).toBeDisabled();
  });

  it("validates checkout, auto-switches to live DIAC map tracker, simulates kitchen + GPS delivery, and handles driver pings", () => {
    render(<IndexPage />);

    // Add fast-prep item (Hummus Set: 2s prep)
    fireEvent.change(screen.getByLabelText("Search dishes"), { target: { value: "Hummus Set" } });
    const hummusCard = screen.getByRole("heading", { name: "Hummus Set" }).closest("li")!;
    fireEvent.click(within(hummusCard).getByRole("button", { name: /^Add$/i }));

    // Submitting without customer name shows inline error
    fireEvent.click(screen.getByRole("button", { name: /Place Order · AED 10\.00/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/enter your name/i);

    // Fill name & select BITS Pilani Dubai Campus (BPDC) (1.77 km, 14s ride)
    fireEvent.click(screen.getByRole("button", { name: "Sara" }));
    fireEvent.change(screen.getByLabelText(/Delivery Destination/i), {
      target: { value: "bits" },
    });
    fireEvent.change(screen.getByLabelText("Drop-off note"), {
      target: { value: "Main atrium gate" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Place Order · AED 10\.00/i }));

    // Should auto-switch to Track & Kitchen showing Order #1001 & real Leaflet map container
    expect(screen.getByText("Order #1001")).toBeInTheDocument();
    expect(screen.getByText(/Delivery to BITS Pilani Dubai Campus \(BPDC\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: /Live map from Set El Sham Restaurant to BITS Pilani Dubai Campus \(BPDC\)/i,
      }),
    ).toBeInTheDocument();

    // Immediately assigned to Cook 1 (Preparing)
    expect(screen.getByText("Cooking Now")).toBeInTheDocument();

    // Advance 2.5s -> finishes 2s prep -> Ready / Packed
    advanceSimulation(2500);
    expect(screen.getByText(/Packed · Awaiting Rider/i)).toBeInTheDocument();

    // Advance 1.5s -> passes 1.2s dispatch pause -> OutForDelivery
    advanceSimulation(1500);
    expect(screen.getByText("Driver En Route")).toBeInTheDocument();
    expect(screen.getByText("LIVE GPS")).toBeInTheDocument();
    expect(screen.getByText("Assigned Campus Rider")).toBeInTheDocument();

    // Send a quick ping to the assigned driver & verify instant reply
    fireEvent.click(screen.getByRole("button", { name: /Meet at main gate/i }));
    expect(screen.getByText("Hi! Please meet me at the main entrance gate.")).toBeInTheDocument();
    advanceSimulation(1000);
    expect(screen.getByText("Got it! Heading straight to the main gate now.")).toBeInTheDocument();

    // Advance remaining ride time (14s ride total, ~1s already elapsed -> advance 14s)
    advanceSimulation(14000);
    expect(screen.getByText("Delivered", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Arrived!")).toBeInTheDocument();
  });

  it("dispatches Rush Hour batch orders across 3 cooks and campus delivery riders", () => {
    render(<IndexPage />);

    fireEvent.click(screen.getByRole("button", { name: /Rush Hour/i }));
    fireEvent.click(screen.getByRole("button", { name: /Track & Kitchen/i }));

    // All 3 cooks should pick up orders immediately
    expect(screen.getByText("Kitchen Line (3 Cooks)")).toBeInTheDocument();
    expect(screen.getAllByText("#1001").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("#1002").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("#1003").length).toBeGreaterThanOrEqual(2);

    // Advance enough time for cooks to finish some orders and drivers to dispatch
    advanceSimulation(12000);
    expect(screen.getByText(/Campus Delivery Fleet \(3 Riders\)/i)).toBeInTheDocument();
  });
});
