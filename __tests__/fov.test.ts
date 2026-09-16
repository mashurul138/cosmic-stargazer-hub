import { describe, expect, it } from "vitest";
import { calculateFOV, getFramingCoverage } from "@/lib/utils/fov";

describe("calculateFOV", () => {
  it("computes accurate FOV angles for a 500mm telescope on a Full Frame sensor (36mm x 24mm)", () => {
    const result = calculateFOV({
      telescopeFocalLengthMm: 500,
      sensorWidthMm: 36,
      sensorHeightMm: 24,
    });

    expect(result.invalidInput).toBe(false);
    expect(result.fovWidthDeg).toBeCloseTo(4.1256, 4);
    expect(result.fovHeightDeg).toBeCloseTo(2.7504, 4);
    expect(result.fovWidthArcmin).toBeCloseTo(4.1256 * 60, 1);
    expect(result.fovHeightArcmin).toBeCloseTo(2.7504 * 60, 1);
    expect(result.sensorAspectRatio).toBe("3:2");
    expect(result.isEyepieceMode).toBe(false);
    expect(result.tfovDeg).toBeNull();
    expect(result.magnification).toBeNull();
  });

  it("computes accurate pixel scale when pixel pitch is provided", () => {
    const result = calculateFOV({
      telescopeFocalLengthMm: 1000,
      sensorWidthMm: 23.5,
      sensorHeightMm: 15.6,
      pixelPitchUm: 3.76,
    });

    // 206.265 * (3.76 / 1000) = 0.7755... -> 0.78 arcsec/px
    expect(result.imageScaleArcsecPerPixel).toBe(0.78);
  });

  it("handles eyepiece visual mode and computes correct magnification and TFOV", () => {
    const result = calculateFOV({
      telescopeFocalLengthMm: 1000,
      sensorWidthMm: 36,
      sensorHeightMm: 24,
      eyepieceFocalLengthMm: 25,
      eyepieceAfovDeg: 52,
    });

    expect(result.isEyepieceMode).toBe(true);
    // Magnification: 1000 / 25 = 40x
    expect(result.magnification).toBe(40);
    // TFOV: 52 / 40 = 1.3°
    expect(result.tfovDeg).toBe(1.3);
  });

  it("safely guards against non-positive, zero, or NaN optical inputs", () => {
    const zeroFocal = calculateFOV({
      telescopeFocalLengthMm: 0,
      sensorWidthMm: 36,
      sensorHeightMm: 24,
    });
    expect(zeroFocal.invalidInput).toBe(true);
    expect(zeroFocal.fovWidthDeg).toBe(0);

    const negativeSensor = calculateFOV({
      telescopeFocalLengthMm: 800,
      sensorWidthMm: -10,
      sensorHeightMm: 24,
    });
    expect(negativeSensor.invalidInput).toBe(true);

    const nanInput = calculateFOV({
      telescopeFocalLengthMm: NaN,
      sensorWidthMm: 36,
      sensorHeightMm: 24,
    });
    expect(nanInput.invalidInput).toBe(true);
  });
});

describe("getFramingCoverage", () => {
  it("identifies target that exceeds sensor bounds", () => {
    // 1° x 0.67° FOV -> 60' x 40'. Andromeda is ~190'.
    const result = getFramingCoverage(1.0, 0.67, 190);
    expect(result.status).toBe("Target Exceeds Sensor Bounds");
    expect(result.details).toContain("Mosaic imaging required");
  });

  it("identifies optimal framing when target fits comfortably within frame", () => {
    // 3° x 2° FOV -> 180' x 120'. Orion Nebula M42 is ~65'.
    const result = getFramingCoverage(3.0, 2.0, 65);
    expect(result.status).toBe("Fully Framed");
  });

  it("identifies wide field context when target is small relative to FOV", () => {
    // 6° x 4° FOV -> 360' x 240'. Full Moon is ~31' (occupies < 35% of min axis).
    const result = getFramingCoverage(6.0, 4.0, 31);
    expect(result.status).toBe("Wide Field");
  });
});
