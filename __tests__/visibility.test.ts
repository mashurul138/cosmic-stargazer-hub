import { describe, expect, it } from "vitest";

import { calculateVisibilityScore } from "@/lib/utils/visibility-score";
import { observationSchema } from "@/lib/validations/observation";

const validObservation = {
  title: "Clear view of Jupiter",
  celestial_target: "Jupiter",
  location: "Greenwich Observatory",
  notes: "Excellent seeing with visible cloud bands.",
  rating: 5,
};

describe("calculateVisibilityScore", () => {
  it("returns an Excellent rating for clear, calm weather", () => {
    const result = calculateVisibilityScore({
      cloudCover: 5,
      humidity: 45,
      windSpeed: 8,
      visibility: 20000,
    });

    expect(result.level).toBe("Excellent");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("returns a Poor rating for heavy cloud cover and high winds", () => {
    const result = calculateVisibilityScore({
      cloudCover: 100,
      humidity: 90,
      windSpeed: 80,
      visibility: 1000,
    });

    expect(result.level).toBe("Poor");
    expect(result.score).toBeLessThan(40);
  });
});

describe("observationSchema", () => {
  it("accepts a valid observation payload", () => {
    expect(observationSchema.parse(validObservation)).toEqual(validObservation);
  });

  it.each([0, 6])("rejects an out-of-range rating of %i", (rating) => {
    expect(() => observationSchema.parse({ ...validObservation, rating })).toThrow(
      /Rating must be at least 1|Rating cannot be more than 5/,
    );
  });
});
