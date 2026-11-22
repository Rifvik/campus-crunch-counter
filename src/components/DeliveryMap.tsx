import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, Navigation, Radio } from "lucide-react";
import type * as LeafletNS from "leaflet";
import {
  CAMPUS_LOCATIONS,
  CANTEEN_LAT_LNG,
  getDriverById,
  getLocationById,
  interpolateRoute,
  type LatLng,
} from "@/lib/campus";
import {
  formatDistance,
  getDeliveryProgress,
  getRemainingEtaSeconds,
  type DriverFleetState,
  type Order,
} from "@/lib/types";

interface DeliveryMapProps {
  order: Order;
  now: number;
  driverFleetStates: ReadonlyArray<DriverFleetState>;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeFitBounds(map: LeafletNS.Map, L: typeof LeafletNS, points: ReadonlyArray<LatLng>) {
  if (points.length === 0) return;
  try {
    const size = map.getSize();
    if (size.x <= 0 || size.y <= 0) return;
    const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng] as [number, number]));
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 16, animate: true });
  } catch {
    // Ignore layout edge cases in headless/test environments without painted dimensions
  }
}

export function DeliveryMap({ order, now, driverFleetStates }: DeliveryMapProps) {
  const destination = getLocationById(order.locationId);
  const assignedDriver = getDriverById(order.driverId);

  const rawProgress = getDeliveryProgress(order, now);
  const route = interpolateRoute(destination.waypoints, rawProgress, destination.checkpoints);
  const etaSeconds = getRemainingEtaSeconds(order, now, destination.rideSeconds);
  const remainingMeters =
    order.status === "Delivered"
      ? 0
      : order.status === "OutForDelivery"
        ? Math.max(15, Math.round(destination.distanceMeters * (1 - rawProgress)))
        : destination.distanceMeters;

  const isEnRoute = order.status === "OutForDelivery";
  const isDelivered = order.status === "Delivered";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const plannedLineRef = useRef<LeafletNS.Polyline | null>(null);
  const traveledLineRef = useRef<LeafletNS.Polyline | null>(null);
  const driverMarkerRef = useRef<LeafletNS.Marker | null>(null);
  const locationMarkersRef = useRef<Map<string, LeafletNS.Marker>>(new Map());
  const fleetLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const lastFitKeyRef = useRef<string>("");
  const [mapReady, setMapReady] = useState(false);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    safeFitBounds(map, L, destination.waypoints);
  }, [destination.waypoints]);

  // Initialize Leaflet lazily on the client only (SSR-safe)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;

    void import("leaflet").then((mod) => {
      if (cancelled || !mapContainerRef.current) return;
      const L = (mod.default ?? mod) as typeof LeafletNS;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: [CANTEEN_LAT_LNG[0], CANTEEN_LAT_LNG[1]],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const plannedLine = L.polyline([], {
        color: "#ea580c",
        weight: 5,
        opacity: 0.42,
        dashArray: "8 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const traveledLine = L.polyline([], {
        color: "#ea580c",
        weight: 5.5,
        opacity: 0.92,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Origin marker: Set El Sham Restaurant
      const canteenIcon = L.divIcon({
        className: "canteen-div-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `
          <div style="position:relative;width:28px;height:28px;display:grid;place-items:center;">
            <div style="width:26px;height:26px;border-radius:9999px;background:#ea580c;border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:grid;place-items:center;color:#fff;font-size:11px;font-weight:800;">
              S
            </div>
            <div style="position:absolute;top:30px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(255,255,255,0.95);color:#292524;border:1px solid #fed7aa;padding:1px 7px;border-radius:9999px;font-size:10px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
              Set El Sham
            </div>
          </div>
        `,
      });
      L.marker([CANTEEN_LAT_LNG[0], CANTEEN_LAT_LNG[1]], {
        icon: canteenIcon,
        zIndexOffset: 200,
      })
        .bindTooltip("Set El Sham Restaurant · Dubai Outsource City", { direction: "top" })
        .addTo(map);

      // Create markers for all 10 major hostels and universities
      const locMarkers = new Map<string, LeafletNS.Marker>();
      for (const loc of CAMPUS_LOCATIONS) {
        const marker = L.marker([loc.latLng[0], loc.latLng[1]], {
          zIndexOffset: 100,
        })
          .bindTooltip(
            `${loc.name} (${loc.category === "hostel" ? "Hostel" : "University"} · ${formatDistance(loc.distanceMeters)})`,
            { direction: "top" },
          )
          .addTo(map);
        locMarkers.set(loc.id, marker);
      }

      const fleetLayer = L.layerGroup().addTo(map);
      const driverMarker = L.marker([CANTEEN_LAT_LNG[0], CANTEEN_LAT_LNG[1]], {
        zIndexOffset: 600,
      }).addTo(map);

      mapRef.current = map;
      plannedLineRef.current = plannedLine;
      traveledLineRef.current = traveledLine;
      locationMarkersRef.current = locMarkers;
      fleetLayerRef.current = fleetLayer;
      driverMarkerRef.current = driverMarker;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      lastFitKeyRef.current = "";
      locationMarkersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      plannedLineRef.current = null;
      traveledLineRef.current = null;
      driverMarkerRef.current = null;
      fleetLayerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  // Synchronize polylines, building markers, driver marker, and fleet markers on every state tick
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const plannedLine = plannedLineRef.current;
    const traveledLine = traveledLineRef.current;
    const driverMarker = driverMarkerRef.current;
    const fleetLayer = fleetLayerRef.current;

    if (!mapReady || !map || !L || !plannedLine || !traveledLine || !driverMarker || !fleetLayer) {
      return;
    }

    // Update planned & traveled polylines
    plannedLine.setLatLngs(route.fullLatLngs.map(([lat, lng]) => [lat, lng] as [number, number]));
    plannedLine.setStyle({
      color: isDelivered ? "#10b981" : "#ea580c",
      opacity: isDelivered ? 0.35 : 0.42,
    });

    if (isEnRoute || isDelivered) {
      traveledLine.setLatLngs(
        route.traveledLatLngs.map(([lat, lng]) => [lat, lng] as [number, number]),
      );
      traveledLine.setStyle({
        color: isDelivered ? "#059669" : "#ea580c",
        opacity: 0.94,
      });
    } else {
      traveledLine.setLatLngs([]);
    }

    // Style all 10 hostel & university markers (highlighting current target)
    for (const loc of CAMPUS_LOCATIONS) {
      const marker = locationMarkersRef.current.get(loc.id);
      if (!marker) continue;
      const isTarget = loc.id === destination.id;
      const isHostel = loc.category === "hostel";
      const baseColor = isHostel ? "#e11d48" : "#4338ca";
      const activeColor = isDelivered ? "#059669" : "#ea580c";
      const badgeLabel = isHostel ? "H" : "U";

      if (isTarget) {
        marker.setZIndexOffset(350);
        marker.setIcon(
          L.divIcon({
            className: "canteen-div-icon",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
            html: `
              <div style="position:relative;width:26px;height:26px;display:grid;place-items:center;">
                <div style="width:24px;height:24px;border-radius:9999px;background:${activeColor};border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:grid;place-items:center;color:#fff;font-size:10px;font-weight:800;">
                  ${badgeLabel}
                </div>
                <div style="position:absolute;top:28px;left:50%;transform:translateX(-50%);white-space:nowrap;background:${isDelivered ? "#ecfdf5" : "#fff7ed"};color:${isDelivered ? "#065f46" : "#9a3412"};border:1.5px solid ${activeColor};padding:2px 8px;border-radius:9999px;font-size:10.5px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,0.16);">
                  ${escapeHtml(loc.shortName)}
                </div>
              </div>
            `,
          }),
        );
      } else {
        marker.setZIndexOffset(100);
        marker.setIcon(
          L.divIcon({
            className: "canteen-div-icon",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            html: `
              <div style="width:18px;height:18px;border-radius:9999px;background:${baseColor};opacity:0.86;border:2px solid #ffffff;box-shadow:0 1px 5px rgba(0,0,0,0.22);display:grid;place-items:center;color:#fff;font-size:9px;font-weight:800;">
                ${badgeLabel}
              </div>
            `,
          }),
        );
      }
    }

    // Update primary driver marker position + heading + label pill
    const driverLabel = isDelivered
      ? `Delivered · ${assignedDriver?.name.split(" ")[0] ?? "Rider"}`
      : isEnRoute && assignedDriver
        ? `${assignedDriver.name.split(" ")[0]} · ${formatDistance(remainingMeters)} away`
        : `Order #${order.id} · At Kitchen`;

    const driverCircleBg = isDelivered ? "#059669" : "#ea580c";
    const pulseRingHtml =
      isEnRoute || order.status === "Ready"
        ? `<div class="driver-gps-ring" style="position:absolute;inset:-4px;border-radius:9999px;background:${
            isEnRoute ? "rgba(234,88,12,0.34)" : "rgba(217,119,6,0.32)"
          };"></div>`
        : "";

    const innerSymbolHtml = isDelivered
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" style="transform:rotate(${route.angleDeg.toFixed(1)}deg);"><path d="M5 4 L21 12 L5 20 L9 12 Z" fill="white"/></svg>`;

    driverMarker.setLatLng([route.lat, route.lng]);
    driverMarker.setIcon(
      L.divIcon({
        className: "canteen-div-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        html: `
          <div style="position:relative;width:36px;height:36px;display:grid;place-items:center;">
            ${pulseRingHtml}
            <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:${driverCircleBg};border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.34);display:grid;place-items:center;">
              ${innerSymbolHtml}
            </div>
            <div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(28,25,23,0.92);color:#ffffff;border:1px solid rgba(255,255,255,0.65);padding:2px 9px;border-radius:9999px;font-size:10.5px;font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,0.22);">
              ${escapeHtml(driverLabel)}
            </div>
          </div>
        `,
      }),
    );

    // Update secondary active fleet markers
    fleetLayer.clearLayers();
    const otherActiveRiders = driverFleetStates.filter(
      (d) => d.driver.id !== order.driverId && d.state !== "available",
    );
    for (const fleet of otherActiveRiders) {
      const fleetColor = fleet.state === "returning" ? "#64748b" : "#0284c7";
      const m = L.marker([fleet.lat, fleet.lng], {
        zIndexOffset: 260,
        icon: L.divIcon({
          className: "canteen-div-icon",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          html: `
            <div style="width:20px;height:20px;border-radius:9999px;background:${fleetColor};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:grid;place-items:center;color:#fff;font-size:8.5px;font-weight:800;">
              ${escapeHtml(fleet.driver.initials)}
            </div>
          `,
        }),
      }).bindTooltip(
        `${fleet.driver.name} (${fleet.state === "returning" ? "Returning to Set El Sham" : `Delivering #${fleet.order?.id ?? ""}`})`,
        { direction: "top" },
      );
      fleetLayer.addLayer(m);
    }

    // Fit map bounds automatically when viewing a new order or destination
    const fitKey = `${order.id}:${destination.id}`;
    if (lastFitKeyRef.current !== fitKey) {
      lastFitKeyRef.current = fitKey;
      safeFitBounds(map, L, route.fullLatLngs);
    }
  }, [
    assignedDriver,
    destination.id,
    driverFleetStates,
    isDelivered,
    isEnRoute,
    mapReady,
    order.driverId,
    order.id,
    order.status,
    remainingMeters,
    route,
  ]);

  return (
    <div
      role="region"
      aria-label={`Live map from Set El Sham Restaurant to ${destination.name}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      {/* Dedicated telemetry strip above the map canvas */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/35 px-3.5 py-2.5">
        <div className="inline-flex items-center gap-2 text-xs font-bold">
          {isEnRoute ? (
            <>
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-foreground">LIVE GPS</span>
              <span className="text-muted-foreground">· {route.currentLandmark}</span>
            </>
          ) : isDelivered ? (
            <>
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-ready-foreground">Delivered at {destination.shortName}</span>
            </>
          ) : (
            <>
              <Radio className="size-3.5 text-prep-foreground" />
              <span className="text-foreground">
                {order.status === "Ready" ? "Dispatching Rider" : "At Set El Sham Kitchen (DOZ)"}
              </span>
            </>
          )}
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs font-bold shadow-2xs">
          <Navigation className="size-3.5 text-primary" />
          <span>{formatDistance(remainingMeters)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-primary">{isDelivered ? "Arrived" : `${etaSeconds}s ETA`}</span>
        </div>
      </div>

      {/* Interactive Leaflet Map Container isolated from header/modal stacking contexts */}
      <div className="relative isolate z-0 h-[340px] w-full sm:h-[380px]">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Recenter button */}
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute right-3 top-3 z-[850] inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 py-1.5 text-xs font-bold text-foreground shadow-sm backdrop-blur-xs transition hover:border-primary hover:bg-card cursor-pointer"
        >
          <LocateFixed className="size-3.5 text-primary" />
          Recenter
        </button>
      </div>

      {/* Map legend footer below canvas so bottom-edge pins never collide */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-muted/35 px-3.5 py-2 text-[11px] font-bold text-foreground">
        <div className="inline-flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ea580c]" />
            Set El Sham
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#e11d48]" />
            Hostel
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#4338ca]" />
            University
          </span>
        </div>
        <span className="text-[10.5px] font-semibold text-muted-foreground">
          Dubai International Academic City
        </span>
      </div>
    </div>
  );
}
