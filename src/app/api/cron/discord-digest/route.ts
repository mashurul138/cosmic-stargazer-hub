import { NextResponse } from "next/server";

import { logger } from "@/lib/utils/logger";
import { sendDiscordDigest } from "@/lib/services/discord";
import { getStargazingWeather } from "@/lib/api/weather";
import { calculateVisibilityScore } from "@/lib/utils/visibility-score";
import { getBortleDetails } from "@/lib/api/mapbox";

// This route is designed to be called by a cron service (e.g., Vercel Cron).
// It fetches all users with enabled Discord notifications, evaluates current
// sky conditions for a default location, and sends personalized digests.

const CRON_SECRET = process.env.CRON_SECRET;

// Default digest location (Greenwich Observatory) — in production this would
// come from each user's saved location preferences.
const DEFAULT_LAT = 51.4769;
const DEFAULT_LNG = -0.0005;
const DEFAULT_LOCATION = "Greenwich, London";

interface NotificationRow {
  user_id: string;
  discord_webhook: string | null;
  min_score_threshold: number;
  enabled: boolean;
  profiles: { email: string }[] | null;
}

export async function GET(request: Request) {
  // Security: Verify CRON_SECRET header to prevent unauthorized invocations
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized. Invalid or missing CRON_SECRET." },
        { status: 401 },
      );
    }
  }

  try {
    // 1. Fetch current weather and compute stargazing score
    const weather = await getStargazingWeather(DEFAULT_LAT, DEFAULT_LNG);
    const visibility = calculateVisibilityScore({
      cloudCover: weather.cloudCover,
      humidity: weather.relativeHumidity,
      windSpeed: weather.windSpeed,
      visibility: weather.visibility,
    });

    // 2. Get Bortle classification and recommended targets
    const bortle = getBortleDetails(DEFAULT_LAT, DEFAULT_LNG);
    const topTargets = bortle.suitableTargets.slice(0, 3);

    // 3. Compose weather summary string
    const weatherSummary = [
      `${weather.temperature.toFixed(1)}°C`,
      `${weather.cloudCover}% clouds`,
      `${weather.relativeHumidity}% humidity`,
      `${weather.windSpeed.toFixed(1)} km/h wind`,
    ].join(" • ");

    // 4. Fetch users with enabled Discord notifications
    //    We use the Supabase service role key for cron context (no user session).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.error(
        "Discord digest cron: Missing SUPABASE_URL or SERVICE_ROLE_KEY.",
      );
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 },
      );
    }

    // Dynamic import to avoid pulling Supabase client into the edge runtime unnecessarily
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscribers, error: fetchError } = await adminSupabase
      .from("notification_settings")
      .select("user_id, discord_webhook, min_score_threshold, enabled, profiles:profiles!user_id(email)")
      .eq("enabled", true)
      .not("discord_webhook", "is", null);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscribers || subscribers.length === 0) {
      logger.info("Discord digest cron: No eligible subscribers found.");
      return NextResponse.json({
        delivered: 0,
        skipped: 0,
        message: "No eligible subscribers.",
      });
    }

    // 5. Count upcoming star parties for the embed
    const { count: partiesCount } = await adminSupabase
      .from("star_parties")
      .select("id", { count: "exact", head: true })
      .gte("event_date", new Date().toISOString());

    // 6. Send digest to each qualifying subscriber
    let delivered = 0;
    let skipped = 0;

    for (const row of subscribers as NotificationRow[]) {
      // Skip if score is below user's threshold
      if (visibility.score < row.min_score_threshold) {
        skipped++;
        continue;
      }

      if (!row.discord_webhook) {
        skipped++;
        continue;
      }

      const profileEmail =
        Array.isArray(row.profiles) && row.profiles.length > 0
          ? row.profiles[0].email
          : undefined;

      const result = await sendDiscordDigest(row.discord_webhook, {
        username: profileEmail ?? "Cosmic Stargazer Hub",
        stargazingScore: visibility.score,
        location: DEFAULT_LOCATION,
        topTargets,
        weatherSummary,
        upcomingPartiesCount: partiesCount ?? 0,
      });

      if (result.success) {
        delivered++;
      } else {
        logger.warn("Discord digest failed for subscriber.", {
          userId: row.user_id,
          error: result.error,
        });
        skipped++;
      }
    }

    logger.info("Discord digest cron completed.", { delivered, skipped });

    return NextResponse.json({
      delivered,
      skipped,
      score: Math.round(visibility.score),
      level: visibility.level,
      message: `Digest cycle complete. ${delivered} delivered, ${skipped} skipped.`,
    });
  } catch (error) {
    logger.error("Discord digest cron failed.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Discord digest cron failed." },
      { status: 500 },
    );
  }
}
