import sharp from "sharp";
import Groq from "groq-sdk";

export interface ImageStats {
  width: number;
  height: number;
  format: string;
  channels: number;
  meanLuminance: number; // 0 - 255
  contrastStdev: number;  // Standard deviation across luminance/channels
  dynamicRange: number;   // Max - Min
  estimatedSnr: number;   // Estimated SNR (dB)
}

export interface DiagnosticReport {
  overallScore: number; // 0-100
  starFocusRating: "Sharp" | "Slight Defocus" | "Blurry";
  starTrailingDetected: boolean;
  skyGlowLevel: "Low" | "Moderate" | "High Light Pollution";
  noiseLevel: "Low" | "Moderate" | "Elevated Noise";
  detectedIssues: string[];
  suggestedFixes: string[]; // Specific parameter adjustments for ISO, Shutter, Focus
}

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const MODEL_FALLBACKS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
] as const;

/**
 * Validates uploaded photo file format and payload size.
 */
export function validateImageFile(
  fileSize: number,
  mimeType: string,
): { isValid: boolean; error?: string } {
  if (fileSize <= 0) {
    return { isValid: false, error: "Uploaded file is empty." };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 10MB limit (uploaded: ${(fileSize / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `Unsupported image format (${mimeType}). Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  return { isValid: true };
}

/**
 * Decodes image buffer using Sharp and computes optical luminance and contrast statistics.
 */
export async function extractSharpMetrics(buffer: Buffer): Promise<ImageStats> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to parse valid image dimensions.");
  }

  const stats = await image.stats();
  const channels = stats.channels;

  // Calculate weighted luminance (ITU-R BT.601) or channel average
  let meanLuminance = 0;
  let contrastStdev = 0;
  let minVal = 255;
  let maxVal = 0;

  if (channels.length >= 3) {
    meanLuminance =
      0.299 * channels[0].mean + 0.587 * channels[1].mean + 0.114 * channels[2].mean;
    contrastStdev = Math.sqrt(
      0.299 * channels[0].stdev ** 2 +
        0.587 * channels[1].stdev ** 2 +
        0.114 * channels[2].stdev ** 2,
    );
    minVal = Math.min(channels[0].min, channels[1].min, channels[2].min);
    maxVal = Math.max(channels[0].max, channels[1].max, channels[2].max);
  } else if (channels.length > 0) {
    meanLuminance = channels[0].mean;
    contrastStdev = channels[0].stdev;
    minVal = channels[0].min;
    maxVal = channels[0].max;
  }

  const dynamicRange = Math.max(0, maxVal - minVal);
  // Estimated SNR: 20 * log10(signal / noise) where contrast is signal and background mean is noise baseline
  const estimatedSnr = Number(
    (20 * Math.log10(Math.max(1, contrastStdev) / Math.max(1, meanLuminance * 0.15))).toFixed(1),
  );

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format ?? "unknown",
    channels: channels.length,
    meanLuminance: Number(meanLuminance.toFixed(1)),
    contrastStdev: Number(contrastStdev.toFixed(1)),
    dynamicRange,
    estimatedSnr,
  };
}

/**
 * Deterministic algorithmic diagnostics based on Sharp statistical metrics.
 * Used as a rock-solid fallback when Groq API is unconfigured or unavailable.
 */
export function generateAlgorithmicDiagnostics(
  stats: ImageStats,
  targetType: string,
): DiagnosticReport {
  const issues: string[] = [];
  const fixes: string[] = [];
  let score = 85;

  // 1. Sky Glow / Light Pollution Evaluation
  let skyGlow: "Low" | "Moderate" | "High Light Pollution" = "Low";
  if (stats.meanLuminance > 90) {
    skyGlow = "High Light Pollution";
    score -= 25;
    issues.push("Severe background sky glow is washing out faint astronomical details.");
    fixes.push("Use a narrowband (e.g. Dual-Band Ha/OIII) light pollution filter or travel to a darker Bortle site.");
  } else if (stats.meanLuminance > 50) {
    skyGlow = "Moderate";
    score -= 10;
    issues.push("Noticeable sky background glow detected.");
    fixes.push("Lower exposure time slightly or apply background gradient extraction in post-processing.");
  }

  // 2. Contrast & Focus Evaluation
  let focusRating: "Sharp" | "Slight Defocus" | "Blurry" = "Sharp";
  if (stats.contrastStdev < 12) {
    focusRating = "Blurry";
    score -= 30;
    issues.push("Very low micro-contrast indicates soft or missed star focus.");
    fixes.push("Use a Bahtinov focus mask on a bright first-magnitude star before imaging.");
  } else if (stats.contrastStdev < 22) {
    focusRating = "Slight Defocus";
    score -= 12;
    issues.push("Slightly bloated star profiles with reduced point-spread sharpness.");
    fixes.push("Refine telescope focus in 10x digital zoom mode or use an autofocus routine.");
  }

  // 3. Star Trailing / Tracking
  let starTrailing = false;
  if (stats.dynamicRange > 240 && stats.contrastStdev < 18) {
    starTrailing = true;
    score -= 15;
    issues.push("Elongated point sources detected, suggesting tracking drift or exceeding the NPN exposure rule.");
    fixes.push("Shorten individual sub-exposure length by 30-50% or verify equatorial mount polar alignment.");
  }

  // 4. Noise Level Evaluation
  let noiseLevel: "Low" | "Moderate" | "Elevated Noise" = "Low";
  if (stats.estimatedSnr < 12) {
    noiseLevel = "Elevated Noise";
    score -= 15;
    issues.push("Elevated background thermal noise and high-ISO sensor grain.");
    fixes.push("Lower ISO to sensor unity gain (ISO 800-1600) and stack more sub-exposures to boost SNR.");
  } else if (stats.estimatedSnr < 20) {
    noiseLevel = "Moderate";
    score -= 5;
    fixes.push("Capture dark calibration frames to subtract thermal fixed-pattern sensor noise.");
  }

  // Target-specific adjustments
  if (targetType.toLowerCase().includes("planetary") && stats.width > 2000) {
    fixes.push("Enable Region of Interest (ROI) cropping in capture software to achieve higher FPS for lucky imaging.");
  }

  if (fixes.length === 0) {
    fixes.push("Settings are well-optimized. Continue stacking multiple exposures to maximize deep-sky SNR.");
  }

  const boundedScore = Math.max(15, Math.min(100, score));

  return {
    overallScore: boundedScore,
    starFocusRating: focusRating,
    starTrailingDetected: starTrailing,
    skyGlowLevel: skyGlow,
    noiseLevel,
    detectedIssues: issues.length > 0 ? issues : ["No severe optical aberrations detected."],
    suggestedFixes: fixes,
  };
}

/**
 * AI Astrophotography Evaluation using Groq with automatic fallback.
 */
export async function evaluateWithGroq(
  stats: ImageStats,
  targetType: string = "Deep Sky Object",
): Promise<DiagnosticReport> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return generateAlgorithmicDiagnostics(stats, targetType);
  }

  const groq = new Groq({ apiKey });

  const prompt = `
You are an expert Astrophotography Quality Assessor and Optical Diagnostics Engineer.
Evaluate this astrophotograph based on its extracted sensor and optical metrics:

Target Type: ${targetType}
Resolution: ${stats.width}x${stats.height} (${stats.format})
Mean Luminance (0-255): ${stats.meanLuminance}
Contrast Standard Deviation: ${stats.contrastStdev}
Dynamic Range: ${stats.dynamicRange}
Estimated SNR: ${stats.estimatedSnr} dB

Provide a comprehensive, professional diagnostic assessment in valid JSON with EXACTLY this structure:
{
  "overallScore": number (0-100),
  "starFocusRating": "Sharp" | "Slight Defocus" | "Blurry",
  "starTrailingDetected": boolean,
  "skyGlowLevel": "Low" | "Moderate" | "High Light Pollution",
  "noiseLevel": "Low" | "Moderate" | "Elevated Noise",
  "detectedIssues": ["issue 1", "issue 2"],
  "suggestedFixes": ["camera setting parameter adjustment 1", "parameter adjustment 2"]
}

Output ONLY valid raw JSON without markdown or explanations.
`;

  for (const model of MODEL_FALLBACKS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert astrophotography optical engineer. Return only pure JSON conforming to the requested schema.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_completion_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) continue;

      // Clean markdown codeblocks if model wrapped output in ```json
      const cleanedJson = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleanedJson) as DiagnosticReport;

      if (
        typeof parsed.overallScore === "number" &&
        parsed.starFocusRating &&
        typeof parsed.starTrailingDetected === "boolean" &&
        parsed.skyGlowLevel &&
        parsed.noiseLevel &&
        Array.isArray(parsed.detectedIssues) &&
        Array.isArray(parsed.suggestedFixes)
      ) {
        return {
          overallScore: Math.max(0, Math.min(100, Math.round(parsed.overallScore))),
          starFocusRating: parsed.starFocusRating,
          starTrailingDetected: parsed.starTrailingDetected,
          skyGlowLevel: parsed.skyGlowLevel,
          noiseLevel: parsed.noiseLevel,
          detectedIssues: parsed.detectedIssues,
          suggestedFixes: parsed.suggestedFixes,
        };
      }
    } catch {
      // Try next model in fallback tier
      continue;
    }
  }

  // If all Groq models fail or timeout, seamlessly return the deterministic algorithmic diagnostics
  return generateAlgorithmicDiagnostics(stats, targetType);
}
