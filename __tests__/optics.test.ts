import { describe, expect, it } from "vitest";

import { calculateOptics } from "@/lib/utils/optics";

describe("calculateOptics", () => {
  const result = calculateOptics({
    apertureMm: 200,
    telescopeFocalLengthMm: 1000,
    eyepieceFocalLengthMm: 10,
  });

  it("calculates focal ratio", () => {
    expect(result.focalRatio).toBe(5);
  });

  it("calculates magnification when an eyepiece is provided", () => {
    expect(result.magnification).toBe(100);
  });

  it("calculates the Rayleigh resolving limit", () => {
    expect(result.resolvingLimitArcsec).toBe(0.58);
  });

  it("calculates maximum useful magnification", () => {
    expect(result.maxUsefulMagnification).toBe(400);
  });

  it.each([
    { apertureMm: 0, telescopeFocalLengthMm: 1000, eyepieceFocalLengthMm: 10 },
    { apertureMm: -200, telescopeFocalLengthMm: 1000, eyepieceFocalLengthMm: 10 },
    { apertureMm: 200, telescopeFocalLengthMm: 0, eyepieceFocalLengthMm: 10 },
    { apertureMm: 200, telescopeFocalLengthMm: 1000, eyepieceFocalLengthMm: -10 },
    { apertureMm: Number.NaN, telescopeFocalLengthMm: 1000, eyepieceFocalLengthMm: 10 },
  ])("returns a safe invalid result for invalid input: %o", (params) => {
    expect(calculateOptics(params)).toEqual({
      focalRatio: 0,
      resolvingLimitArcsec: 0,
      lightGatheringPower: 0,
      magnification: 0,
      maxUsefulMagnification: 0,
      suitableTargets: [],
      invalidInput: true,
    });
  });
});
