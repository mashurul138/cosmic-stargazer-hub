"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { generateICSFile, generateMarkdownCard } from "@/lib/utils/event-exporter";
import { supabase } from "@/lib/supabase";
import type { SavedEvent } from "@/types/database";

type CelestialEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  category: "Meteor shower" | "Lunar eclipse" | "Planetary alignment";
};

const upcomingEvents: CelestialEvent[] = [
  {
    id: "orionids-2026",
    title: "Orionid Meteor Shower Peak",
    description:
      "The Orionids are fast meteors produced by Halley’s Comet. Observe after midnight with an unobstructed view of the eastern sky.",
    date: "2026-10-21T02:00:00Z",
    location: "Eastern horizon",
    category: "Meteor shower",
  },
  {
    id: "leonids-2026",
    title: "Leonid Meteor Shower Peak",
    description:
      "Look toward Leo before dawn for swift Leonid meteors. A dark observing site will make faint trails easier to see.",
    date: "2026-11-17T03:00:00Z",
    location: "Eastern horizon",
    category: "Meteor shower",
  },
  {
    id: "geminids-2026",
    title: "Geminid Meteor Shower Peak",
    description:
      "One of the year’s most reliable meteor displays, with bright multicolored meteors radiating from Gemini throughout the night.",
    date: "2026-12-13T22:00:00Z",
    location: "High in the eastern sky",
    category: "Meteor shower",
  },
  {
    id: "lunar-eclipse-2027",
    title: "Lunar Eclipse Viewing Window",
    description:
      "Watch the full Moon cross Earth’s shadow during this lunar eclipse viewing window. Binoculars reveal subtle color changes on the lunar surface.",
    date: "2027-02-20T01:00:00Z",
    location: "Visible from the night-side of Earth",
    category: "Lunar eclipse",
  },
  {
    id: "planetary-alignment-2027",
    title: "Morning Planetary Alignment",
    description:
      "Several bright planets gather before sunrise. Use binoculars only after the Sun is fully below the horizon for safe observing.",
    date: "2027-03-08T05:00:00Z",
    location: "Eastern pre-dawn sky",
    category: "Planetary alignment",
  },
];

function formatEventDate(date: string): string {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function EventsSkeleton() {
  return (
    <div className="animate-pulse grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Loading events">
      <div className="space-y-4">
        <div className="h-36 rounded-2xl bg-slate-800" />
        <div className="h-52 rounded-2xl bg-slate-800" />
        <div className="h-52 rounded-2xl bg-slate-800" />
      </div>
      <div className="h-96 rounded-2xl bg-slate-800" />
    </div>
  );
}

export default function EventsPage() {
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const savedEventTitles = useMemo(
    () => new Set(savedEvents.map((event) => `${event.event_title}|${event.event_date}`)),
    [savedEvents],
  );

  const loadSavedEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please sign in to manage saved celestial events.");
      }

      const { data, error: eventsError } = await supabase
        .from("saved_events")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: true });

      if (eventsError) {
        throw eventsError;
      }

      setUserId(user.id);
      setSavedEvents((data ?? []) as SavedEvent[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load saved events. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSavedEvents();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSavedEvents]);

  async function saveEvent(event: CelestialEvent) {
    if (!userId) {
      setError("Please sign in to save an event.");
      return;
    }

    setIsSaving(event.id);
    setError(null);
    setMessage(null);

    try {
      const { data, error: saveError } = await supabase
        .from("saved_events")
        .insert({
          user_id: userId,
          event_title: event.title,
          event_date: event.date,
          notes: event.description,
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      setSavedEvents((current) => [...current, data as SavedEvent]);
      setMessage(`${event.title} has been saved to your event hub.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this event. Please try again.",
      );
    } finally {
      setIsSaving(null);
    }
  }

  function exportIcs(event: CelestialEvent) {
    try {
      const icsContent = generateICSFile(event);
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage(`${event.title} was exported as an iCalendar file.`);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Unable to export this event as an iCalendar file.",
      );
    }
  }

  async function exportMarkdown(event: CelestialEvent) {
    try {
      await navigator.clipboard.writeText(generateMarkdownCard(event));
      setMessage(`${event.title} was copied to your clipboard as Markdown.`);
    } catch {
      setError("Your browser could not copy the Markdown card. Please try again.");
    }
  }

  async function removeSavedEvent(event: SavedEvent) {
    setIsRemoving(event.id);
    setError(null);
    setMessage(null);

    try {
      const { error: removeError } = await supabase
        .from("saved_events")
        .delete()
        .eq("id", event.id);

      if (removeError) {
        throw removeError;
      }

      setSavedEvents((current) => current.filter((savedEvent) => savedEvent.id !== event.id));
      setMessage(`${event.event_title} was removed from your saved events.`);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove this saved event. Please try again.",
      );
    } finally {
      setIsRemoving(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
        {isLoading ? <EventsSkeleton /> : null}

        {!isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="space-y-5">
              <header className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 shadow-xl shadow-indigo-950/30 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Plan your next night out
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Upcoming Celestial Events
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Save notable sky events, add them to your calendar, or copy a concise card into your observing notes.
                </p>
              </header>

              {message ? (
                <div role="status" className="rounded-xl border border-emerald-400/35 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-100">
                  {message}
                </div>
              ) : null}
              {error ? (
                <div role="alert" className="rounded-xl border border-red-400/35 bg-red-950/35 px-4 py-3 text-sm text-red-100">
                  {error}
                  <button type="button" onClick={() => void loadSavedEvents()} className="ml-3 font-semibold underline underline-offset-2">
                    Retry
                  </button>
                </div>
              ) : null}

              <div className="space-y-4">
                {upcomingEvents.map((event) => {
                  const isSaved = savedEventTitles.has(`${event.title}|${event.date}`);

                  return (
                    <article key={event.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <span className="inline-flex rounded-full border border-sky-400/35 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
                            {event.category}
                          </span>
                          <h2 className="mt-3 text-xl font-bold text-white">{event.title}</h2>
                          <p className="mt-2 text-sm font-medium text-indigo-300">{formatEventDate(event.date)}</p>
                          {event.location ? <p className="mt-1 text-sm text-slate-400">Viewing direction: {event.location}</p> : null}
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-300">{event.description}</p>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void saveEvent(event)}
                          disabled={isSaving === event.id || isSaved}
                          className="rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaved ? "Saved" : isSaving === event.id ? "Saving…" : "Save Event"}
                        </button>
                        <button type="button" onClick={() => exportIcs(event)} className="rounded-lg border border-slate-600 px-3.5 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800">
                          Export iCal (.ics)
                        </button>
                        <button type="button" onClick={() => void exportMarkdown(event)} className="rounded-lg border border-slate-600 px-3.5 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-800">
                          Export Markdown
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl lg:sticky lg:top-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">Your event hub</p>
              <h2 className="mt-2 text-xl font-bold">Saved Events</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Events saved to your personal observing calendar.</p>

              {savedEvents.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-600 p-5 text-center text-sm text-slate-400">
                  Save an event to keep it close for your next observing session.
                </div>
              ) : (
                <ul className="mt-5 space-y-3">
                  {savedEvents.map((event) => (
                    <li key={event.id} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                      <p className="font-semibold text-slate-100">{event.event_title}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatEventDate(event.event_date)}</p>
                      <button
                        type="button"
                        onClick={() => void removeSavedEvent(event)}
                        disabled={isRemoving === event.id}
                        className="mt-3 text-xs font-semibold text-red-300 transition hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRemoving === event.id ? "Removing…" : "Remove"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        ) : null}
      </motion.div>
  );
}
