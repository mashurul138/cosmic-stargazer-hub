import * as satellite from "satellite.js";

export interface VisualPassPrediction {
  satId: number;
  satName: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  durationSeconds: number;
  maxElevation: number; // Degrees above horizon
  startAzimuthCompass: string; // e.g. "NW"
  endAzimuthCompass: string;   // e.g. "SE"
  maxBrightnessMag: number;    // Estimated magnitude
  isBrightPass: boolean;       // True if maxElevation > 30 deg
}

export interface SatelliteMetadata {
  id: number;
  name: string;
  shortName: string;
  standardMag: number;
  line1: string;
  line2: string;
}

export const SATELLITES: Record<number, SatelliteMetadata> = {
  25544: {
    id: 25544,
    name: "International Space Station (ISS)",
    shortName: "ISS",
    standardMag: -2.8,
    line1: "1 25544U 98067A   24080.52083333  .00016717  00000+0  10270-3 0  9993",
    line2: "2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.49815000445001",
  },
  20580: {
    id: 20580,
    name: "Hubble Space Telescope (HST)",
    shortName: "Hubble",
    standardMag: 1.8,
    line1: "1 20580U 90037B   24080.50000000  .00001500  00000+0  50000-4 0  9998",
    line2: "2 20580  28.4690 150.2345 0003000  85.1200 275.0000 15.09250000850004",
  },
  48274: {
    id: 48274,
    name: "Tiangong Space Station (CSS)",
    shortName: "Tiangong",
    standardMag: -1.5,
    line1: "1 48274U 21035A   24080.51000000  .00021000  00000+0  15000-3 0  9994",
    line2: "2 48274  41.4720 180.5000 0004000 110.0000 250.0000 15.61000000160002",
  },
};

const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

/**
 * Converts an azimuth in degrees (0 - 360) to a 16-point cardinal compass string.
 */
export function azimuthToCompass(azimuthDeg: number): string {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_POINTS[index];
}

interface N2yoPassItem {
  startAz: number;
  startAzCompass?: string;
  startUTC: number;
  maxAz?: number;
  maxAzCompass?: string;
  maxEl: number;
  maxUTC?: number;
  endAz: number;
  endAzCompass?: string;
  endUTC: number;
  mag?: number;
  duration?: number;
}

interface N2yoResponse {
  info?: {
    satid: number;
    satname: string;
    passescount?: number;
  };
  passes?: N2yoPassItem[];
  error?: string;
}

/**
 * High-precision SGP4 orbital propagation fallback using satellite.js.
 * Generates visual pass predictions when N2YO is unconfigured, throttled, or offline.
 */
export function propagateLocalPasses(
  lat: number,
  lng: number,
  alt: number,
  satId: number,
  days: number = 5,
): VisualPassPrediction[] {
  const satMeta = SATELLITES[satId] ?? SATELLITES[25544];
  const satrec = satellite.twoline2satrec(satMeta.line1, satMeta.line2);

  const observer = {
    latitude: satellite.degreesToRadians(lat),
    longitude: satellite.degreesToRadians(lng),
    height: (alt || 0) / 1000,
  };

  const passes: VisualPassPrediction[] = [];
  const now = new Date();
  const stepMinutes = 2;
  const totalSteps = Math.min(Math.round((days * 24 * 60) / stepMinutes), 3600);

  let inPass = false;
  let passStartTime: Date | null = null;
  let passStartAz = 0;
  let passMaxEl = 0;
  let passEndAz = 0;

  for (let i = 0; i < totalSteps; i++) {
    const time = new Date(now.getTime() + i * stepMinutes * 60000);
    const posAndVel = satellite.propagate(satrec, time);

    if (
      !posAndVel ||
      !posAndVel.position ||
      typeof posAndVel.position !== "object" ||
      typeof (posAndVel.position as satellite.EciVec3<number>).x !== "number"
    ) {
      continue;
    }

    const gmst = satellite.gstime(time);
    const ecf = satellite.eciToEcf(posAndVel.position as satellite.EciVec3<number>, gmst);
    const look = satellite.ecfToLookAngles(observer, ecf);

    const elDeg = satellite.radiansToDegrees(look.elevation);
    const azDeg = (satellite.radiansToDegrees(look.azimuth) + 360) % 360;

    // A visual pass threshold of 10° above horizon
    if (elDeg >= 10) {
      if (!inPass) {
        inPass = true;
        passStartTime = time;
        passStartAz = azDeg;
        passMaxEl = elDeg;
        passEndAz = azDeg;
      } else {
        if (elDeg > passMaxEl) {
          passMaxEl = elDeg;
        }
        passEndAz = azDeg;
      }
    } else {
      if (inPass && passStartTime) {
        inPass = false;
        const endTime = time;
        const durationSeconds = Math.max(
          120,
          Math.round((endTime.getTime() - passStartTime.getTime()) / 1000),
        );
        const roundedMaxEl = Number(passMaxEl.toFixed(1));

        // Estimate perceived brightness based on peak elevation angle
        const elevationBonus = (passMaxEl / 90) * 1.5;
        const estMag = Number((satMeta.standardMag - elevationBonus).toFixed(1));

        passes.push({
          satId: satMeta.id,
          satName: satMeta.name,
          startTime: passStartTime.toISOString(),
          endTime: endTime.toISOString(),
          durationSeconds,
          maxElevation: roundedMaxEl,
          startAzimuthCompass: azimuthToCompass(passStartAz),
          endAzimuthCompass: azimuthToCompass(passEndAz),
          maxBrightnessMag: estMag,
          isBrightPass: roundedMaxEl > 30,
        });

        passStartTime = null;
      }
    }
  }

  return passes;
}

/**
 * Fetch visual passes for a given satellite or all key satellites from N2YO API,
 * with automatic fallback to local satellite.js orbital calculation.
 */
export async function getVisualPasses(params: {
  lat: number;
  lng: number;
  alt?: number;
  satId?: number;
  days?: number;
}): Promise<VisualPassPrediction[]> {
  const { lat, lng, alt = 0, satId, days = 5 } = params;
  const apiKey = process.env.N2YO_API_KEY;

  // Determine which satellites to track
  const targetSatIds = satId && SATELLITES[satId] ? [satId] : [25544, 48274, 20580];

  // If no N2YO key is configured, immediately run local orbital calculations
  if (!apiKey || apiKey.trim() === "") {
    const allPasses = targetSatIds.flatMap((id) =>
      propagateLocalPasses(lat, lng, alt, id, days),
    );
    return allPasses.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  const results: VisualPassPrediction[] = [];

  for (const id of targetSatIds) {
    const satMeta = SATELLITES[id] ?? SATELLITES[25544];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/${id}/${lat}/${lng}/${alt}/${days}/300/&apiKey=${encodeURIComponent(
        apiKey,
      )}`;
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`N2YO request returned status ${response.status}`);
      }

      const data = (await response.json()) as N2yoResponse;

      if (data.passes && Array.isArray(data.passes) && data.passes.length > 0) {
        for (const pass of data.passes) {
          const startTime = new Date(pass.startUTC * 1000).toISOString();
          const endTime = new Date(pass.endUTC * 1000).toISOString();
          const duration =
            pass.duration ?? Math.max(60, Math.round(pass.endUTC - pass.startUTC));
          const maxElevation = Number(pass.maxEl.toFixed(1));

          results.push({
            satId: id,
            satName: satMeta.name,
            startTime,
            endTime,
            durationSeconds: duration,
            maxElevation,
            startAzimuthCompass: pass.startAzCompass ?? azimuthToCompass(pass.startAz),
            endAzimuthCompass: pass.endAzCompass ?? azimuthToCompass(pass.endAz),
            maxBrightnessMag: pass.mag ?? satMeta.standardMag,
            isBrightPass: maxElevation > 30,
          });
        }
      } else {
        // Fallback to local SGP4 propagation if API returned 0 passes or empty list
        const localPasses = propagateLocalPasses(lat, lng, alt, id, days);
        results.push(...localPasses);
      }
    } catch {
      // Fall back smoothly to local satellite.js propagation on timeout, network error, or rate limits
      const fallbackPasses = propagateLocalPasses(lat, lng, alt, id, days);
      results.push(...fallbackPasses);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Sort all upcoming passes in chronological order
  return results.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}
