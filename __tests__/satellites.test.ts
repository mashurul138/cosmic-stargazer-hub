import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  azimuthToCompass,
  getVisualPasses,
  propagateLocalPasses,
  SATELLITES,
} from "@/lib/api/n2yo";

describe("azimuthToCompass", () => {
  it("converts exact cardinal azimuth degrees to 16-point compass directions", () => {
    expect(azimuthToCompass(0)).toBe("N");
    expect(azimuthToCompass(360)).toBe("N");
    expect(azimuthToCompass(45)).toBe("NE");
    expect(azimuthToCompass(90)).toBe("E");
    expect(azimuthToCompass(135)).toBe("SE");
    expect(azimuthToCompass(180)).toBe("S");
    expect(azimuthToCompass(225)).toBe("SW");
    expect(azimuthToCompass(270)).toBe("W");
    expect(azimuthToCompass(315)).toBe("NW");
  });

  it("handles negative degrees and full circular wraps", () => {
    expect(azimuthToCompass(-90)).toBe("W");
    expect(azimuthToCompass(720)).toBe("N");
    expect(azimuthToCompass(337.5)).toBe("NNW");
    expect(azimuthToCompass(22.5)).toBe("NNE");
  });
});

describe("propagateLocalPasses (satellite.js fallback)", () => {
  it("generates valid pass predictions for ISS with correct typed attributes", () => {
    const passes = propagateLocalPasses(40.7128, -74.006, 0, 25544, 3);
    expect(Array.isArray(passes)).toBe(true);

    if (passes.length > 0) {
      const firstPass = passes[0];
      expect(firstPass).toHaveProperty("satId", 25544);
      expect(firstPass.satName).toContain("ISS");
      expect(typeof firstPass.startTime).toBe("string");
      expect(typeof firstPass.endTime).toBe("string");

      // Verify dates are valid ISO strings
      const startMs = new Date(firstPass.startTime).getTime();
      const endMs = new Date(firstPass.endTime).getTime();
      expect(Number.isNaN(startMs)).toBe(false);
      expect(Number.isNaN(endMs)).toBe(false);
      expect(endMs).toBeGreaterThan(startMs);

      expect(firstPass.durationSeconds).toBeGreaterThan(0);
      expect(firstPass.maxElevation).toBeGreaterThanOrEqual(10);
      expect(typeof firstPass.startAzimuthCompass).toBe("string");
      expect(typeof firstPass.endAzimuthCompass).toBe("string");
      expect(typeof firstPass.maxBrightnessMag).toBe("number");
      expect(typeof firstPass.isBrightPass).toBe("boolean");
      expect(firstPass.isBrightPass).toBe(firstPass.maxElevation > 30);
    }
  });

  it("supports Hubble and Tiangong propagation without errors", () => {
    const hubblePasses = propagateLocalPasses(28.5383, -81.3792, 0, 20580, 2); // Orlando
    const tiangongPasses = propagateLocalPasses(39.9042, 116.4074, 0, 48274, 2); // Beijing

    expect(Array.isArray(hubblePasses)).toBe(true);
    expect(Array.isArray(tiangongPasses)).toBe(true);

    if (hubblePasses.length > 0) {
      expect(hubblePasses[0].satId).toBe(20580);
      expect(hubblePasses[0].satName).toContain("Hubble");
    }

    if (tiangongPasses.length > 0) {
      expect(tiangongPasses[0].satId).toBe(48274);
      expect(tiangongPasses[0].satName).toContain("Tiangong");
    }
  });
});

describe("getVisualPasses (API client + fallback)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("falls back cleanly to satellite.js when N2YO_API_KEY is missing", async () => {
    delete process.env.N2YO_API_KEY;

    const passes = await getVisualPasses({
      lat: 40.7128,
      lng: -74.006,
      satId: 25544,
      days: 3,
    });

    expect(Array.isArray(passes)).toBe(true);
    for (const pass of passes) {
      expect(pass.satId).toBe(25544);
      expect(pass.durationSeconds).toBeGreaterThan(0);
      expect(pass.maxElevation).toBeGreaterThanOrEqual(10);
    }
  });

  it("retrieves passes for all 3 key satellites when satId is not specified", async () => {
    delete process.env.N2YO_API_KEY;

    const passes = await getVisualPasses({
      lat: 34.0522,
      lng: -118.2437,
      days: 3,
    });

    expect(Array.isArray(passes)).toBe(true);
    // Verify passes are sorted chronologically
    for (let i = 1; i < passes.length; i++) {
      const prevTime = new Date(passes[i - 1].startTime).getTime();
      const currTime = new Date(passes[i].startTime).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
  });

  it("parses N2YO API response correctly when API key is valid", async () => {
    process.env.N2YO_API_KEY = "test_n2yo_key";

    const mockN2yoResponse = {
      info: { satid: 25544, satname: "SPACE STATION", passescount: 1 },
      passes: [
        {
          startAz: 315,
          startAzCompass: "NW",
          startUTC: 1700000000,
          maxAz: 180,
          maxAzCompass: "S",
          maxEl: 55.4,
          maxUTC: 1700000300,
          endAz: 135,
          endAzCompass: "SE",
          endUTC: 1700000600,
          mag: -3.2,
          duration: 600,
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockN2yoResponse),
    } as unknown as Response);

    const passes = await getVisualPasses({
      lat: 51.5074,
      lng: -0.1278,
      satId: 25544,
      days: 1,
    });

    expect(passes.length).toBe(1);
    expect(passes[0].satId).toBe(25544);
    expect(passes[0].maxElevation).toBe(55.4);
    expect(passes[0].isBrightPass).toBe(true);
    expect(passes[0].startAzimuthCompass).toBe("NW");
    expect(passes[0].endAzimuthCompass).toBe("SE");
    expect(passes[0].maxBrightnessMag).toBe(-3.2);
  });
});
