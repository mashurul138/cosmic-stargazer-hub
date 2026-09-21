"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Bookmark,
  Camera,
  CheckCircle,
  Clock,
  Crosshair,
  Eye,
  FileImage,
  Gauge,
  HelpCircle,
  Lightbulb,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Sun,
  UploadCloud,
  Wrench,
  Zap,
} from "lucide-react";

import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import type { DiagnosticReport, ImageStats } from "@/lib/utils/assess-photo";

const TARGET_TYPES = [
  "Deep Sky / Nebula",
  "Planetary",
  "Milky Way Widefield",
  "Moon / Solar",
  "Comet & Asteroid",
];

export default function AstrophotographyAssessorPage() {
  const { requireAuth } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<string>("Deep Sky / Nebula");

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingToLogbook, setIsSavingToLogbook] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [stats, setStats] = useState<ImageStats | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  // Handle file selection and processing
  function handleFileChange(file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size exceeds 10MB. Please choose a smaller photo.");
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);

    // Generate local preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }

  // Global Clipboard Paste Support (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFileChange(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Handle Drag & Drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }

  // Submit to Assessment API
  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please select or drop an astrophotograph first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("targetType", targetType);

      const res = await fetch("/api/assess-photo", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        stats?: ImageStats;
        report?: DiagnosticReport;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.error ?? `Analysis failed with status ${res.status}`);
      }

      setStats(data.stats ?? null);
      setReport(data.report ?? null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error analyzing photo. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSaveToLogbook() {
    if (!report) return;

    requireAuth(async () => {
      setIsSavingToLogbook(true);
      setErrorMessage(null);
      setSaveSuccess(null);
      try {
        const res = await fetch("/api/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${targetType} Photo Assessment`,
            celestial_target: targetType,
            location: "Astrophotography Rig",
            rating: Math.max(1, Math.min(5, Math.round(report.overallScore / 20))),
            notes: `Optical Score: ${report.overallScore}/100 | Focus: ${report.starFocusRating} | Trailing: ${report.starTrailingDetected ? "Detected" : "None"} | SNR: ${stats?.estimatedSnr ?? "N/A"} dB | Issues: ${report.detectedIssues.join("; ")} | Fixes: ${report.suggestedFixes.join("; ")}`,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save assessment to logbook.");
        }

        setSaveSuccess("Diagnostic assessment saved to your observation logbook!");
        setTimeout(() => setSaveSuccess(null), 5000);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to save assessment to logbook.");
      } finally {
        setIsSavingToLogbook(false);
      }
    }, "Sign in to save this photo assessment to your observation logbook");
  }

  function getScoreColor(score: number): { text: string; stroke: string; bg: string } {
    if (score >= 80) return { text: "text-emerald-400", stroke: "#10b981", bg: "bg-emerald-500/20" };
    if (score >= 60) return { text: "text-amber-400", stroke: "#f59e0b", bg: "bg-amber-500/20" };
    return { text: "text-rose-400", stroke: "#f43f5e", bg: "bg-rose-500/20" };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
              <Camera className="h-3.5 w-3.5" />
              Feature 5: AI Optical Diagnostics
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Sharp & Groq Diagnostics Engine
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            AI Astrophotography Quality Assessor
          </h1>
          <p className="text-sm text-slate-400">
            Upload your deep-sky, planetary, or Milky Way sub-exposures. Our optical engine inspects star
            profiles, tracking drift, sensor noise, and sky glow with actionable camera adjustments.
          </p>
        </header>

        {/* Main Grid: Upload & Analysis */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Upload Section (5 cols) */}
          <section className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl lg:col-span-5">
            <div>
              <label htmlFor="target-type-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Select Celestial Target Category
              </label>
              <select
                id="target-type-select"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-white outline-none focus:border-sky-400"
              >
                {TARGET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Zone */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Upload Astrophotograph (Max 10MB)
              </span>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-6 text-center transition hover:border-sky-400 hover:bg-slate-950/80"
              >
                {previewUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-48 w-full max-w-xs overflow-hidden rounded-xl border border-slate-700 shadow-md">
                      <Image
                        src={previewUrl}
                        alt="Uploaded preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <span className="max-w-[220px] truncate text-xs font-mono text-slate-300">
                      {selectedFile?.name} ({(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <label
                      htmlFor="photo-upload-input"
                      className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-sky-300 transition hover:border-sky-400 hover:text-white"
                    >
                      Choose Different Photo
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <UploadCloud className="h-10 w-10 text-sky-400 animate-bounce" />
                    <p className="mt-2 text-xs font-bold text-white">
                      Drag &amp; drop, click to browse, or paste an image directly with Ctrl+V / Cmd+V
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">Supports JPEG, PNG, or WebP (Max 10MB)</p>
                    <label
                      htmlFor="photo-upload-input"
                      className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-400"
                    >
                      <FileImage className="h-3.5 w-3.5" />
                      Browse Files
                    </label>
                  </div>
                )}

                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"
              >
                {errorMessage}
              </div>
            ) : null}

            {/* Submit Action */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedFile}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-950/40 transition hover:from-sky-400 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Extracting Optical Stats & AI Diagnostics…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Analyze Astrophotograph
                </>
              )}
            </button>
          </section>

          {/* Right Column: Diagnostic Dashboard (7 cols) */}
          <section className="flex flex-col gap-6 lg:col-span-7">
            {report && stats ? (
              <>
                {/* 1. Overall Score Dial & Summary Hero */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 backdrop-blur-xl shadow-2xl">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Overall Photo Quality Assessment
                      </span>
                      <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                        {report.overallScore >= 80
                          ? "Exemplary Sub-Exposure"
                          : report.overallScore >= 60
                          ? "Good Optical Capture"
                          : "Needs Parameter Tuning"}
                      </h2>
                      <p className="mt-1 text-xs text-slate-300">
                        Target analyzed: <span className="font-semibold text-sky-300">{targetType}</span>
                      </p>
                    </div>

                    {/* Circular Score Gauge */}
                    <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                        {/* Background Ring */}
                        <path
                          className="text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {/* Progress Ring */}
                        <path
                          style={{
                            stroke: getScoreColor(report.overallScore).stroke,
                            strokeDasharray: `${report.overallScore}, 100`,
                          }}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-white">{report.overallScore}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Score</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Core Diagnostic Badges */}
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Focus */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Crosshair className="h-3.5 w-3.5 text-sky-400" />
                        <span>Star Focus</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">{report.starFocusRating}</div>
                      <p className="text-[10px] text-slate-500">Point-spread sharpness</p>
                    </div>

                    {/* Star Trailing */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Tracking Drift</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">
                        {report.starTrailingDetected ? "Trailing Detected" : "Round / Tracked"}
                      </div>
                      <p className="text-[10px] text-slate-500">Mount tracking accuracy</p>
                    </div>

                    {/* Sky Glow */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Sun className="h-3.5 w-3.5 text-amber-400" />
                        <span>Sky Glow</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">{report.skyGlowLevel}</div>
                      <p className="text-[10px] text-slate-500">Background light pollution</p>
                    </div>

                    {/* Noise */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Radio className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Sensor Noise</span>
                      </div>
                      <div className="mt-1 text-sm font-bold text-white">{report.noiseLevel}</div>
                      <p className="text-[10px] text-slate-500">Thermal & ISO grain</p>
                    </div>
                  </div>
                </div>

                {/* 2. Sharp Sensor & Optical Metrics Breakdown */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Sliders className="h-4 w-4 text-sky-400" />
                      Sharp Image Histogram & Sensor Stats
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {stats.width} × {stats.height} px ({stats.format.toUpperCase()})
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-xs">
                    <div>
                      <span className="text-slate-400">Mean Sky Luminance:</span>
                      <div className="mt-1 text-base font-bold text-white">
                        {stats.meanLuminance} <span className="text-xs font-normal text-slate-500">/ 255</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          style={{ width: `${Math.min(100, (stats.meanLuminance / 255) * 100)}%` }}
                          className="h-full bg-sky-400"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Contrast (Std Dev):</span>
                      <div className="mt-1 text-base font-bold text-white">
                        {stats.contrastStdev} <span className="text-xs font-normal text-slate-500">σ</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          style={{ width: `${Math.min(100, (stats.contrastStdev / 64) * 100)}%` }}
                          className="h-full bg-emerald-400"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Dynamic Range:</span>
                      <div className="mt-1 text-base font-bold text-white">
                        {stats.dynamicRange} <span className="text-xs font-normal text-slate-500">levels</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          style={{ width: `${Math.min(100, (stats.dynamicRange / 255) * 100)}%` }}
                          className="h-full bg-indigo-400"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Estimated SNR:</span>
                      <div className="mt-1 text-base font-bold text-white">
                        {stats.estimatedSnr} <span className="text-xs font-normal text-slate-500">dB</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          style={{ width: `${Math.min(100, (stats.estimatedSnr / 35) * 100)}%` }}
                          className="h-full bg-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. AI Diagnostics: Identified Issues & Suggested Fixes */}
                <div className="grid gap-6 sm:grid-cols-2">
                  {/* Identified Issues */}
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      Identified Optical Issues
                    </div>
                    <ul className="mt-3 space-y-2.5 text-xs text-slate-300">
                      {report.detectedIssues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-400" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Camera Fixes */}
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-xl">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                      <Wrench className="h-4 w-4 text-emerald-400" />
                      Suggested Camera Adjustments
                    </div>
                    <ul className="mt-3 space-y-2.5 text-xs text-slate-300">
                      {report.suggestedFixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Save to Logbook Card */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30 p-5 backdrop-blur-xl shadow-xl shadow-indigo-950/20">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <Bookmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Save Assessment to Logbook</h4>
                      <p className="text-xs text-slate-400">Record this optical diagnostic and SNR analysis in your personal observation logbook.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveToLogbook}
                    disabled={isSavingToLogbook}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    {isSavingToLogbook ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : saveSuccess ? (
                      <CheckCircle className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {saveSuccess ? "Saved to Logbook!" : isSavingToLogbook ? "Saving..." : "Save Assessment"}
                  </button>
                </div>
              </>
            ) : (
              /* Empty Placeholder State */
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
                <Gauge className="h-12 w-12 text-slate-600" />
                <h3 className="mt-4 text-lg font-bold text-slate-300">
                  Ready for Optical Assessment
                </h3>
                <p className="mt-1.5 max-w-md text-xs text-slate-400">
                  Upload an astrophotograph on the left to generate an automated optical diagnostic report,
                  star trailing analysis, and recommended camera settings.
                </p>
              </div>
            )}
          </section>
        </div>
      </motion.div>
  );
}
