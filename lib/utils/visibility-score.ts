export type VisibilityLevel = "Excellent" | "Good" | "Fair" | "Poor";

export type VisibilityScoreParams = {
  cloudCover: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
};

export type VisibilityScore = {
  score: number;
  level: VisibilityLevel;
  recommendation: string;
};

function getRecommendation(level: VisibilityLevel): string {
  switch (level) {
    case "Excellent":
      return "Excellent conditions for deep-sky observing. Set up your telescope and prioritize faint targets.";
    case "Good":
      return "Good conditions for observing. Plan a focused session and keep an eye on passing clouds.";
    case "Fair":
      return "Fair conditions. Bright planets, the Moon, and easy star-hopping targets are your best choices.";
    case "Poor":
      return "Poor stargazing conditions. Consider planning your next session or using the time to review observation logs.";
  }
}

export function calculateVisibilityScore({
  cloudCover,
  humidity,
  windSpeed,
  visibility,
}: VisibilityScoreParams): VisibilityScore {
  let score = 100;

  score -= cloudCover * 0.6;
  score -= humidity > 60 ? (humidity - 60) * 0.3 : 0;
  score -= windSpeed > 20 ? (windSpeed - 20) * 0.5 : 0;
  score -= visibility < 10000 ? (10000 - visibility) / 250 : 0;

  score = Math.min(100, Math.max(0, score));

  const level: VisibilityLevel =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Good"
        : score >= 40
          ? "Fair"
          : "Poor";

  return {
    score,
    level,
    recommendation: getRecommendation(level),
  };
}
