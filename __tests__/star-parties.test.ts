import { describe, expect, it } from "vitest";
import {
  isPartyFull,
  isUpcomingEvent,
  sortPartiesByDate,
  toggleRsvpState,
} from "@/lib/utils/star-parties";
import { starPartySchema } from "@/lib/validations/star-party";

describe("Star Party RSVP & Capacity Logic", () => {
  it("correctly identifies when a party is full or has open seats", () => {
    expect(isPartyFull(19, 20)).toBe(false);
    expect(isPartyFull(20, 20)).toBe(true);
    expect(isPartyFull(25, 20)).toBe(true);
    expect(isPartyFull(0, 5)).toBe(false);
  });

  it("adds user to attendees when RSVPing to an open star party", () => {
    const currentAttendees = ["user-1", "user-2"];
    const result = toggleRsvpState(currentAttendees, "user-3", 10);

    expect(result.error).toBeUndefined();
    expect(result.isAttending).toBe(true);
    expect(result.attendees).toEqual(["user-1", "user-2", "user-3"]);
  });

  it("removes user from attendees when cancelling RSVP", () => {
    const currentAttendees = ["user-1", "user-2", "user-3"];
    const result = toggleRsvpState(currentAttendees, "user-2", 10);

    expect(result.error).toBeUndefined();
    expect(result.isAttending).toBe(false);
    expect(result.attendees).toEqual(["user-1", "user-3"]);
  });

  it("rejects RSVP when party capacity limit has been reached", () => {
    const currentAttendees = ["user-1", "user-2", "user-3"];
    const result = toggleRsvpState(currentAttendees, "user-4", 3);

    expect(result.error).toBe("This star party has reached maximum capacity.");
    expect(result.isAttending).toBe(false);
    expect(result.attendees).toEqual(["user-1", "user-2", "user-3"]);
  });

  it("still allows a user to cancel RSVP even if the party is full", () => {
    const currentAttendees = ["user-1", "user-2", "user-3"];
    const result = toggleRsvpState(currentAttendees, "user-3", 3);

    expect(result.error).toBeUndefined();
    expect(result.isAttending).toBe(false);
    expect(result.attendees).toEqual(["user-1", "user-2"]);
  });
});

describe("Star Party Date Utilities", () => {
  it("sorts parties chronologically by event_date ascending", () => {
    const parties = [
      { id: "3", event_date: "2026-12-01T20:00:00Z" },
      { id: "1", event_date: "2026-10-15T18:30:00Z" },
      { id: "2", event_date: "2026-11-05T19:00:00Z" },
    ];

    const sorted = sortPartiesByDate(parties);
    expect(sorted.map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("accurately classifies upcoming and past events", () => {
    const reference = new Date("2026-10-01T12:00:00Z");

    expect(isUpcomingEvent("2026-10-05T19:00:00Z", reference)).toBe(true);
    expect(isUpcomingEvent("2026-09-20T19:00:00Z", reference)).toBe(false);
    expect(isUpcomingEvent("invalid-date", reference)).toBe(false);
  });
});

describe("Star Party Zod Schema Validation", () => {
  it("validates a complete, correct star party input", () => {
    const validData = {
      title: "Autumn Perseid Star Party",
      description: "Bring your telescopes to Cherry Springs for deep-sky observation.",
      location_name: "Cherry Springs State Park",
      latitude: 41.6624,
      longitude: -77.8231,
      event_date: "2026-10-12T20:00:00Z",
      max_attendees: 30,
    };

    const parsed = starPartySchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("fails on invalid coordinates or empty titles", () => {
    const invalidData = {
      title: "No", // too short
      description: "Tiny", // too short
      location_name: "",
      latitude: 100, // out of range
      longitude: -200, // out of range
      event_date: "not-a-date",
      max_attendees: -5,
    };

    const parsed = starPartySchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
