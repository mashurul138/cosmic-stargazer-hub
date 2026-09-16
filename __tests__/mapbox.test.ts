import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getBortleDetails, reverseGeocode } from "@/lib/api/mapbox";

describe("getBortleDetails", () => {
  it("returns valid Bortle rating bounded between 1 and 9 for normal coordinates", () => {
    const result = getBortleDetails(40.7128, -74.006); // NYC
    expect(result.bortleClass).toBeGreaterThanOrEqual(1);
    expect(result.bortleClass).toBeLessThanOrEqual(9);
    expect(Number.isInteger(result.bortleClass)).toBe(true);
  });

  it("contains all required typed properties with non-empty suitable targets", () => {
    const details = getBortleDetails(51.5074, -0.1278); // London
    expect(details).toHaveProperty("bortleClass");
    expect(details).toHaveProperty("title");
    expect(details).toHaveProperty("color");
    expect(details).toHaveProperty("nelm");
    expect(details).toHaveProperty("description");
    expect(details).toHaveProperty("suitableTargets");

    expect(typeof details.title).toBe("string");
    expect(typeof details.color).toBe("string");
    expect(details.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof details.nelm).toBe("number");
    expect(details.nelm).toBeGreaterThan(0);
    expect(typeof details.description).toBe("string");
    expect(Array.isArray(details.suitableTargets)).toBe(true);
    expect(details.suitableTargets.length).toBeGreaterThan(0);
  });

  it("handles boundary and extreme geographic coordinates safely", () => {
    const testCases = [
      { name: "Equator / Null Island", lat: 0, lon: 0 },
      { name: "North Pole", lat: 90, lon: 0 },
      { name: "South Pole", lat: -90, lon: 0 },
      { name: "Prime Meridian", lat: 51.4769, lon: 0 },
      { name: "Date Line East", lat: 0, lon: 180 },
      { name: "Date Line West", lat: 0, lon: -180 },
      { name: "Beyond North Latitude", lat: 120, lon: 45 },
      { name: "Beyond South Latitude", lat: -120, lon: -45 },
      { name: "Beyond East Longitude", lat: 30, lon: 250 },
      { name: "Beyond West Longitude", lat: 30, lon: -250 },
      { name: "NaN coordinates", lat: NaN, lon: NaN },
    ];

    for (const { lat, lon } of testCases) {
      const details = getBortleDetails(lat, lon);
      expect(details.bortleClass).toBeGreaterThanOrEqual(1);
      expect(details.bortleClass).toBeLessThanOrEqual(9);
      expect(details.suitableTargets.length).toBeGreaterThan(0);
    }
  });

  it("rates major metropolitan centers significantly brighter than remote polar/oceanic wilderness", () => {
    const tokyoCenter = getBortleDetails(35.6762, 139.6503);
    const nycCenter = getBortleDetails(40.7128, -74.006);
    const southPole = getBortleDetails(-89.9, 0);
    const midPacific = getBortleDetails(10.0, -145.0);

    // Urban centers should have high Bortle rating (Class 8-9)
    expect(tokyoCenter.bortleClass).toBeGreaterThanOrEqual(8);
    expect(nycCenter.bortleClass).toBeGreaterThanOrEqual(8);

    // Remote pristine regions should have low Bortle rating (Class 1-2)
    expect(southPole.bortleClass).toBeLessThanOrEqual(2);
    expect(midPacific.bortleClass).toBeLessThanOrEqual(2);

    // Urban sky magnitude is worse (lower NELM number) than pristine dark skies
    expect(tokyoCenter.nelm).toBeLessThan(southPole.nelm);
  });
});

describe("reverseGeocode", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns coordinate fallback when token is missing", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const result = await reverseGeocode(41.6624, -77.8231);
    expect(result).toBe("41.6624° N, 77.8231° W");
  });

  it("returns place name when Mapbox Geocoding succeeds", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test_token_12345";

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        features: [
          { place_name: "Cherry Springs State Park, Potter County, Pennsylvania, United States" },
        ],
      }),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as unknown as Response);

    const result = await reverseGeocode(41.6624, -77.8231);
    expect(result).toBe("Cherry Springs State Park, Potter County, Pennsylvania, United States");
  });

  it("falls back to formatted coordinates when network request fails or times out", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test_token_12345";

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network connection failed"));

    const result = await reverseGeocode(-33.8688, 151.2093);
    expect(result).toBe("33.8688° S, 151.2093° E");
  });
});
