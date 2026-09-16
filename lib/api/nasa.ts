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
  try {
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY || "DEMO_KEY"}`,
      {
        cache: "force-cache",
        next: { revalidate: 86400 },
      },
    );

    if (!response.ok) {
      throw new Error(
        `NASA APOD request failed with status ${response.status}.`,
      );
    }

    const data: unknown = await response.json();

    if (!isApodResponse(data)) {
      throw new Error("NASA APOD returned an unexpected response format.");
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
  }
}
