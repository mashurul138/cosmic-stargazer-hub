/**
 * Checks whether a star party has reached its maximum attendee capacity.
 */
export function isPartyFull(attendeeCount: number, maxCapacity: number): boolean {
  if (maxCapacity <= 0) return true;
  return attendeeCount >= maxCapacity;
}

export interface ToggleRsvpResult {
  attendees: string[];
  isAttending: boolean;
  error?: string;
}

/**
 * Pure transition logic for toggling user RSVP on a star party.
 * If user is already attending, removes them.
 * If user is not attending, checks capacity and adds them if space is available.
 */
export function toggleRsvpState(
  currentAttendees: string[],
  userId: string,
  maxCapacity: number,
): ToggleRsvpResult {
  const isCurrentlyAttending = currentAttendees.includes(userId);

  if (isCurrentlyAttending) {
    // Leave party
    const updated = currentAttendees.filter((id) => id !== userId);
    return {
      attendees: updated,
      isAttending: false,
    };
  }

  // Check capacity
  if (currentAttendees.length >= maxCapacity) {
    return {
      attendees: currentAttendees,
      isAttending: false,
      error: "This star party has reached maximum capacity.",
    };
  }

  // Join party
  return {
    attendees: [...currentAttendees, userId],
    isAttending: true,
  };
}

/**
 * Sorts star party records chronologically by event_date ascending.
 */
export function sortPartiesByDate<T extends { event_date: string }>(parties: T[]): T[] {
  return [...parties].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  );
}

/**
 * Validates if an event date is scheduled in the future relative to a reference date.
 */
export function isUpcomingEvent(dateStr: string, referenceDate: Date = new Date()): boolean {
  const eventTime = new Date(dateStr).getTime();
  if (isNaN(eventTime)) return false;
  return eventTime >= referenceDate.getTime();
}
