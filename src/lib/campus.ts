export type LatLng = readonly [number, number];

export type LocationCategory = "hostel" | "university";

export type CampusLocationId =
  | "myriad"
  | "ksk"
  | "amity-hostel"
  | "manipal-hostel"
  | "bits"
  | "manipal"
  | "amity"
  | "birmingham"
  | "curtin"
  | "aue";

export interface CampusLocation {
  id: CampusLocationId;
  category: LocationCategory;
  name: string;
  shortName: string;
  zone: string;
  distanceMeters: number;
  rideSeconds: number;
  latLng: LatLng;
  waypoints: readonly LatLng[];
  checkpoints: readonly string[];
}

export interface DriverProfile {
  id: string;
  name: string;
  initials: string;
  vehicle: string;
  plate: string;
  rating: number;
  speedKmh: number;
  accentHue: string;
}

export interface QuickPingOption {
  id: string;
  label: string;
  message: string;
  reply: string;
}

export interface InterpolatedRoute {
  lat: number;
  lng: number;
  angleDeg: number;
  currentLandmark: string;
  traveledLatLngs: LatLng[];
  fullLatLngs: LatLng[];
}

export const CANTEEN_LAT_LNG: LatLng = [25.12648, 55.42439];

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  // Hostels & Student Residences
  {
    id: "myriad",
    category: "hostel",
    name: "The Myriad Dubai",
    shortName: "The Myriad",
    zone: "DIAC Student Residence",
    distanceMeters: 1363,
    rideSeconds: 11,
    latLng: [25.12895, 55.41918],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.12626, 55.42288],
      [25.1256, 55.42254],
      [25.12544, 55.42241],
      [25.12537, 55.42227],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12818, 55.42114],
      [25.12824, 55.42131],
      [25.12841, 55.42136],
      [25.12851, 55.42131],
      [25.12857, 55.42118],
      [25.12853, 55.4208],
      [25.12895, 55.41918],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing VOGO Grand Dubai",
      "Academic City Inner Ring",
      "Approaching The Myriad",
      "Arrived at The Myriad Dubai",
    ],
  },
  {
    id: "ksk",
    category: "hostel",
    name: "KSK Homes Student Residence",
    shortName: "KSK Homes",
    zone: "Academic City Ring",
    distanceMeters: 1800,
    rideSeconds: 14,
    latLng: [25.12972, 55.42725],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.12626, 55.42288],
      [25.1256, 55.42254],
      [25.12544, 55.42241],
      [25.12537, 55.42227],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12818, 55.42114],
      [25.1282, 55.42135],
      [25.12796, 55.42214],
      [25.12786, 55.42284],
      [25.12787, 55.42357],
      [25.12797, 55.42414],
      [25.12819, 55.4248],
      [25.12856, 55.42548],
      [25.1291, 55.42614],
      [25.12961, 55.42655],
      [25.12954, 55.42668],
      [25.12968, 55.42688],
      [25.12983, 55.42696],
      [25.12972, 55.42725],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Rounding DIAC Central Loop",
      "East Academic City Curve",
      "Approaching KSK Homes",
      "Arrived at KSK Homes Student Residence",
    ],
  },
  {
    id: "amity-hostel",
    category: "hostel",
    name: "Amity University Dubai Hostel",
    shortName: "Amity Hostel",
    zone: "South DIAC",
    distanceMeters: 1576,
    rideSeconds: 13,
    latLng: [25.12117, 55.42007],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.12626, 55.42288],
      [25.1256, 55.42254],
      [25.12544, 55.42241],
      [25.12537, 55.42227],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12487, 55.41936],
      [25.12486, 55.41922],
      [25.12477, 55.4191],
      [25.12459, 55.41909],
      [25.12448, 55.41924],
      [25.12448, 55.41938],
      [25.12455, 55.41947],
      [25.12456, 55.41967],
      [25.12428, 55.42134],
      [25.12414, 55.42195],
      [25.12395, 55.42234],
      [25.1237, 55.42264],
      [25.12342, 55.42289],
      [25.12322, 55.42295],
      [25.12301, 55.42292],
      [25.12288, 55.42281],
      [25.12272, 55.42245],
      [25.12264, 55.4224],
      [25.12239, 55.42196],
      [25.12111, 55.42012],
      [25.12117, 55.42007],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing Dubai Outsource City",
      "Turning past Amity Campus",
      "Approaching Amity Hostel",
      "Arrived at Amity University Dubai Hostel",
    ],
  },
  {
    id: "manipal-hostel",
    category: "hostel",
    name: "Manipal University Hostel",
    shortName: "Manipal Hostel",
    zone: "North DIAC",
    distanceMeters: 2289,
    rideSeconds: 16,
    latLng: [25.13458, 55.4256],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.1256, 55.42254],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12818, 55.42114],
      [25.12829, 55.42135],
      [25.12876, 55.42134],
      [25.12987, 55.4219],
      [25.1296, 55.4226],
      [25.12954, 55.42307],
      [25.1296, 55.42358],
      [25.12988, 55.42429],
      [25.13047, 55.42492],
      [25.13114, 55.42521],
      [25.13195, 55.42519],
      [25.1327, 55.42479],
      [25.133, 55.42448],
      [25.13328, 55.42402],
      [25.13415, 55.42441],
      [25.13441, 55.42461],
      [25.13491, 55.4253],
      [25.13458, 55.4256],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing The Myriad Ave",
      "North Academic Roundabout",
      "Approaching Manipal Hostel",
      "Arrived at Manipal University Hostel",
    ],
  },

  // Major Universities
  {
    id: "bits",
    category: "university",
    name: "BITS Pilani Dubai Campus (BPDC)",
    shortName: "BITS Pilani",
    zone: "Academic City North",
    distanceMeters: 1767,
    rideSeconds: 14,
    latLng: [25.13132, 55.41914],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.1256, 55.42254],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12818, 55.42114],
      [25.12824, 55.42131],
      [25.12841, 55.42136],
      [25.12857, 55.42118],
      [25.12853, 55.4208],
      [25.12912, 55.41857],
      [25.12931, 55.41822],
      [25.12956, 55.41795],
      [25.12978, 55.41798],
      [25.13038, 55.41879],
      [25.13053, 55.41866],
      [25.13086, 55.41909],
      [25.13132, 55.41914],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing VOGO Grand Dubai",
      "Passing BPDC Sports Complex",
      "Approaching BITS Pilani Gate",
      "Arrived at BITS Pilani Dubai Campus",
    ],
  },
  {
    id: "manipal",
    category: "university",
    name: "Manipal Academy (MAHE Dubai)",
    shortName: "MAHE Dubai",
    zone: "Academic City North",
    distanceMeters: 2329,
    rideSeconds: 17,
    latLng: [25.13358, 55.42543],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.1256, 55.42254],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12818, 55.42114],
      [25.12829, 55.42135],
      [25.12876, 55.42134],
      [25.12987, 55.4219],
      [25.1296, 55.4226],
      [25.12954, 55.42307],
      [25.1296, 55.42358],
      [25.12988, 55.42429],
      [25.13047, 55.42492],
      [25.13114, 55.42521],
      [25.13195, 55.42519],
      [25.1327, 55.42479],
      [25.133, 55.42448],
      [25.13328, 55.42402],
      [25.13415, 55.42441],
      [25.13445, 55.42467],
      [25.13428, 55.42482],
      [25.13429, 55.42498],
      [25.134, 55.4256],
      [25.13382, 55.42565],
      [25.13358, 55.42543],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing The Myriad Ave",
      "Academic City North Loop",
      "Approaching MAHE Main Block",
      "Arrived at Manipal Academy (MAHE Dubai)",
    ],
  },
  {
    id: "amity",
    category: "university",
    name: "Amity University Dubai",
    shortName: "Amity Univ.",
    zone: "Academic City South",
    distanceMeters: 1154,
    rideSeconds: 10,
    latLng: [25.12249, 55.41932],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.12626, 55.42288],
      [25.1256, 55.42254],
      [25.12544, 55.42241],
      [25.12537, 55.42227],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12487, 55.41936],
      [25.12486, 55.41922],
      [25.12482, 55.41914],
      [25.12472, 55.41908],
      [25.12444, 55.41912],
      [25.12428, 55.4191],
      [25.12379, 55.41883],
      [25.12332, 55.41844],
      [25.12335, 55.4187],
      [25.12348, 55.41883],
      [25.12344, 55.41902],
      [25.12288, 55.4186],
      [25.1228, 55.4186],
      [25.12256, 55.41885],
      [25.12234, 55.41925],
      [25.12244, 55.41933],
      [25.12249, 55.41932],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing Dubai Outsource City",
      "Academic City South Roundabout",
      "Approaching Amity Gate",
      "Arrived at Amity University Dubai",
    ],
  },
  {
    id: "birmingham",
    category: "university",
    name: "University of Birmingham Dubai",
    shortName: "Univ. of Birmingham",
    zone: "Academic City Ring",
    distanceMeters: 1588,
    rideSeconds: 13,
    latLng: [25.13175, 55.42283],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.1256, 55.42254],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12482, 55.41945],
      [25.12818, 55.42114],
      [25.12829, 55.42135],
      [25.12876, 55.42134],
      [25.12987, 55.4219],
      [25.13004, 55.42182],
      [25.13051, 55.422],
      [25.13128, 55.42252],
      [25.13174, 55.42306],
      [25.13184, 55.42296],
      [25.13175, 55.42283],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing VOGO Grand Dubai",
      "Academic City Central Park",
      "Approaching Birmingham Campus",
      "Arrived at Univ. of Birmingham Dubai",
    ],
  },
  {
    id: "curtin",
    category: "university",
    name: "Curtin University Dubai",
    shortName: "Curtin Univ.",
    zone: "Academic City West",
    distanceMeters: 1672,
    rideSeconds: 14,
    latLng: [25.1257, 55.41121],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.1256, 55.42254],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12487, 55.41936],
      [25.12481, 55.41891],
      [25.12506, 55.41746],
      [25.12502, 55.41729],
      [25.12469, 55.41711],
      [25.12444, 55.41682],
      [25.12432, 55.41646],
      [25.12431, 55.41617],
      [25.12455, 55.4156],
      [25.12565, 55.41459],
      [25.12591, 55.41412],
      [25.12605, 55.41223],
      [25.1258, 55.41171],
      [25.12543, 55.41145],
      [25.1257, 55.41121],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Heading West along DIAC Ave",
      "Passing Block 11 Courtyard",
      "Approaching Curtin Block",
      "Arrived at Curtin University Dubai",
    ],
  },
  {
    id: "aue",
    category: "university",
    name: "American University in the Emirates (AUE)",
    shortName: "AUE Dubai",
    zone: "Academic City West",
    distanceMeters: 2421,
    rideSeconds: 18,
    latLng: [25.12299, 55.41018],
    waypoints: [
      [25.12648, 55.42439],
      [25.12665, 55.42435],
      [25.12653, 55.42326],
      [25.12641, 55.42299],
      [25.1256, 55.42254],
      [25.12531, 55.42223],
      [25.12494, 55.42221],
      [25.12448, 55.42196],
      [25.12433, 55.42177],
      [25.1247, 55.41952],
      [25.12485, 55.41941],
      [25.12486, 55.41922],
      [25.12472, 55.41908],
      [25.12428, 55.4191],
      [25.12362, 55.41871],
      [25.1231, 55.41817],
      [25.12274, 55.41747],
      [25.12256, 55.41681],
      [25.12272, 55.41626],
      [25.1226, 55.41586],
      [25.12256, 55.41338],
      [25.12235, 55.41256],
      [25.12195, 55.4116],
      [25.12197, 55.41138],
      [25.12216, 55.4111],
      [25.12394, 55.40952],
      [25.1241, 55.40927],
      [25.12506, 55.40834],
      [25.12494, 55.40831],
      [25.12456, 55.40864],
      [25.12299, 55.41018],
    ],
    checkpoints: [
      "Leaving Set El Sham (DOZ)",
      "Passing Amity University Turn",
      "Passing Ministry of Higher Ed.",
      "Approaching AUE Campus Gate",
      "Arrived at AUE Dubai",
    ],
  },
];

export const HOSTEL_LOCATIONS = CAMPUS_LOCATIONS.filter((l) => l.category === "hostel");
export const UNIVERSITY_LOCATIONS = CAMPUS_LOCATIONS.filter((l) => l.category === "university");

export const DRIVERS: DriverProfile[] = [
  {
    id: "driver-1",
    name: "Tariq Al-Mansoor",
    initials: "TA",
    vehicle: "E-Scooter",
    plate: "CR-07",
    rating: 4.9,
    speedKmh: 24,
    accentHue: "oklch(0.60 0.185 38)",
  },
  {
    id: "driver-2",
    name: "Nadia Hassan",
    initials: "NH",
    vehicle: "Campus E-Bike",
    plate: "CR-12",
    rating: 4.95,
    speedKmh: 26,
    accentHue: "oklch(0.55 0.145 155)",
  },
  {
    id: "driver-3",
    name: "Rohan Nair",
    initials: "RN",
    vehicle: "E-Scooter",
    plate: "CR-03",
    rating: 4.85,
    speedKmh: 22,
    accentHue: "oklch(0.56 0.14 248)",
  },
];

export const DRIVER_QUICK_PINGS: QuickPingOption[] = [
  {
    id: "gate",
    label: "Meet at main gate",
    message: "Hi! Please meet me at the main entrance gate.",
    reply: "Got it! Heading straight to the main gate now.",
  },
  {
    id: "lobby",
    label: "Leave at reception",
    message: "You can drop the bag at the lobby reception desk.",
    reply: "Sure thing, I'll leave it safely at reception and ping you.",
  },
  {
    id: "eta",
    label: "How close are you?",
    message: "Quick check — how close are you to my building?",
    reply: "Rolling through Academic City right now — almost there!",
  },
];

const DEFAULT_CHECKPOINTS: readonly string[] = [
  "Leaving Set El Sham (DOZ)",
  "En route through Academic City",
  "Approaching drop-off",
  "Arrived",
];

function getCheckpointLabel(checkpoints: ReadonlyArray<string>, progress: number): string {
  const list = checkpoints.length > 0 ? checkpoints : DEFAULT_CHECKPOINTS;
  if (progress <= 0.08) return list[0] ?? "Leaving Set El Sham (DOZ)";
  if (progress >= 0.98) return list[list.length - 1] ?? "Arrived";
  const idx = Math.min(list.length - 1, Math.floor(progress * list.length));
  return list[idx] ?? list[0] ?? "En route";
}

export function interpolateRoute(
  waypoints: ReadonlyArray<LatLng>,
  rawProgress: number,
  checkpoints: ReadonlyArray<string> = DEFAULT_CHECKPOINTS,
): InterpolatedRoute {
  const progress = Number.isFinite(rawProgress) ? Math.min(1, Math.max(0, rawProgress)) : 0;
  const first = waypoints[0];
  if (!first) {
    return {
      lat: CANTEEN_LAT_LNG[0],
      lng: CANTEEN_LAT_LNG[1],
      angleDeg: 0,
      currentLandmark: getCheckpointLabel(checkpoints, 0),
      traveledLatLngs: [CANTEEN_LAT_LNG],
      fullLatLngs: [CANTEEN_LAT_LNG],
    };
  }

  const fullLatLngs: LatLng[] = [...waypoints];
  const last = waypoints[waypoints.length - 1] ?? first;

  if (waypoints.length === 1) {
    return {
      lat: first[0],
      lng: first[1],
      angleDeg: 0,
      currentLandmark: getCheckpointLabel(checkpoints, progress),
      traveledLatLngs: [first],
      fullLatLngs,
    };
  }

  const cosLat = Math.cos((first[0] * Math.PI) / 180);
  const segments: Array<{
    from: LatLng;
    to: LatLng;
    length: number;
    angleDeg: number;
  }> = [];
  let totalLength = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    if (!from || !to) continue;
    const dLat = to[0] - from[0];
    const dLonScaled = (to[1] - from[1]) * cosLat;
    const length = Math.hypot(dLat, dLonScaled);
    // Screen coordinates have Y increasing downward (-dLat) and X increasing East (+dLonScaled)
    const angleDeg = (Math.atan2(-dLat, dLonScaled) * 180) / Math.PI;
    segments.push({ from, to, length, angleDeg });
    totalLength += length;
  }

  if (totalLength <= 0 || progress <= 0) {
    const firstSeg = segments[0];
    return {
      lat: first[0],
      lng: first[1],
      angleDeg: firstSeg ? firstSeg.angleDeg : 0,
      currentLandmark: getCheckpointLabel(checkpoints, 0),
      traveledLatLngs: [first],
      fullLatLngs,
    };
  }

  if (progress >= 1) {
    const lastSeg = segments[segments.length - 1];
    return {
      lat: last[0],
      lng: last[1],
      angleDeg: lastSeg ? lastSeg.angleDeg : 0,
      currentLandmark: getCheckpointLabel(checkpoints, 1),
      traveledLatLngs: fullLatLngs,
      fullLatLngs,
    };
  }

  const targetDistance = totalLength * progress;
  let traversed = 0;
  const traveledLatLngs: LatLng[] = [first];

  for (const seg of segments) {
    if (traversed + seg.length >= targetDistance) {
      const localRatio = seg.length > 0 ? (targetDistance - traversed) / seg.length : 0;
      const lat = seg.from[0] + (seg.to[0] - seg.from[0]) * localRatio;
      const lng = seg.from[1] + (seg.to[1] - seg.from[1]) * localRatio;
      traveledLatLngs.push([lat, lng]);

      return {
        lat,
        lng,
        angleDeg: seg.angleDeg,
        currentLandmark: getCheckpointLabel(checkpoints, progress),
        traveledLatLngs,
        fullLatLngs,
      };
    }
    traveledLatLngs.push(seg.to);
    traversed += seg.length;
  }

  const fallbackSeg = segments[segments.length - 1];
  return {
    lat: last[0],
    lng: last[1],
    angleDeg: fallbackSeg ? fallbackSeg.angleDeg : 0,
    currentLandmark: getCheckpointLabel(checkpoints, 1),
    traveledLatLngs: fullLatLngs,
    fullLatLngs,
  };
}

export function getLocationById(id?: CampusLocationId): CampusLocation {
  const found = id ? CAMPUS_LOCATIONS.find((loc) => loc.id === id) : undefined;
  return found ?? CAMPUS_LOCATIONS[0]!;
}

export function getDriverById(id?: string): DriverProfile | undefined {
  if (!id) return undefined;
  return DRIVERS.find((driver) => driver.id === id);
}
