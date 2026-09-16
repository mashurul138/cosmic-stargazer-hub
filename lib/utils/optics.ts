export type OpticsParams = {
  apertureMm: number;
  telescopeFocalLengthMm: number;
  eyepieceFocalLengthMm?: number;
};

export type OpticsResult = {
  focalRatio: number;
  resolvingLimitArcsec: number;
  lightGatheringPower: number;
  magnification: number | null;
  maxUsefulMagnification: number;
  suitableTargets: string[];
  invalidInput: boolean;
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isPositiveFinite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

function invalidOpticsResult(): OpticsResult {
  return {
    focalRatio: 0,
    resolvingLimitArcsec: 0,
    lightGatheringPower: 0,
    magnification: 0,
    maxUsefulMagnification: 0,
    suitableTargets: [],
    invalidInput: true,
  };
}

function getSuitableTargets(apertureMm: number, magnification: number | null): string[] {
  const targets = ["The Moon", "open star clusters", "bright double stars"];

  if (apertureMm >= 50) {
    targets.push("Jupiter and Saturn");
  }

  if (apertureMm >= 80) {
    targets.push("bright nebulae and globular clusters");
  }

  if (apertureMm >= 120) {
    targets.push("galaxies and faint deep-sky objects");
  }

  if (magnification !== null && magnification < 40) {
    targets.push("wide-field Milky Way sweeps");
  }

  return targets;
}

export function calculateOptics({
  apertureMm,
  telescopeFocalLengthMm,
  eyepieceFocalLengthMm,
}: OpticsParams): OpticsResult {
  if (
    !isPositiveFinite(apertureMm) ||
    !isPositiveFinite(telescopeFocalLengthMm) ||
    (eyepieceFocalLengthMm !== undefined && !isPositiveFinite(eyepieceFocalLengthMm))
  ) {
    return invalidOpticsResult();
  }

  const magnification =
    eyepieceFocalLengthMm === undefined
      ? null
      : round(telescopeFocalLengthMm / eyepieceFocalLengthMm);

  return {
    focalRatio: round(telescopeFocalLengthMm / apertureMm),
    resolvingLimitArcsec: round(116 / apertureMm),
    lightGatheringPower: round((apertureMm / 7) ** 2),
    magnification,
    maxUsefulMagnification: round(2 * apertureMm),
    suitableTargets: getSuitableTargets(apertureMm, magnification),
    invalidInput: false,
  };
}
