type ExportableEvent = {
  title: string;
  description: string;
  date: string;
  location?: string;
};

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateICSFile(event: ExportableEvent): string {
  const startDate = new Date(event.date);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Event date must be a valid ISO-compatible date string.");
  }

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const uid = `${startDate.getTime()}-${event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}@cosmic-stargazer-hub`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cosmic Event & Stargazer Hub//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function generateMarkdownCard(
  event: Pick<ExportableEvent, "title" | "description" | "date">,
): string {
  const eventDate = new Date(event.date);
  const displayDate = Number.isNaN(eventDate.getTime())
    ? event.date
    : eventDate.toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      });

  return `## ${event.title}\n\n**Date:** ${displayDate}\n\n${event.description}\n\n---\nSaved from Cosmic Event & Stargazer Hub`;
}
