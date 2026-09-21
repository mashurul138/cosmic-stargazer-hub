"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  Crosshair,
  MapPin,
  Plus,
  Radio,
  Search,
  Sparkles,
  Telescope,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { motion } from "framer-motion";
import type { StarPartyWithDetails } from "@/types/database";
import { useAuth } from "@/src/context/AuthContext";

function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StarPartiesPage() {
  const { requireAuth } = useAuth();
  const [parties, setParties] = useState<StarPartyWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filter & Search
  const [filterView, setFilterView] = useState<"all" | "attending">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("41.6624");
  const [longitude, setLongitude] = useState<string>("-77.8231");
  const [eventDate, setEventDate] = useState<string>("");
  const [maxAttendees, setMaxAttendees] = useState<number>(20);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // RSVP Loading tracker per party ID
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);

  // Load Star Parties
  async function loadParties() {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await fetch("/api/star-parties");
      if (!response.ok) {
        throw new Error(`Unable to load star parties (${response.status})`);
      }

      const data = (await response.json()) as { starParties?: StarPartyWithDetails[] };
      setParties(data.starParties || []);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Unable to retrieve star parties.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadParties();
  }, []);

  // Handle GPS detection for modal
  function handleDetectGps() {
    if (!("geolocation" in navigator)) {
      setModalError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setModalError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLatitude(pos.coords.latitude.toFixed(4));
        setLongitude(pos.coords.longitude.toFixed(4));
      },
      () => {
        setIsLocating(false);
        setModalError("Could not retrieve GPS coordinates. Please enter manually.");
      },
      { timeout: 8000 },
    );
  }

  // Handle Star Party Submission
  async function handleCreateParty(e: React.FormEvent) {
    e.preventDefault();
    setModalError(null);

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (!title.trim() || title.length < 3) {
      setModalError("Title must be at least 3 characters.");
      return;
    }
    if (!description.trim() || description.length < 5) {
      setModalError("Description must be at least 5 characters.");
      return;
    }
    if (!locationName.trim()) {
      setModalError("Location name is required.");
      return;
    }
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setModalError("Please enter valid latitude and longitude coordinates.");
      return;
    }
    if (!eventDate) {
      setModalError("Please specify a valid event date and time.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        location_name: locationName.trim(),
        latitude: parsedLat,
        longitude: parsedLng,
        event_date: new Date(eventDate).toISOString(),
        max_attendees: Number(maxAttendees),
      };

      const res = await fetch("/api/star-parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = (await res.json().catch(() => null)) as {
        starParty?: StarPartyWithDetails;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(resData?.error ?? "Unable to create star party.");
      }

      setIsModalOpen(false);
      // Reset form
      setTitle("");
      setDescription("");
      setLocationName("");
      setEventDate("");
      setMaxAttendees(20);

      // Refresh list
      void loadParties();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error creating star party.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle RSVP Toggle
  async function handleToggleRsvp(partyId: string) {
    setRsvpLoadingId(partyId);

    // Optimistic update
    const previousParties = [...parties];
    setParties((current) =>
      current.map((p) => {
        if (p.id !== partyId) return p;
        const willAttend = !p.is_attending;
        return {
          ...p,
          is_attending: willAttend,
          attendee_count: willAttend ? p.attendee_count + 1 : Math.max(0, p.attendee_count - 1),
        };
      }),
    );

    try {
      const res = await fetch(`/api/star-parties/${partyId}/rsvp`, {
        method: "POST",
      });

      const data = (await res.json().catch(() => null)) as {
        is_attending?: boolean;
        attendee_count?: number;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Could not update RSVP status.");
      }

      // Sync confirmed state
      setParties((current) =>
        current.map((p) => {
          if (p.id !== partyId) return p;
          return {
            ...p,
            is_attending: data?.is_attending ?? p.is_attending,
            attendee_count: data?.attendee_count ?? p.attendee_count,
          };
        }),
      );
    } catch (err) {
      // Rollback on error
      setParties(previousParties);
      alert(err instanceof Error ? err.message : "Failed to update RSVP.");
    } finally {
      setRsvpLoadingId(null);
    }
  }

  // Filtered Star Parties
  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (filterView === "attending" && !p.is_attending) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesLoc = p.location_name.toLowerCase().includes(query);
        const matchesDesc = p.description.toLowerCase().includes(query);
        return matchesTitle || matchesLoc || matchesDesc;
      }
      return true;
    });
  }, [parties, filterView, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
        {/* Page Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                <Users className="h-3.5 w-3.5" />
                Feature 4: Community Stargazing
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                <Telescope className="h-3 w-3 text-indigo-400" />
                Star Parties & RSVP Engine
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Community Star Parties & Gatherings
            </h1>
            <p className="text-sm text-slate-400">
              Join fellow astronomers and stargazers under dark skies. Host your own star party or RSVP
              to upcoming community observing sessions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => requireAuth(() => setIsModalOpen(true), "Sign in to host a community star party")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-950/40 transition hover:from-sky-400 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <Plus className="h-4 w-4" />
            Host a Star Party
          </button>
        </header>

        {/* Filter and Search Bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <button
              type="button"
              onClick={() => setFilterView("all")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filterView === "all"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-950/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Upcoming ({parties.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterView("attending")}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filterView === "attending"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-950/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              My RSVPs ({parties.filter((p) => p.is_attending).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or location…"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-4 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="h-8 w-8 animate-spin text-sky-400" />
            <p className="mt-3 text-sm font-semibold text-slate-300">
              Loading community star parties…
            </p>
          </div>
        ) : pageError ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/40 bg-rose-950/40 p-6 text-center text-sm text-rose-200"
          >
            {pageError}
            <button
              type="button"
              onClick={() => void loadParties()}
              className="mt-3 block mx-auto rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200"
            >
              Retry
            </button>
          </div>
        ) : filteredParties.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 py-16 text-center">
            <Telescope className="h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-bold text-slate-300">
              {filterView === "attending"
                ? "You haven't RSVP'd to any star parties yet"
                : "No star parties match your search"}
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md">
              {filterView === "attending"
                ? "Browse all upcoming observing parties and RSVP to secure your spot under the night sky."
                : "Be the first to create an observing event for your region!"}
            </p>
            {filterView === "attending" ? (
              <button
                type="button"
                onClick={() => setFilterView("all")}
                className="mt-4 rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
              >
                Browse All Parties
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requireAuth(() => setIsModalOpen(true), "Sign in to host a community star party")}
                className="mt-4 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-400"
              >
                Host a Star Party
              </button>
            )}
          </div>
        ) : (
          /* Star Party Grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredParties.map((party) => {
              const isFull = party.attendee_count >= party.max_attendees;
              const fillPct = Math.min(100, Math.round((party.attendee_count / party.max_attendees) * 100));

              return (
                <article
                  key={party.id}
                  className="flex flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl transition hover:border-slate-700"
                >
                  {/* Card Header: Host & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                      <Sparkles className="h-3 w-3 text-sky-400" />
                      Host: {party.host?.email?.split("@")[0] ?? "Astronomer"}
                    </span>

                    {party.is_attending ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                        <CheckCircle className="h-3 w-3" />
                        Attending
                      </span>
                    ) : isFull ? (
                      <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                        Full
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
                        Open
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4">
                    <h2 className="text-xl font-bold text-white leading-snug">{party.title}</h2>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300 line-clamp-3">
                      {party.description}
                    </p>
                  </div>

                  {/* Event Details */}
                  <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                      <span className="font-semibold text-white">
                        {formatEventDate(party.event_date)}
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
                      <div>
                        <span>{party.location_name}</span>
                        <span className="block font-mono text-[10px] text-slate-400">
                          {party.latitude.toFixed(4)}°, {party.longitude.toFixed(4)}°
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="mt-5 border-t border-slate-800/80 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-400">Spots Claimed</span>
                      <span className="font-bold text-white">
                        {party.attendee_count} / {party.max_attendees}
                      </span>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        style={{ width: `${fillPct}%` }}
                        className={`h-full transition-all duration-300 ${
                          fillPct >= 100
                            ? "bg-rose-500"
                            : fillPct >= 75
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                      />
                    </div>
                  </div>

                  {/* RSVP Button */}
                  <div className="mt-6 pt-2">
                    <button
                      type="button"
                      onClick={() => requireAuth(() => void handleToggleRsvp(party.id), "Sign in to RSVP and reserve your spot at this star party")}
                      disabled={rsvpLoadingId === party.id || (!party.is_attending && isFull)}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                        party.is_attending
                          ? "border border-slate-700 bg-slate-800 text-rose-300 hover:border-rose-400/40 hover:bg-rose-950/30"
                          : isFull
                          ? "border border-slate-800 bg-slate-800/50 text-slate-500"
                          : "bg-sky-500 text-white shadow-lg shadow-sky-950/40 hover:bg-sky-400"
                      }`}
                    >
                      {rsvpLoadingId === party.id ? (
                        <span>Updating RSVP…</span>
                      ) : party.is_attending ? (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          Cancel RSVP
                        </>
                      ) : isFull ? (
                        "Party Full"
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          RSVP to Join
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Event Creation Modal */}
        {isModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80">
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-5 top-5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                <Telescope className="h-4 w-4" />
                Community Host
              </div>
              <h2 className="mt-1 text-2xl font-bold text-white">Host a Star Party</h2>
              <p className="text-xs text-slate-400">
                Create a dark sky gathering for observers and astrophotographers.
              </p>

              {modalError ? (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"
                >
                  {modalError}
                </div>
              ) : null}

              <form onSubmit={handleCreateParty} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="party-title" className="block text-xs font-medium text-slate-300">
                    Party Title
                  </label>
                  <input
                    id="party-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Cherry Springs Autumn Deep-Sky Night"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label htmlFor="party-desc" className="block text-xs font-medium text-slate-300">
                    Description & Equipment Guidelines
                  </label>
                  <textarea
                    id="party-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe target objects, telescope setup space, red light rules, etc."
                    required
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label htmlFor="party-loc" className="block text-xs font-medium text-slate-300">
                    Location Name
                  </label>
                  <input
                    id="party-loc"
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g., Cherry Springs State Park Astronomy Field"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                  />
                </div>

                {/* Coordinates & GPS */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Coordinates (Latitude, Longitude)
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={isLocating}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300"
                    >
                      <Crosshair className={`h-3 w-3 ${isLocating ? "animate-spin" : ""}`} />
                      {isLocating ? "Locating…" : "Use My GPS"}
                    </button>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Latitude"
                      required
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                    />
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Longitude"
                      required
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                {/* Date & Max Attendees */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="party-date" className="block text-xs font-medium text-slate-300">
                      Date & Time
                    </label>
                    <input
                      id="party-date"
                      type="datetime-local"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="party-capacity" className="block text-xs font-medium text-slate-300">
                      Max Attendees
                    </label>
                    <input
                      id="party-capacity"
                      type="number"
                      min="1"
                      max="500"
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(parseInt(e.target.value, 10) || 20)}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:from-sky-400 hover:to-indigo-500 disabled:opacity-60"
                  >
                    {isSubmitting ? "Publishing…" : "Publish Star Party"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </motion.div>
  );
}
