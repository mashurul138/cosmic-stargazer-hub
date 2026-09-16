export interface StargazingWeather {
  latitude: number;
  longitude: number;
  temperature: number;
  cloudCover: number;
  relativeHumidity: number;
  windSpeed: number;
  visibility: number;
}

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    visibility?: number;
  };
};

function getFallbackWeather(
  latitude: number,
  longitude: number,
): StargazingWeather {
  return {
    latitude,
    longitude,
    temperature: 0,
    cloudCover: 0,
    relativeHumidity: 0,
    windSpeed: 0,
    visibility: 0,
  };
}

function numberOrDefault(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function getStargazingWeather(
  lat = 51.4769,
  lng = -0.0005,
): Promise<StargazingWeather> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,visibility`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(
        `Open-Meteo request failed with status ${response.status}.`,
      );
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const current = data.current;

    if (!current) {
      throw new Error("Open-Meteo returned no current weather data.");
    }

    return {
      latitude: numberOrDefault(data.latitude, lat),
      longitude: numberOrDefault(data.longitude, lng),
      temperature: numberOrDefault(current.temperature_2m),
      cloudCover: numberOrDefault(current.cloud_cover),
      relativeHumidity: numberOrDefault(current.relative_humidity_2m),
      windSpeed: numberOrDefault(current.wind_speed_10m),
      visibility: numberOrDefault(current.visibility),
    };
  } catch (error) {
    console.error("Unable to retrieve Open-Meteo stargazing weather:", error);
    return getFallbackWeather(lat, lng);
  }
}
