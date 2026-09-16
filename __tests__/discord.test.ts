import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildDiscordPayload,
  sendDiscordDigest,
  type DiscordDigestData,
} from "@/lib/services/discord";

// ─────────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function createDigestData(overrides?: Partial<DiscordDigestData>): DiscordDigestData {
  return {
    username: "TestUser",
    stargazingScore: 85,
    location: "Greenwich, London",
    topTargets: ["Orion Nebula (M42)", "Andromeda Galaxy (M31)", "Pleiades (M45)"],
    weatherSummary: "12.5°C • 25% clouds • 55% humidity • 8.3 km/h wind",
    upcomingPartiesCount: 3,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload Construction Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Discord Digest Payload Construction", () => {
  it("builds a correctly structured Discord embed payload", () => {
    const data = createDigestData();
    const payload = buildDiscordPayload(data);

    expect(payload.username).toBe("TestUser");
    expect(payload.embeds).toHaveLength(1);

    const embed = payload.embeds[0];
    expect(embed.title).toContain("Night Sky Digest");
    expect(embed.title).toContain("Excellent");
    expect(embed.title).toContain("🌌");
    expect(embed.description).toContain("Greenwich, London");
    expect(embed.color).toBe(0x0284c7);
    expect(embed.fields.length).toBeGreaterThanOrEqual(4);
    expect(embed.footer.text).toContain("Cosmic Stargazer Hub");
    expect(embed.timestamp).toBeDefined();
  });

  it("displays score field with rounded value and correct label", () => {
    const payload = buildDiscordPayload(createDigestData({ stargazingScore: 72.8 }));
    const scoreField = payload.embeds[0].fields.find(
      (f) => f.name === "🔭 Stargazing Score",
    );

    expect(scoreField).toBeDefined();
    expect(scoreField!.value).toContain("73/100");
    expect(scoreField!.value).toContain("Good");
  });

  it("uses appropriate emoji for each score tier", () => {
    const excellent = buildDiscordPayload(createDigestData({ stargazingScore: 90 }));
    expect(excellent.embeds[0].title).toContain("🌌");

    const good = buildDiscordPayload(createDigestData({ stargazingScore: 65 }));
    expect(good.embeds[0].title).toContain("🌙");

    const fair = buildDiscordPayload(createDigestData({ stargazingScore: 45 }));
    expect(fair.embeds[0].title).toContain("⛅");

    const poor = buildDiscordPayload(createDigestData({ stargazingScore: 20 }));
    expect(poor.embeds[0].title).toContain("☁️");
  });

  it("formats top targets as numbered list limited to 3", () => {
    const data = createDigestData({
      topTargets: ["Target A", "Target B", "Target C", "Target D"],
    });
    const payload = buildDiscordPayload(data);
    const targetsField = payload.embeds[0].fields.find(
      (f) => f.name === "⭐ Top 3 Recommended Targets",
    );

    expect(targetsField).toBeDefined();
    expect(targetsField!.value).toContain("1. Target A");
    expect(targetsField!.value).toContain("2. Target B");
    expect(targetsField!.value).toContain("3. Target C");
    expect(targetsField!.value).not.toContain("Target D");
  });

  it("handles empty targets gracefully", () => {
    const payload = buildDiscordPayload(createDigestData({ topTargets: [] }));
    const targetsField = payload.embeds[0].fields.find(
      (f) => f.name === "⭐ Top 3 Recommended Targets",
    );
    expect(targetsField!.value).toBe("No priority targets tonight");
  });

  it("handles upcoming parties count of zero", () => {
    const payload = buildDiscordPayload(createDigestData({ upcomingPartiesCount: 0 }));
    const partiesField = payload.embeds[0].fields.find(
      (f) => f.name === "🎉 Community Star Parties",
    );
    expect(partiesField!.value).toBe("No upcoming events");
  });

  it("pluralizes star parties count correctly", () => {
    const one = buildDiscordPayload(createDigestData({ upcomingPartiesCount: 1 }));
    const partiesField1 = one.embeds[0].fields.find(
      (f) => f.name === "🎉 Community Star Parties",
    );
    expect(partiesField1!.value).toBe("1 upcoming event");

    const many = buildDiscordPayload(createDigestData({ upcomingPartiesCount: 5 }));
    const partiesField5 = many.embeds[0].fields.find(
      (f) => f.name === "🎉 Community Star Parties",
    );
    expect(partiesField5!.value).toBe("5 upcoming events");
  });

  it("uses default username when none is provided", () => {
    const payload = buildDiscordPayload(createDigestData({ username: undefined }));
    expect(payload.username).toBe("Cosmic Stargazer Hub");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Delivery Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Discord Webhook Delivery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid webhook URLs", async () => {
    const result = await sendDiscordDigest(
      "https://example.com/not-discord",
      createDigestData(),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid Discord webhook URL");
  });

  it("rejects empty webhook URL", async () => {
    const result = await sendDiscordDigest("", createDigestData());

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid Discord webhook URL");
  });

  it("reports success when Discord responds with 204", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    const result = await sendDiscordDigest(
      "https://discord.com/api/webhooks/123456/abcdef",
      createDigestData(),
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(204);

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    expect(fetchCall[0]).toBe("https://discord.com/api/webhooks/123456/abcdef");
    expect(fetchCall[1]!.method).toBe("POST");

    const sentBody = JSON.parse(fetchCall[1]!.body as string);
    expect(sentBody.embeds).toHaveLength(1);
    expect(sentBody.embeds[0].color).toBe(0x0284c7);
  });

  it("reports failure when Discord responds with 429 rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Rate limited" }), {
          status: 429,
        }),
      ),
    );

    const result = await sendDiscordDigest(
      "https://discord.com/api/webhooks/123456/abcdef",
      createDigestData(),
    );

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(429);
    expect(result.error).toContain("429");
  });

  it("handles network errors gracefully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network request failed")),
    );

    const result = await sendDiscordDigest(
      "https://discord.com/api/webhooks/123456/abcdef",
      createDigestData(),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network request failed");
  });

  it("handles AbortController timeout errors", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const result = await sendDiscordDigest(
      "https://discord.com/api/webhooks/123456/abcdef",
      createDigestData(),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("timed out");
  });
});
