"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Navbar } from "@/components/Navbar";
import { calculateOptics, type OpticsResult } from "@/lib/utils/optics";
import { equipmentSchema, type EquipmentInput } from "@/lib/validations/equipment";
import type { Equipment, EquipmentType } from "@/types/database";

type EquipmentResponse = { equipment: Equipment[]; error?: string };

type EquipmentFormState = {
  name: string;
  type: EquipmentType;
  aperture_mm: string;
  focal_length_mm: string;
  eyepiece_focal_length_mm: string;
};

const initialFormState: EquipmentFormState = {
  name: "",
  type: "telescope",
  aperture_mm: "",
  focal_length_mm: "",
  eyepiece_focal_length_mm: "",
};

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function EquipmentSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Loading equipment inventory">
      <div className="h-56 rounded-2xl bg-slate-800" />
      <div className="h-72 rounded-2xl bg-slate-800" />
    </div>
  );
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [formData, setFormData] = useState<EquipmentFormState>(initialFormState);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const calculatorValues = useMemo(() => {
    const selectedEquipment = equipment.find((item) => item.id === selectedEquipmentId);

    if (selectedEquipment) {
      return {
        apertureMm: Number(selectedEquipment.aperture_mm),
        telescopeFocalLengthMm: Number(selectedEquipment.focal_length_mm),
        eyepieceFocalLengthMm:
          selectedEquipment.eyepiece_focal_length_mm === null
            ? undefined
            : Number(selectedEquipment.eyepiece_focal_length_mm),
      };
    }

    const apertureMm = Number(formData.aperture_mm);
    const telescopeFocalLengthMm = Number(formData.focal_length_mm);
    const eyepieceFocalLengthMm = formData.eyepiece_focal_length_mm
      ? Number(formData.eyepiece_focal_length_mm)
      : undefined;

    return { apertureMm, telescopeFocalLengthMm, eyepieceFocalLengthMm };
  }, [equipment, formData, selectedEquipmentId]);

  const optics = useMemo<OpticsResult | null>(() => {
    try {
      return calculateOptics(calculatorValues);
    } catch {
      return null;
    }
  }, [calculatorValues]);

  const loadEquipment = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const response = await fetch("/api/equipment");
      const body = (await response.json().catch(() => null)) as EquipmentResponse | null;

      if (!response.ok || !body) {
        throw new Error(body?.error ?? "Unable to retrieve your equipment inventory.");
      }

      setEquipment(body.equipment);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to retrieve your equipment inventory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEquipment();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadEquipment]);

  function updateField(field: keyof EquipmentFormState, value: string) {
    setSelectedEquipmentId("");
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const payload: EquipmentInput = {
      name: formData.name.trim(),
      type: formData.type,
      aperture_mm: Number(formData.aperture_mm),
      focal_length_mm: Number(formData.focal_length_mm),
      eyepiece_focal_length_mm: formData.eyepiece_focal_length_mm
        ? Number(formData.eyepiece_focal_length_mm)
        : null,
    };
    const validation = equipmentSchema.safeParse(payload);

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message ?? "Please correct the form fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const body = (await response.json().catch(() => null)) as {
        equipment?: Equipment;
        error?: string;
      } | null;

      if (!response.ok || !body?.equipment) {
        throw new Error(body?.error ?? "Unable to save this equipment item.");
      }

      setEquipment((current) => [body.equipment!, ...current]);
      setSelectedEquipmentId(body.equipment.id);
      setFormData(initialFormState);
      setFormSuccess(`${body.equipment.name} was added to your inventory.`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this equipment item.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setPageError(null);

    try {
      const response = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Unable to remove this equipment item.");
      }

      setEquipment((current) => current.filter((item) => item.id !== id));
      if (selectedEquipmentId === id) {
        setSelectedEquipmentId("");
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to remove this equipment item.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? <EquipmentSkeleton /> : null}

        {!isLoading && pageError ? (
          <section role="alert" className="rounded-2xl border border-red-400/40 bg-red-950/40 p-6 text-center">
            <h1 className="text-xl font-bold text-red-100">Equipment workspace unavailable</h1>
            <p className="mt-2 text-sm text-red-200">{pageError}</p>
            <button type="button" onClick={() => void loadEquipment()} className="mt-5 rounded-lg bg-red-300 px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-200">
              Refresh inventory
            </button>
          </section>
        ) : null}

        {!isLoading && !pageError ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-indigo-400/30 bg-slate-900 shadow-xl shadow-indigo-950/30">
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">Optical equipment manager</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Know what your optics can reveal</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Register your telescopes, eyepieces, and binoculars. The suitability engine turns their specifications into practical observing guidance.
                </p>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">Register equipment</p>
                <h2 className="mt-2 text-2xl font-bold">Add an optical setup</h2>
                <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-5">
                  {formError ? <p role="alert" className="rounded-lg border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{formError}</p> : null}
                  {formSuccess ? <p role="status" className="rounded-lg border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{formSuccess}</p> : null}
                  <label className="text-sm font-medium text-slate-200">Equipment name
                    <input value={formData.name} onChange={(event) => updateField("name", event.target.value)} disabled={isSubmitting} placeholder="8-inch Dobsonian" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60" />
                  </label>
                  <label className="text-sm font-medium text-slate-200">Type
                    <select value={formData.type} onChange={(event) => updateField("type", event.target.value)} disabled={isSubmitting} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60">
                      <option value="telescope">Telescope</option><option value="eyepiece">Eyepiece</option><option value="binoculars">Binoculars</option>
                    </select>
                  </label>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-200">Aperture (mm)
                      <input type="number" min="0.01" step="any" value={formData.aperture_mm} onChange={(event) => updateField("aperture_mm", event.target.value)} disabled={isSubmitting} placeholder="200" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60" />
                    </label>
                    <label className="text-sm font-medium text-slate-200">Focal length (mm)
                      <input type="number" min="0.01" step="any" value={formData.focal_length_mm} onChange={(event) => updateField("focal_length_mm", event.target.value)} disabled={isSubmitting} placeholder="1200" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60" />
                    </label>
                  </div>
                  <label className="text-sm font-medium text-slate-200">Eyepiece focal length (mm) <span className="font-normal text-slate-400">optional</span>
                    <input type="number" min="0.01" step="any" value={formData.eyepiece_focal_length_mm} onChange={(event) => updateField("eyepiece_focal_length_mm", event.target.value)} disabled={isSubmitting} placeholder="10" className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-60" />
                  </label>
                  <button type="submit" disabled={isSubmitting} className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSubmitting ? "Saving equipment…" : "Add to inventory"}
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">Live optics calculator</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div><h2 className="text-2xl font-bold">Magnification suitability</h2><p className="mt-1 text-sm text-slate-400">Use the current form values or select a saved item.</p></div>
                  <label className="text-sm font-medium text-slate-300">Saved equipment
                    <select value={selectedEquipmentId} onChange={(event) => setSelectedEquipmentId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400 sm:w-56">
                      <option value="">Current form values</option>
                      {equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                </div>
                {optics && !optics.invalidInput ? <div className="mt-6 space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label="Magnification" value={optics.magnification === null ? "—" : `${formatNumber(optics.magnification)}×`} detail={optics.magnification === null ? "Add an eyepiece to calculate" : `Max useful: ${formatNumber(optics.maxUsefulMagnification)}×`} />
                  <Metric label="Focal ratio" value={`f/${formatNumber(optics.focalRatio)}`} detail="Telescope focal length ÷ aperture" />
                  <Metric label="Resolving limit" value={`${formatNumber(optics.resolvingLimitArcsec)}″`} detail="Rayleigh criterion" />
                  <Metric label="Light gathering" value={`${formatNumber(optics.lightGatheringPower)}×`} detail="Compared with a 7 mm human eye" />
                  <Metric label="Useful magnification" value={`${formatNumber(optics.maxUsefulMagnification)}×`} detail="Practical upper limit" />
                </div><div className="rounded-xl border border-indigo-400/25 bg-indigo-950/30 p-4"><h3 className="font-semibold text-indigo-100">Suitable targets</h3><p className="mt-2 text-sm leading-6 text-indigo-100/80">{optics.suitableTargets.join(" · ")}</p></div></div> : <div className="mt-6 rounded-xl border border-dashed border-slate-600 bg-slate-950/50 p-6 text-sm text-slate-400">Enter a positive aperture and telescope focal length to calculate your optical metrics.</div>}
              </section>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
              <div className="flex flex-col gap-2 border-b border-slate-700 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">Inventory</p><h2 className="mt-1 text-2xl font-bold">Your optical equipment</h2></div><span className="text-sm text-slate-400">{equipment.length} item{equipment.length === 1 ? "" : "s"}</span></div>
              {equipment.length === 0 ? <p className="p-6 text-sm text-slate-400">Your inventory is empty. Register an optical instrument to begin calculating its capabilities.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-6 py-4">Equipment</th><th className="px-6 py-4">Aperture</th><th className="px-6 py-4">Focal length</th><th className="px-6 py-4">Eyepiece</th><th className="px-6 py-4"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-slate-800">{equipment.map((item) => <tr key={item.id} className="hover:bg-slate-800/40"><td className="px-6 py-4"><p className="font-semibold text-slate-100">{item.name}</p><p className="mt-1 capitalize text-slate-400">{item.type}</p></td><td className="px-6 py-4 tabular-nums">{formatNumber(Number(item.aperture_mm))} mm</td><td className="px-6 py-4 tabular-nums">{formatNumber(Number(item.focal_length_mm))} mm</td><td className="px-6 py-4 tabular-nums">{item.eyepiece_focal_length_mm === null ? "—" : `${formatNumber(Number(item.eyepiece_focal_length_mm))} mm`}</td><td className="px-6 py-4 text-right"><button type="button" onClick={() => void handleDelete(item.id)} disabled={deletingId === item.id} className="rounded-md border border-red-400/40 px-3 py-1.5 font-semibold text-red-200 transition hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-60">{deletingId === item.id ? "Removing…" : "Remove"}</button></td></tr>)}</tbody></table></div>}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
