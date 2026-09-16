export interface FOVParams {
  telescopeFocalLengthMm: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
  eyepieceAfovDeg?: number;
  eyepieceFocalLengthMm?: number;
  pixelPitchUm?: number; // Optional sensor pixel pitch in micrometers
}

export interface FOVResult {
  fovWidthDeg: number;
  fovHeightDeg: number;
  fovWidthArcmin: number;
  fovHeightArcmin: number;
  isEyepieceMode: boolean;
  tfovDeg: number | null;
  magnification: number | null;
  sensorAspectRatio: string;
  imageScaleArcsecPerPixel: number | null;
  invalidInput: boolean;
}

export type FramingStatus = "Wide Field" | "Fully Framed" | "Target Exceeds Sensor Bounds";

export interface FramingCoverageResult {
  status: FramingStatus;
  fitPercentage: number;
  details: string;
}

function roundTo(val: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

function calculateAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return "N/A";
  const ratio = width / height;

  if (Math.abs(ratio - 3 / 2) < 0.05 || Math.abs(ratio - 2 / 3) < 0.05) return "3:2";
  if (Math.abs(ratio - 4 / 3) < 0.05 || Math.abs(ratio - 3 / 4) < 0.05) return "4:3";
  if (Math.abs(ratio - 16 / 9) < 0.05 || Math.abs(ratio - 9 / 16) < 0.05) return "16:9";
  if (Math.abs(ratio - 1) < 0.05) return "1:1";

  return `${roundTo(ratio, 2)}:1`;
}

/**
 * Calculates sensor and eyepiece field of view parameters based on optical geometries.
 */
export function calculateFOV({
  telescopeFocalLengthMm,
  sensorWidthMm,
  sensorHeightMm,
  eyepieceAfovDeg,
  eyepieceFocalLengthMm,
  pixelPitchUm,
}: FOVParams): FOVResult {
  const isTelescopeValid =
    Number.isFinite(telescopeFocalLengthMm) && telescopeFocalLengthMm > 0;
  const isSensorValid =
    Number.isFinite(sensorWidthMm) &&
    sensorWidthMm > 0 &&
    Number.isFinite(sensorHeightMm) &&
    sensorHeightMm > 0;

  if (!isTelescopeValid || !isSensorValid) {
    return {
      fovWidthDeg: 0,
      fovHeightDeg: 0,
      fovWidthArcmin: 0,
      fovHeightArcmin: 0,
      isEyepieceMode: false,
      tfovDeg: null,
      magnification: null,
      sensorAspectRatio: "N/A",
      imageScaleArcsecPerPixel: null,
      invalidInput: true,
    };
  }

  // Camera Sensor FOV Calculation: FOV = 57.3 * (sensorDimension / focalLength)
  const fovWidthDeg = roundTo((57.3 * sensorWidthMm) / telescopeFocalLengthMm, 4);
  const fovHeightDeg = roundTo((57.3 * sensorHeightMm) / telescopeFocalLengthMm, 4);
  const fovWidthArcmin = roundTo(fovWidthDeg * 60, 2);
  const fovHeightArcmin = roundTo(fovHeightDeg * 60, 2);

  const aspectRatio = calculateAspectRatio(sensorWidthMm, sensorHeightMm);

  // Optional pixel scale calculation: 206.265 * (pixelSizeUm / focalLengthMm)
  const imageScale =
    pixelPitchUm && Number.isFinite(pixelPitchUm) && pixelPitchUm > 0
      ? roundTo((206.265 * pixelPitchUm) / telescopeFocalLengthMm, 2)
      : null;

  // Eyepiece Visual FOV Calculation
  const isEyepieceValid =
    eyepieceAfovDeg !== undefined &&
    eyepieceFocalLengthMm !== undefined &&
    Number.isFinite(eyepieceAfovDeg) &&
    eyepieceAfovDeg > 0 &&
    Number.isFinite(eyepieceFocalLengthMm) &&
    eyepieceFocalLengthMm > 0;

  if (isEyepieceValid) {
    const magnification = roundTo(telescopeFocalLengthMm / eyepieceFocalLengthMm!, 1);
    const tfovDeg = roundTo(eyepieceAfovDeg! / magnification, 2);

    return {
      fovWidthDeg,
      fovHeightDeg,
      fovWidthArcmin,
      fovHeightArcmin,
      isEyepieceMode: true,
      tfovDeg,
      magnification,
      sensorAspectRatio: aspectRatio,
      imageScaleArcsecPerPixel: imageScale,
      invalidInput: false,
    };
  }

  return {
    fovWidthDeg,
    fovHeightDeg,
    fovWidthArcmin,
    fovHeightArcmin,
    isEyepieceMode: false,
    tfovDeg: null,
    magnification: null,
    sensorAspectRatio: aspectRatio,
    imageScaleArcsecPerPixel: imageScale,
    invalidInput: false,
  };
}

/**
 * Evaluates how cleanly a celestial target's angular size fits within the computed FOV.
 */
export function getFramingCoverage(
  fovWidthDeg: number,
  fovHeightDeg: number,
  targetAngularSizeArcmin: number,
): FramingCoverageResult {
  const fovWidthArcmin = fovWidthDeg * 60;
  const fovHeightArcmin = fovHeightDeg * 60;
  const minFovArcmin = Math.min(fovWidthArcmin, fovHeightArcmin);
  const maxFovArcmin = Math.max(fovWidthArcmin, fovHeightArcmin);

  if (minFovArcmin <= 0 || targetAngularSizeArcmin <= 0) {
    return {
      status: "Wide Field",
      fitPercentage: 0,
      details: "Invalid optical dimensions.",
    };
  }

  const coverageRatio = targetAngularSizeArcmin / minFovArcmin;
  const fitPercentage = Math.round(coverageRatio * 100);

  if (targetAngularSizeArcmin > maxFovArcmin) {
    return {
      status: "Target Exceeds Sensor Bounds",
      fitPercentage,
      details: `Target (${targetAngularSizeArcmin}') extends beyond the ${fovWidthArcmin.toFixed(1)}' × ${fovHeightArcmin.toFixed(1)}' sensor frame. Mosaic imaging required.`,
    };
  }

  if (coverageRatio < 0.35) {
    return {
      status: "Wide Field",
      fitPercentage,
      details: `Target occupies ~${fitPercentage}% of the sensor's short axis. Excellent wide-field context with surrounding starfield.`,
    };
  }

  return {
    status: "Fully Framed",
    fitPercentage,
    details: `Target is optimally framed and fills ~${fitPercentage}% of the sensor bounds.`,
  };
}
