export interface NASAApodResponse {
  copyright: string | null;
  date: string;
  explanation: string;
  hdurl: string | null;
  media_type: "image" | "video";
  title: string;
  url: string;
}

const NASA_APOD_FALLBACK: NASAApodResponse = {
  copyright: "NASA",
  date: "1970-01-01",
  explanation:
    "NASA Astronomy Picture of the Day is temporarily unavailable. Please refresh later to view today’s featured cosmic image.",
  hdurl: "https://apod.nasa.gov/apod/astropix.html",
  media_type: "image",
  title: "Astronomy Picture of the Day is temporarily unavailable",
  url: "https://apod.nasa.gov/apod/astropix.html",
};

const EXTERNAL_API_TIMEOUT_MS = 5_000;

type NASAApiResponse = {
  copyright?: unknown;
  date: string;
  explanation: string;
  hdurl?: unknown;
  media_type: "image" | "video";
  title: string;
  url: string;
};

function isApodResponse(value: unknown): value is NASAApiResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).date === "string" &&
    typeof (value as Record<string, unknown>).explanation === "string" &&
    typeof (value as Record<string, unknown>).title === "string" &&
    typeof (value as Record<string, unknown>).url === "string" &&
    ((value as Record<string, unknown>).media_type === "image" ||
      (value as Record<string, unknown>).media_type === "video")
  );
}

export async function getAstronomyPictureOfTheDay(): Promise<NASAApodResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY || "DEMO_KEY"}`,
      {
        cache: "force-cache",
        next: { revalidate: 86400 },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      console.warn(`NASA APOD request failed with status ${response.status}.`);
      return NASA_APOD_FALLBACK;
    }

    const data: unknown = await response.json();

    if (!isApodResponse(data)) {
      console.warn("NASA APOD returned an unexpected response format.");
      return NASA_APOD_FALLBACK;
    }

    return {
      copyright: typeof data.copyright === "string" ? data.copyright : null,
      date: data.date,
      explanation: data.explanation,
      hdurl: typeof data.hdurl === "string" ? data.hdurl : null,
      media_type: data.media_type,
      title: data.title,
      url: data.url,
    };
  } catch (error) {
    console.error(
      "Unable to retrieve NASA Astronomy Picture of the Day:",
      error,
    );
    return NASA_APOD_FALLBACK;
  } finally {
    clearTimeout(timeoutId);
  }
}
