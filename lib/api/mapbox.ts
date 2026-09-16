export interface BortleDetails {
  bortleClass: number; // 1 to 9
  title: string;       // e.g., "Class 3: Rural Sky"
  color: string;       // Hex color for badge
  nelm: number;        // Naked-Eye Limiting Magnitude (e.g., 6.6 to 7.0)
  description: string; // Detail on sky glow and visibility
  suitableTargets: string[]; // Recommended observing targets
}

interface UrbanCenter {
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  peakBortle: number;
}

const URBAN_CENTERS: UrbanCenter[] = [
  { name: "Tokyo", lat: 35.6762, lon: 139.6503, radiusKm: 70, peakBortle: 9 },
  { name: "New York", lat: 40.7128, lon: -74.006, radiusKm: 65, peakBortle: 9 },
  { name: "London", lat: 51.5074, lon: -0.1278, radiusKm: 55, peakBortle: 8.5 },
  { name: "Paris", lat: 48.8566, lon: 2.3522, radiusKm: 50, peakBortle: 8.5 },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, radiusKm: 70, peakBortle: 8.5 },
  { name: "Chicago", lat: 41.8781, lon: -87.6298, radiusKm: 50, peakBortle: 8 },
  { name: "Shanghai", lat: 31.2304, lon: 121.4737, radiusKm: 65, peakBortle: 9 },
  { name: "Beijing", lat: 39.9042, lon: 116.4074, radiusKm: 65, peakBortle: 9 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777, radiusKm: 55, peakBortle: 9 },
  { name: "Delhi", lat: 28.6139, lon: 77.209, radiusKm: 60, peakBortle: 9 },
  { name: "Dhaka", lat: 23.8103, lon: 90.4125, radiusKm: 50, peakBortle: 9 },
  { name: "Sao Paulo", lat: -23.5505, lon: -46.6333, radiusKm: 60, peakBortle: 8.5 },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, radiusKm: 50, peakBortle: 8.5 },
  { name: "Moscow", lat: 55.7558, lon: 37.6173, radiusKm: 55, peakBortle: 8.5 },
  { name: "Seoul", lat: 37.5665, lon: 126.978, radiusKm: 55, peakBortle: 9 },
  { name: "Houston", lat: 29.7604, lon: -95.3698, radiusKm: 50, peakBortle: 8 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, radiusKm: 50, peakBortle: 8 },
  { name: "Hong Kong", lat: 22.3193, lon: 114.1694, radiusKm: 40, peakBortle: 9 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198, radiusKm: 35, peakBortle: 9 },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, radiusKm: 60, peakBortle: 9 },
  { name: "Berlin", lat: 52.52, lon: 13.405, radiusKm: 40, peakBortle: 7.5 },
  { name: "Toronto", lat: 43.6532, lon: -79.3832, radiusKm: 45, peakBortle: 8 },
];

const BORTLE_DATA_LOOKUP: Record<number, Omit<BortleDetails, "bortleClass">> = {
  1: {
    title: "Class 1: Excellent Dark Sky",
    color: "#10b981",
    nelm: 7.8,
    description:
      "Zodiacal light, gegenschein, and zodiacal band are clearly visible. The Scorpius and Sagittarius regions of the Milky Way cast obvious shadows. Airglow is readily visible.",
    suitableTargets: [
      "Zodiacal light & Gegenschein",
      "Faint emission nebulae",
      "M33 naked-eye direct",
      "Airglow bands",
      "Pinwheel Galaxy (M101)",
    ],
  },
  2: {
    title: "Class 2: Typical Truly Dark Sky",
    color: "#059669",
    nelm: 7.3,
    description:
      "Airglow may be weakly visible near horizon. Complex structures in the Milky Way like the Great Rift are easily seen. M33 is easily visible with the naked eye.",
    suitableTargets: [
      "M33 naked-eye",
      "Faint globular clusters",
      "Barnard dark nebulae",
      "Distant galaxy clusters",
    ],
  },
  3: {
    title: "Class 3: Rural Sky",
    color: "#0284c7",
    nelm: 6.8,
    description:
      "Some light pollution evident along the horizon. The Milky Way still appears rich and detailed. Globular clusters like M13 and M4 are distinct naked-eye targets.",
    suitableTargets: [
      "M31 Andromeda Galaxy",
      "Messier Objects",
      "Faint Nebulae",
      "NGC Star Clusters",
    ],
  },
  4: {
    title: "Class 4: Rural/Suburban Transition",
    color: "#3b82f6",
    nelm: 6.3,
    description:
      "Light pollution domes fairly evident in several directions. The Milky Way above horizon is still impressive but lacks subtle contrast in dimmer regions.",
    suitableTargets: [
      "Bright Messier objects",
      "Open star clusters",
      "Planetary nebulae",
      "Hercules Cluster (M13)",
    ],
  },
  5: {
    title: "Class 5: Suburban Sky",
    color: "#eab308",
    nelm: 5.8,
    description:
      "The Milky Way is very weak or invisible near the horizon. Light sources are evident in most directions. Clouds are visibly brighter than the sky itself.",
    suitableTargets: [
      "Moon & Bright Planets",
      "Double stars",
      "Orion Nebula (M42)",
      "Pleiades (M45)",
    ],
  },
  6: {
    title: "Class 6: Bright Suburban Sky",
    color: "#f97316",
    nelm: 5.3,
    description:
      "Milky Way only visible near zenith. The sky within 35° of the horizon glows grayish white. Clouds anywhere in the sky appear fairly bright.",
    suitableTargets: [
      "Bright solar system targets",
      "Brightest open clusters",
      "Double stars (Albireo)",
      "Orion Nebula core",
    ],
  },
  7: {
    title: "Class 7: Suburban/Urban Transition",
    color: "#ea580c",
    nelm: 4.8,
    description:
      "Entire background sky has a vague grayish-white hue. Strong light sources in all directions. The Milky Way is completely invisible.",
    suitableTargets: [
      "Moon and bright planets",
      "Jupiter moons & cloud belts",
      "Saturn rings",
      "Brightest double stars",
    ],
  },
  8: {
    title: "Class 8: City Sky",
    color: "#ef4444",
    nelm: 4.3,
    description:
      "Sky glow brightly whitens entire sky. Constellation outlines are faint or missing faint member stars. Newspaper headlines can easily be read without extra light.",
    suitableTargets: [
      "The Moon",
      "Venus, Jupiter, Saturn, Mars",
      "ISS Flyovers",
      "First-magnitude stars",
    ],
  },
  9: {
    title: "Class 9: Inner-City Sky",
    color: "#dc2626",
    nelm: 4.0,
    description:
      "Entire sky is brilliantly illuminated even at zenith. Many stars comprising constellations are invisible. Only the Moon and brightest planets can be seen.",
    suitableTargets: [
      "The Moon",
      "Venus & Jupiter",
      "Bright satellite passes",
      "Major bright star pairs",
    ],
  },
};

function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatCoordinateFallback(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Calculates or estimates the Bortle Class (1-9) based on geographic location parameters.
 */
export function getBortleDetails(latitude: number, longitude: number): BortleDetails {
  const validLat = Number.isFinite(latitude) ? Math.max(-90, Math.min(90, latitude)) : 0;
  const validLon = Number.isFinite(longitude) ? Math.max(-180, Math.min(180, longitude)) : 0;

  // Polar and open deep ocean baseline (pristine dark sky)
  const isPolar = Math.abs(validLat) > 66.5;
  const isHighSeas =
    Math.abs(validLat) < 55 &&
    ((validLon < -125 && validLon > -165) || // Eastern Pacific
      (validLon < -25 && validLon > -50) ||   // Mid Atlantic
      (validLon > 65 && validLon < 95 && validLat < 5)); // Indian Ocean

  let baseBortle = isPolar || isHighSeas ? 1.0 : 3.0;

  // Evaluate proximity to major urban light domes
  let maxUrbanImpact = 0;
  for (const center of URBAN_CENTERS) {
    const distance = calculateHaversineDistanceKm(validLat, validLon, center.lat, center.lon);
    if (distance <= center.radiusKm) {
      // Linear transition within core metropolitan radius
      const urbanFactor = (1 - distance / center.radiusKm);
      const impact = (center.peakBortle - baseBortle) * urbanFactor;
      if (impact > maxUrbanImpact) {
        maxUrbanImpact = impact;
      }
    } else if (distance < center.radiusKm * 3.5) {
      // Exponential falloff for regional light dome
      const excess = distance - center.radiusKm;
      const decay = Math.exp(-excess / 35);
      const impact = (center.peakBortle - baseBortle) * 0.45 * decay;
      if (impact > maxUrbanImpact) {
        maxUrbanImpact = impact;
      }
    }
  }

  const calculatedClass = Math.round(baseBortle + maxUrbanImpact);
  const boundedClass = Math.max(1, Math.min(9, calculatedClass));
  const details = BORTLE_DATA_LOOKUP[boundedClass];

  return {
    bortleClass: boundedClass,
    title: details.title,
    color: details.color,
    nelm: details.nelm,
    description: details.description,
    suitableTargets: [...details.suitableTargets],
  };
}

/**
 * Reverse geocodes coordinates into a readable place name using the Mapbox Geocoding API.
 * Uses an AbortController with a 5000ms timeout and graceful fallback to formatted coordinates.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const fallback = formatCoordinateFallback(latitude, longitude);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token.trim() === "") {
    return fallback;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${encodeURIComponent(token)}`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as {
      features?: Array<{ place_name?: string }>;
    };

    const placeName = data.features?.[0]?.place_name;
    return placeName && placeName.trim().length > 0 ? placeName : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}
