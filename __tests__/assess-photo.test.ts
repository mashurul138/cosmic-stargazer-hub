import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  extractSharpMetrics,
  generateAlgorithmicDiagnostics,
  validateImageFile,
  MAX_FILE_SIZE_BYTES,
  type ImageStats,
} from "@/lib/utils/assess-photo";

describe("Image Validation Logic", () => {
  it("approves valid JPEG, PNG, and WebP images within 10MB limit", () => {
    expect(validateImageFile(1024 * 500, "image/jpeg").isValid).toBe(true);
    expect(validateImageFile(1024 * 1024 * 2, "image/png").isValid).toBe(true);
    expect(validateImageFile(1024 * 800, "image/webp").isValid).toBe(true);
  });

  it("rejects empty or zero-byte files", () => {
    const result = validateImageFile(0, "image/png");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects files exceeding 10MB limit", () => {
    const oversized = MAX_FILE_SIZE_BYTES + 1024;
    const result = validateImageFile(oversized, "image/jpeg");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("exceeds the 10MB limit");
  });

  it("rejects unsupported MIME types (e.g. PDF, GIF, TIFF, SVG)", () => {
    expect(validateImageFile(1024, "application/pdf").isValid).toBe(false);
    expect(validateImageFile(1024, "image/gif").isValid).toBe(false);
    expect(validateImageFile(1024, "image/svg+xml").isValid).toBe(false);
  });
});

describe("Sharp Metrics Extraction", () => {
  it("extracts accurate dimensions, luminance, and contrast from an in-memory image buffer", async () => {
    // Generate a 120x80 test image with known dark sky colors
    const buffer = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 15, g: 20, b: 35 },
      },
    })
      .png()
      .toBuffer();

    const stats = await extractSharpMetrics(buffer);

    expect(stats.width).toBe(120);
    expect(stats.height).toBe(80);
    expect(stats.format).toBe("png");
    expect(stats.channels).toBe(3);
    expect(stats.meanLuminance).toBeGreaterThan(10);
    expect(stats.meanLuminance).toBeLessThan(30);
    expect(typeof stats.estimatedSnr).toBe("number");
  });
});

describe("Diagnostic Report Schema & Logic", () => {
  const sampleStats: ImageStats = {
    width: 3840,
    height: 2160,
    format: "jpeg",
    channels: 3,
    meanLuminance: 35.5,
    contrastStdev: 28.4,
    dynamicRange: 210,
    estimatedSnr: 22.5,
  };

  it("produces a schema-compliant diagnostic report", () => {
    const report = generateAlgorithmicDiagnostics(sampleStats, "Deep Sky / Nebula");

    expect(typeof report.overallScore).toBe("number");
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);

    expect(["Sharp", "Slight Defocus", "Blurry"]).toContain(report.starFocusRating);
    expect(typeof report.starTrailingDetected).toBe("boolean");
    expect(["Low", "Moderate", "High Light Pollution"]).toContain(report.skyGlowLevel);
    expect(["Low", "Moderate", "Elevated Noise"]).toContain(report.noiseLevel);

    expect(Array.isArray(report.detectedIssues)).toBe(true);
    expect(report.detectedIssues.length).toBeGreaterThan(0);

    expect(Array.isArray(report.suggestedFixes)).toBe(true);
    expect(report.suggestedFixes.length).toBeGreaterThan(0);
  });

  it("penalizes high light pollution sky glow appropriately", () => {
    const brightStats: ImageStats = {
      ...sampleStats,
      meanLuminance: 125, // Excessive light pollution washed out
    };

    const report = generateAlgorithmicDiagnostics(brightStats, "Deep Sky / Nebula");

    expect(report.skyGlowLevel).toBe("High Light Pollution");
    expect(report.overallScore).toBeLessThan(80);
    expect(report.detectedIssues.some((issue) => issue.toLowerCase().includes("sky glow"))).toBe(
      true,
    );
  });

  it("penalizes blurry star focus when contrast standard deviation is very low", () => {
    const blurryStats: ImageStats = {
      ...sampleStats,
      contrastStdev: 8.0, // Very soft / out of focus
    };

    const report = generateAlgorithmicDiagnostics(blurryStats, "Milky Way Widefield");

    expect(report.starFocusRating).toBe("Blurry");
    expect(report.overallScore).toBeLessThan(70);
    expect(report.suggestedFixes.some((fix) => fix.toLowerCase().includes("focus"))).toBe(true);
  });
});
