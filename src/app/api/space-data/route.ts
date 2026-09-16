import { NextResponse, type NextRequest } from "next/server";

import { getAstronomyPictureOfTheDay } from "@/lib/api/nasa";
import { getStargazingWeather } from "@/lib/api/weather";

const DEFAULT_LATITUDE = 51.4769;
const DEFAULT_LONGITUDE = -0.0005;

function parseCoordinate(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseCoordinate(searchParams.get("lat"), DEFAULT_LATITUDE);
    const lng = parseCoordinate(searchParams.get("lng"), DEFAULT_LONGITUDE);

    const [apod, weather] = await Promise.all([
      getAstronomyPictureOfTheDay(),
      getStargazingWeather(lat, lng),
    ]);

    return NextResponse.json({ apod, weather }, { status: 200 });
  } catch (error) {
    console.error("Unable to retrieve space dashboard data:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve astronomy and stargazing data at this time.",
      },
      { status: 500 },
    );
  }
}
