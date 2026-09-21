import { logger } from "@/lib/utils/logger";

export interface DiscordDigestData {
  username?: string;
  stargazingScore: number;
  location: string;
  topTargets: string[];
  weatherSummary: string;
  upcomingPartiesCount: number;
}

export interface DiscordDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

const WEBHOOK_TIMEOUT_MS = 5_000;

function getScoreEmoji(score: number): string {
  if (score >= 80) return "🌌";
  if (score >= 60) return "🌙";
  if (score >= 40) return "⛅";
  return "☁️";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

export function buildDiscordPayload(data: DiscordDigestData) {
  const scoreRounded = Math.round(data.stargazingScore);
  const emoji = getScoreEmoji(scoreRounded);
  const label = getScoreLabel(scoreRounded);

  const targetsDisplay =
    data.topTargets.length > 0
      ? data.topTargets
          .slice(0, 3)
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")
      : "No priority targets tonight";

  const partiesDisplay =
    data.upcomingPartiesCount > 0
      ? `${data.upcomingPartiesCount} upcoming event${data.upcomingPartiesCount > 1 ? "s" : ""}`
      : "No upcoming events";

  return {
    username: data.username ?? "Cosmic Stargazer Hub",
    avatar_url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f30c.png",
    embeds: [
      {
        title: `${emoji} Night Sky Digest — ${label}`,
        description: `Your personalized stargazing report for **${data.location}**`,
        color: 0x0284c7, // dark sky theme
        fields: [
          {
            name: "🔭 Stargazing Score",
            value: `**${scoreRounded}/100** (${label})`,
            inline: true,
          },
          {
            name: "🌤️ Weather Conditions",
            value: data.weatherSummary || "No data available",
            inline: true,
          },
          {
            name: "\u200B", // zero-width space separator
            value: "\u200B",
            inline: true,
          },
          {
            name: "⭐ Top 3 Recommended Targets",
            value: targetsDisplay,
            inline: false,
          },
          {
            name: "🎉 Community Star Parties",
            value: partiesDisplay,
            inline: true,
          },
        ],
        footer: {
          text: "Cosmic Stargazer Hub • Automated Night Sky Digest",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export interface DiscordCustomEmbed {
  title: string;
  description: string;
  username?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export function isCustomEmbed(
  data: DiscordDigestData | DiscordCustomEmbed,
): data is DiscordCustomEmbed {
  return "title" in data && "description" in data && !("stargazingScore" in data);
}

export function buildDiscordTestPayload(data: DiscordCustomEmbed) {
  return {
    username: data.username ?? "Cosmic Stargazer Hub",
    avatar_url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f30c.png",
    embeds: [
      {
        title: data.title,
        description: data.description,
        color: data.color ?? 0x0284c7,
        fields: data.fields ?? [],
        footer: {
          text: "Cosmic Stargazer Hub • Webhook Integration Test",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function sendDiscordDigest(
  webhookUrl: string,
  data: DiscordDigestData | DiscordCustomEmbed,
): Promise<DiscordDeliveryResult> {
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return {
      success: false,
      error: "Invalid Discord webhook URL. Must start with https://discord.com/api/webhooks/",
    };
  }

  const payload = isCustomEmbed(data)
    ? buildDiscordTestPayload(data)
    : buildDiscordPayload(data);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      logger.warn("Discord webhook delivery failed.", {
        statusCode: response.status,
        errorText,
      });
      return {
        success: false,
        statusCode: response.status,
        error: `Discord API responded with status ${response.status}: ${errorText}`,
      };
    }

    if (isCustomEmbed(data)) {
      logger.info("Discord test notification delivered successfully.", {
        title: data.title,
      });
    } else {
      logger.info("Discord night sky digest delivered successfully.", {
        location: data.location,
        score: Math.round(data.stargazingScore),
      });
    }

    return { success: true, statusCode: response.status };
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "Discord webhook request timed out after 5000ms."
        : error instanceof Error
          ? error.message
          : String(error);

    logger.error("Discord digest delivery error.", { error: message });

    return { success: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}
