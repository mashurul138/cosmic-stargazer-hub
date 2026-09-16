"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { motion } from "framer-motion";
import { calculateVisibilityScore, type VisibilityScore } from "@/lib/utils/visibility-score";
import { observationSchema, type ObservationInput } from "@/lib/validations/observation";
import type { Equipment, Observation } from "@/types/database";

type SpaceDataResponse = {
  weather: {
    cloudCover: number;
    relativeHumidity: number;
    windSpeed: number;
    visibility: number;
  };
};

type ObservationsResponse = {
  observations: Observation[];
  isAstronomerView: boolean;
};

type EquipmentResponse = {
  equipment: Equipment[];
};

type ObservationFormState = {
  title: string;
  celestial_target: string;
  location: string;
  notes: string;
  rating: string;
  equipment_id: string;
};

const initialFormState: ObservationFormState = {
  title: "",
  celestial_target: "",
  location: "",
  notes: "",
  rating: "5",
  equipment_id: "",
};

const visibilityBadgeClasses: Record<VisibilityScore["level"], string> = {
  Excellent: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  Good: "border-sky-400/40 bg-sky-400/15 text-sky-200",
  Fair: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  Poor: "border-red-400/40 bg-red-400/15 text-red-200",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="tracking-wide text-amber-300">
      {"★".repeat(rating)}
      <span className="text-slate-600">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function ObservationsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading observation data">
      <div className="h-52 rounded-2xl bg-slate-800" />
      <div className="h-80 rounded-2xl bg-slate-800" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-56 rounded-2xl bg-slate-800" />
        <div className="h-56 rounded-2xl bg-slate-800" />
        <div className="h-56 rounded-2xl bg-slate-800" />
      </div>
    </div>
  );
}

function ObservationsContent() {
  const searchParams = useSearchParams();
  const locationParam = searchParams.get("location");
  const targetParam = searchParams.get("target");

  const [observations, setObservations] = useState<Observation[]>([]);
  const [visibilityScore, setVisibilityScore] = useState<VisibilityScore | null>(null);
  const [isAstronomerView, setIsAstronomerView] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [formData, setFormData] = useState<ObservationFormState>(() => ({
    ...initialFormState,
    location: locationParam ?? "",
    celestial_target: targetParam ?? "",
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadObservationData = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [spaceDataResponse, observationsResponse, equipmentResponse] = await Promise.all([
        fetch("/api/space-data"),
        fetch("/api/observations"),
        fetch("/api/equipment"),
      ]);

      if (!spaceDataResponse.ok) {
        throw new Error("Unable to retrieve current stargazing conditions.");
      }

      if (!observationsResponse.ok) {
        const responseBody = (await observationsResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(responseBody?.error ?? "Unable to retrieve observation logs.");
      }

      if (!equipmentResponse.ok) {
        const responseBody = (await equipmentResponse.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(responseBody?.error ?? "Unable to retrieve your equipment inventory.");
      }

      const spaceData = (await spaceDataResponse.json()) as SpaceDataResponse;
      const observationData = (await observationsResponse.json()) as ObservationsResponse;
      const equipmentData = (await equipmentResponse.json()) as EquipmentResponse;

      setVisibilityScore(
        calculateVisibilityScore({
          cloudCover: spaceData.weather.cloudCover,
          humidity: spaceData.weather.relativeHumidity,
          windSpeed: spaceData.weather.windSpeed,
          visibility: spaceData.weather.visibility,
        }),
      );
      setObservations(observationData.observations);
      setIsAstronomerView(observationData.isAstronomerView);
      setEquipment(equipmentData.equipment);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load observation data. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadObservationData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadObservationData]);

  function updateField(field: keyof ObservationFormState, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const payload: ObservationInput = {
      title: formData.title.trim(),
      celestial_target: formData.celestial_target.trim(),
      location: formData.location.trim(),
      notes: formData.notes.trim(),
      rating: Number(formData.rating),
      equipment_id: formData.equipment_id || null,
    };
    const validation = observationSchema.safeParse(payload);

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message ?? "Please correct the form fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const responseBody = (await response.json().catch(() => null)) as {
        error?: string;
        observation?: Observation;
      } | null;

      if (!response.ok || !responseBody?.observation) {
        throw new Error(responseBody?.error ?? "Unable to save the observation.");
      }

      setObservations((current) => [responseBody.observation!, ...current]);
      setFormData(initialFormState);
      setFormSuccess("Observation saved to your stargazing log.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save the observation. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setPageError(null);

    try {
      const response = await fetch(`/api/observations/${id}`, { method: "DELETE" });
      const responseBody = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(responseBody?.error ?? "Unable to delete the observation.");
      }

      setObservations((current) => current.filter((observation) => observation.id !== id));
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to delete the observation. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
        {isLoading ? <ObservationsSkeleton /> : null}

        {!isLoading && pageError ? (
          <section
            role="alert"
            className="rounded-2xl border border-red-400/40 bg-red-950/40 p-6 text-center"
          >
            <h1 className="text-xl font-bold text-red-100">Observation workspace unavailable</h1>
            <p className="mt-2 text-sm text-red-200">{pageError}</p>
            <button
              type="button"
              onClick={() => void loadObservationData()}
              className="mt-5 rounded-lg bg-red-300 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-200"
            >
              Refresh workspace
            </button>
          </section>
        ) : null}

        {!isLoading && !pageError ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-indigo-400/30 bg-slate-900 shadow-xl shadow-indigo-950/30">
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Real-time sky assessment
                </p>
                <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                      Stargazing Visibility Score
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                      A live score based on cloud cover, humidity, wind speed, and horizontal visibility.
                    </p>
                  </div>
                  {visibilityScore ? (
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-bold tabular-nums text-white">
                        {Math.round(visibilityScore.score)}
                      </span>
                      <div>
                        <span className="block text-sm text-slate-400">out of 100</span>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${visibilityBadgeClasses[visibilityScore.level]}`}
                        >
                          {visibilityScore.level}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              {visibilityScore ? (
                <div className="border-t border-slate-700 bg-slate-950/40 px-6 py-4 text-sm text-slate-300 sm:px-8">
                  <span className="font-semibold text-indigo-200">Recommendation: </span>
                  {visibilityScore.recommendation}
                </div>
              ) : null}
            </section>

            {isAstronomerView ? (
              <section className="rounded-xl border border-sky-400/35 bg-sky-950/35 px-5 py-4 text-sm text-sky-100">
                <span className="font-semibold">Astronomer global view enabled.</span> You are viewing observation logs from the full community.
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">
                  New observation
                </p>
                <h2 className="mt-2 text-2xl font-bold">Log a night under the stars</h2>
              </div>

              <form onSubmit={handleSubmit} noValidate className="grid gap-5 md:grid-cols-2">
                {formError ? (
                  <div role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200 md:col-span-2">
                    {formError}
                  </div>
                ) : null}
                {formSuccess ? (
                  <div role="status" className="rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200 md:col-span-2">
                    {formSuccess}
                  </div>
                ) : null}

                <label className="block text-sm font-medium text-slate-200">
                  Observation title
                  <input
                    value={formData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Perseid meteor shower"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Celestial target
                  <input
                    value={formData.celestial_target}
                    onChange={(event) => updateField("celestial_target", event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="M31 Andromeda Galaxy"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Location
                  <input
                    value={formData.location}
                    onChange={(event) => updateField("location", event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Greenwich Observatory"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-200">
                  Rating
                  <select
                    value={formData.rating}
                    onChange={(event) => updateField("rating", event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="5">5 — Outstanding</option>
                    <option value="4">4 — Great</option>
                    <option value="3">3 — Good</option>
                    <option value="2">2 — Limited</option>
                    <option value="1">1 — Poor</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-200 md:col-span-2">
                  Equipment used <span className="font-normal text-slate-400">(optional)</span>
                  <select
                    value={formData.equipment_id}
                    onChange={(event) => updateField("equipment_id", event.target.value)}
                    disabled={isSubmitting}
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">No equipment linked</option>
                    {equipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.type})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-200 md:col-span-2">
                  Observation notes
                  <textarea
                    value={formData.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    disabled={isSubmitting}
                    rows={5}
                    className="mt-2 w-full resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="Describe the seeing, equipment, and details that stood out."
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Saving observation…" : "Save observation"}
                  </button>
                </div>
              </form>
            </section>

            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">
                    Observation archive
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Logged observations</h2>
                </div>
                <span className="text-sm text-slate-400">
                  {observations.length} {observations.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              {observations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 p-10 text-center">
                  <h3 className="text-lg font-semibold text-white">Your observation archive is clear</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Use the form above to preserve the details of your next night under the stars.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {observations.map((observation) => (
                    <article key={observation.id} className="flex flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{observation.title}</h3>
                          <p className="mt-1 text-sm font-medium text-indigo-300">{observation.celestial_target}</p>
                        </div>
                        <StarRating rating={observation.rating} />
                      </div>
                      <dl className="mt-5 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Location</dt>
                          <dd className="text-right text-slate-200">{observation.location}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Logged</dt>
                          <dd className="text-right text-slate-200">
                            {new Date(observation.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-5 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{observation.notes}</p>
                      <button
                        type="button"
                        onClick={() => void handleDelete(observation.id)}
                        disabled={deletingId === observation.id}
                        className="mt-6 w-fit rounded-md border border-red-400/40 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === observation.id ? "Deleting…" : "Delete"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </motion.div>
  );
}

export default function ObservationsPage() {
  return (
    <Suspense fallback={<ObservationsSkeleton />}>
      <ObservationsContent />
    </Suspense>
  );
}
