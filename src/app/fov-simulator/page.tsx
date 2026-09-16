"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle,
  Compass,
  Crosshair,
  Eye,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Telescope,
  ZoomIn,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import {
  calculateFOV,
  getFramingCoverage,
  type FOVResult,
  type FramingCoverageResult,
} from "@/lib/utils/fov";
import type { Equipment } from "@/types/database";

interface TargetPreset {
  id: string;
  name: string;
  category: "Galaxy" | "Nebula" | "Star Cluster" | "Solar System";
  widthArcmin: number;
  heightArcmin: number;
  description: string;
}

const CELESTIAL_TARGETS: TargetPreset[] = [
  {
    id: "m31",
    name: "Andromeda Galaxy (M31)",
    category: "Galaxy",
    widthArcmin: 190,
    heightArcmin: 60,
    description: "Our neighboring spiral galaxy, spanning over 3 degrees of sky.",
  },
  {
    id: "m42",
    name: "Orion Nebula (M42)",
    category: "Nebula",
    widthArcmin: 65,
    heightArcmin: 60,
    description: "Vibrant stellar nursery featuring the Trapezium cluster.",
  },
  {
    id: "m45",
    name: "Pleiades Cluster (M45)",
    category: "Star Cluster",
    widthArcmin: 110,
    heightArcmin: 110,
    description: "The Seven Sisters surrounded by luminous blue reflection nebulosity.",
  },
  {
    id: "moon",
    name: "Full Moon",
    category: "Solar System",
    widthArcmin: 31,
    heightArcmin: 31,
    description: "Earth's natural satellite, approximately half a degree wide.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    category: "Solar System",
    widthArcmin: 0.8,
    heightArcmin: 0.8,
    description: "Largest planet in the solar system with vivid cloud belts and moons.",
  },
  {
    id: "m51",
    name: "Whirlpool Galaxy (M51)",
    category: "Galaxy",
    widthArcmin: 11,
    heightArcmin: 7,
    description: "Grand-design spiral galaxy interacting with NGC 5195.",
  },
];

interface SensorPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  pixelPitchUm: number;
  description: string;
}

const SENSOR_PRESETS: SensorPreset[] = [
  {
    id: "full-frame",
    name: "Full Frame (35mm)",
    widthMm: 36.0,
    heightMm: 24.0,
    pixelPitchUm: 3.76,
    description: "36.0 × 24.0 mm (e.g., Sony A7/ZWO ASI6200)",
  },
  {
    id: "aps-c",
    name: "APS-C Sensor",
    widthMm: 23.5,
    heightMm: 15.6,
    pixelPitchUm: 3.76,
    description: "23.5 × 15.6 mm (e.g., ZWO ASI2600/Canon/Nikon APS-C)",
  },
  {
    id: "m43",
    name: "Micro 4/3",
    widthMm: 17.3,
    heightMm: 13.0,
    pixelPitchUm: 3.8,
    description: "17.3 × 13.0 mm (e.g., ZWO ASI294/Olympus/Panasonic)",
  },
  {
    id: "one-inch",
    name: "1-inch Sensor",
    widthMm: 13.2,
    heightMm: 8.8,
    pixelPitchUm: 2.4,
    description: "13.2 × 8.8 mm (e.g., ZWO ASI183/Altair)",
  },
  {
    id: "planetary",
    name: "Planetary / High-Speed Cam",
    widthMm: 6.4,
    heightMm: 4.8,
    pixelPitchUm: 2.9,
    description: "6.4 × 4.8 mm (e.g., ZWO ASI662/ASI224)",
  },
];

interface ScopePreset {
  name: string;
  focalLength: number;
  aperture: number;
}

const SCOPE_PRESETS: ScopePreset[] = [
  { name: "400mm Widefield Refractor (f/5.6)", focalLength: 400, aperture: 72 },
  { name: "750mm Imaging Reflector (f/5)", focalLength: 750, aperture: 150 },
  { name: "1000mm Newtonian Reflector (f/5)", focalLength: 1000, aperture: 200 },
  { name: "2000mm Schmidt-Cassegrain (f/10)", focalLength: 2000, aperture: 203 },
  { name: "2800mm High-Power SCT (f/10)", focalLength: 2800, aperture: 280 },
];

export default function FovSimulatorPage() {
  // Target Selection
  const [selectedTargetId, setSelectedTargetId] = useState<string>("m31");

  // Telescope Optical Controls
  const [focalLength, setFocalLength] = useState<number>(500);
  const [focalLengthInput, setFocalLengthInput] = useState<string>("500");

  // Sensor Controls
  const [selectedSensorId, setSelectedSensorId] = useState<string>("full-frame");
  const [customSensorWidth, setCustomSensorWidth] = useState<number>(36.0);
  const [customSensorHeight, setCustomSensorHeight] = useState<number>(24.0);
  const [isCustomSensor, setIsCustomSensor] = useState<boolean>(false);

  // Eyepiece Mode Toggle
  const [isEyepieceMode, setIsEyepieceMode] = useState<boolean>(false);
  const [eyepieceFocalLength, setEyepieceFocalLength] = useState<number>(25);
  const [eyepieceAfov, setEyepieceAfov] = useState<number>(52);

  // User Equipment state
  const [savedEquipment, setSavedEquipment] = useState<Equipment[]>([]);

  // Canvas Zoom / Viewport scale
  const [zoomScale, setZoomScale] = useState<number>(1.0);

  // Load saved equipment
  useEffect(() => {
    async function loadEquipment() {
      try {
        const res = await fetch("/api/equipment");
        if (res.ok) {
          const data = (await res.json()) as { equipment?: Equipment[] };
          if (data.equipment && data.equipment.length > 0) {
            setSavedEquipment(data.equipment);
          }
        }
      } catch {
        // Guest user or unauthenticated
      }
    }
    void loadEquipment();
  }, []);

  const activeTarget = useMemo(() => {
    return (
      CELESTIAL_TARGETS.find((t) => t.id === selectedTargetId) ??
      CELESTIAL_TARGETS[0]
    );
  }, [selectedTargetId]);

  const activeSensor = useMemo(() => {
    return SENSOR_PRESETS.find((s) => s.id === selectedSensorId) ?? SENSOR_PRESETS[0];
  }, [selectedSensorId]);

  const sensorWidth = isCustomSensor ? customSensorWidth : activeSensor.widthMm;
  const sensorHeight = isCustomSensor ? customSensorHeight : activeSensor.heightMm;

  // Calculate FOV
  const fovResult: FOVResult = useMemo(() => {
    return calculateFOV({
      telescopeFocalLengthMm: focalLength,
      sensorWidthMm: sensorWidth,
      sensorHeightMm: sensorHeight,
      eyepieceAfovDeg: isEyepieceMode ? eyepieceAfov : undefined,
      eyepieceFocalLengthMm: isEyepieceMode ? eyepieceFocalLength : undefined,
      pixelPitchUm: activeSensor.pixelPitchUm,
    });
  }, [
    focalLength,
    sensorWidth,
    sensorHeight,
    isEyepieceMode,
    eyepieceAfov,
    eyepieceFocalLength,
    activeSensor.pixelPitchUm,
  ]);

  // Calculate Framing Coverage
  const framing: FramingCoverageResult = useMemo(() => {
    const maxTargetDim = Math.max(activeTarget.widthArcmin, activeTarget.heightArcmin);
    return getFramingCoverage(fovResult.fovWidthDeg, fovResult.fovHeightDeg, maxTargetDim);
  }, [fovResult, activeTarget]);

  // Handle Equipment Selection
  function handleSelectSavedEquipment(eqId: string) {
    const item = savedEquipment.find((e) => e.id === eqId);
    if (!item) return;

    if (item.focal_length_mm) {
      setFocalLength(item.focal_length_mm);
      setFocalLengthInput(item.focal_length_mm.toString());
    }

    if (item.eyepiece_focal_length_mm) {
      setIsEyepieceMode(true);
      setEyepieceFocalLength(item.eyepiece_focal_length_mm);
    }
  }

  // Handle Sensor Preset Change
  function handleSensorPresetChange(presetId: string) {
    if (presetId === "custom") {
      setIsCustomSensor(true);
    } else {
      setIsCustomSensor(false);
      setSelectedSensorId(presetId);
      const preset = SENSOR_PRESETS.find((s) => s.id === presetId);
      if (preset) {
        setCustomSensorWidth(preset.widthMm);
        setCustomSensorHeight(preset.heightMm);
      }
    }
  }

  // Dynamic SVG Canvas Scaling
  // We represent 1 arcminute as X pixels based on target size and FOV bounds
  const canvasConfig = useMemo(() => {
    const canvasWidth = 640;
    const canvasHeight = 440;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // View dimensions in arcminutes
    const effectiveFovW = isEyepieceMode && fovResult.tfovDeg
      ? fovResult.tfovDeg * 60
      : fovResult.fovWidthArcmin;
    const effectiveFovH = isEyepieceMode && fovResult.tfovDeg
      ? fovResult.tfovDeg * 60
      : fovResult.fovHeightArcmin;

    // Maximum span to fit in canvas (either target or sensor)
    const maxSpanArcmin = Math.max(
      effectiveFovW,
      effectiveFovH,
      activeTarget.widthArcmin,
      activeTarget.heightArcmin,
      1,
    );

    // Pixels per arcminute
    const baseScale = (canvasHeight * 0.72) / maxSpanArcmin;
    const scale = baseScale * zoomScale;

    // Sensor Rect in SVG pixels
    const sensorRectW = effectiveFovW * scale;
    const sensorRectH = effectiveFovH * scale;

    // Target Dimensions in SVG pixels
    const targetSvgW = Math.max(4, activeTarget.widthArcmin * scale);
    const targetSvgH = Math.max(4, activeTarget.heightArcmin * scale);

    return {
      canvasWidth,
      canvasHeight,
      centerX,
      centerY,
      sensorRectW,
      sensorRectH,
      targetSvgW,
      targetSvgH,
      effectiveFovW,
      effectiveFovH,
    };
  }, [fovResult, activeTarget, isEyepieceMode, zoomScale]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                <Camera className="h-3.5 w-3.5" />
                Feature 3: Optics & Framing Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                <Crosshair className="h-3 w-3 text-indigo-400" />
                Interactive FOV Simulator
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Telescope & Sensor Field of View Simulator
            </h1>
            <p className="text-sm text-slate-400">
              Visualize how celestial galaxies, nebulae, and planets are framed through different
              astrophotography camera sensors and visual eyepieces.
            </p>
          </div>
        </header>

        {/* Main Workspace Layout */}
        <div className="grid flex-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Controls (4 Cols) */}
          <section className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl lg:col-span-5">
            {/* 1. Target Preset Selector */}
            <div>
              <label htmlFor="target-select" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-4 w-4 text-sky-400" />
                1. Select Celestial Target
              </label>
              <select
                id="target-select"
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-sky-400"
              >
                {CELESTIAL_TARGETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.widthArcmin}' × {t.heightArcmin}')
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-slate-400">{activeTarget.description}</p>
            </div>

            <div className="h-px bg-slate-800" />

            {/* 2. Telescope Optical Specs */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="focal-length-slider" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Telescope className="h-4 w-4 text-indigo-400" />
                  2. Telescope Focal Length
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={focalLengthInput}
                    onChange={(e) => {
                      setFocalLengthInput(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) setFocalLength(parsed);
                    }}
                    className="w-20 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-right text-xs font-mono font-bold text-sky-400 focus:border-sky-400"
                  />
                  <span className="text-xs text-slate-500">mm</span>
                </div>
              </div>

              {/* Slider */}
              <input
                id="focal-length-slider"
                type="range"
                min="200"
                max="3000"
                step="25"
                value={focalLength}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFocalLength(val);
                  setFocalLengthInput(val.toString());
                }}
                className="mt-3 w-full accent-sky-400 cursor-pointer"
              />

              {/* Scope Quick Presets */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {SCOPE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setFocalLength(p.focalLength);
                      setFocalLengthInput(p.focalLength.toString());
                    }}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                      focalLength === p.focalLength
                        ? "border-sky-400 bg-sky-500/20 text-white"
                        : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {p.focalLength}mm
                  </button>
                ))}
              </div>

              {/* Saved Equipment Dropdown (if available) */}
              {savedEquipment.length > 0 ? (
                <div className="mt-3">
                  <label htmlFor="equipment-select" className="text-[11px] font-medium text-slate-400">
                    Or select from your saved equipment:
                  </label>
                  <select
                    id="equipment-select"
                    onChange={(e) => handleSelectSavedEquipment(e.target.value)}
                    defaultValue=""
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-indigo-300 outline-none"
                  >
                    <option value="" disabled>
                      Choose saved telescope…
                    </option>
                    {savedEquipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.focal_length_mm}mm FL)
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="h-px bg-slate-800" />

            {/* 3. Camera Sensor / Eyepiece Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Camera className="h-4 w-4 text-emerald-400" />
                  3. Imaging Sensor / Eyepiece
                </label>

                {/* Eyepiece Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setIsEyepieceMode(!isEyepieceMode)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    isEyepieceMode
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-300"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  {isEyepieceMode ? "Eyepiece Visual Mode" : "Camera Sensor Mode"}
                </button>
              </div>

              {!isEyepieceMode ? (
                <div className="mt-2.5 space-y-3">
                  <select
                    value={isCustomSensor ? "custom" : selectedSensorId}
                    onChange={(e) => handleSensorPresetChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-sky-400"
                  >
                    {SENSOR_PRESETS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.widthMm} × {s.heightMm} mm)
                      </option>
                    ))}
                    <option value="custom">Custom Sensor Dimensions…</option>
                  </select>

                  {isCustomSensor ? (
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div>
                        <span className="text-[11px] text-slate-400">Width (mm):</span>
                        <input
                          type="number"
                          step="0.1"
                          value={customSensorWidth}
                          onChange={(e) => setCustomSensorWidth(parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400">Height (mm):</span>
                        <input
                          type="number"
                          step="0.1"
                          value={customSensorHeight}
                          onChange={(e) => setCustomSensorHeight(parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{activeSensor.description}</p>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-3 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="eyepiece-fl" className="text-[11px] font-medium text-slate-300">
                        Eyepiece FL (mm)
                      </label>
                      <input
                        id="eyepiece-fl"
                        type="number"
                        min="2"
                        max="55"
                        value={eyepieceFocalLength}
                        onChange={(e) => setEyepieceFocalLength(parseFloat(e.target.value) || 10)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="eyepiece-afov" className="text-[11px] font-medium text-slate-300">
                        Eyepiece AFOV (°)
                      </label>
                      <input
                        id="eyepiece-afov"
                        type="number"
                        min="40"
                        max="120"
                        value={eyepieceAfov}
                        onChange={(e) => setEyepieceAfov(parseFloat(e.target.value) || 52)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    Magnification: <span className="font-bold text-white">{fovResult.magnification}×</span> |
                    True Field of View: <span className="font-bold text-white">{fovResult.tfovDeg}°</span>
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Simulator Canvas & Analysis (7 Cols) */}
          <section className="flex flex-col gap-5 lg:col-span-7">
            {/* Visual Canvas Card */}
            <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
              {/* Canvas Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Framing Canvas</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-sky-300">
                    {activeTarget.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.4, Number((s - 0.2).toFixed(1))))}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition hover:text-white"
                    title="Zoom Out"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-xs text-slate-400">{zoomScale}×</span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(4.0, Number((s + 0.2).toFixed(1))))}
                    className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 transition hover:text-white"
                    title="Zoom In"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Interactive SVG Canvas */}
              <div className="relative flex h-[380px] w-full items-center justify-center overflow-hidden bg-slate-950 sm:h-[440px]">
                {/* Background Stars Grid */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

                <svg
                  viewBox={`0 0 ${canvasConfig.canvasWidth} ${canvasConfig.canvasHeight}`}
                  className="h-full w-full select-none"
                >
                  <defs>
                    {/* Celestial Glow Gradients */}
                    <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="40%" stopColor="#818cf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="nebulaGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                      <stop offset="35%" stopColor="#a855f7" stopOpacity="0.45" />
                      <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.95" />
                      <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#475569" stopOpacity="0.3" />
                    </radialGradient>
                  </defs>

                  {/* 1. Target Rendering */}
                  {selectedTargetId === "moon" ? (
                    <g transform={`translate(${canvasConfig.centerX}, ${canvasConfig.centerY})`}>
                      <circle
                        r={canvasConfig.targetSvgW / 2}
                        fill="url(#moonGlow)"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                      {/* Lunar Maria Details */}
                      <circle
                        cx={-canvasConfig.targetSvgW * 0.15}
                        cy={-canvasConfig.targetSvgH * 0.12}
                        r={canvasConfig.targetSvgW * 0.2}
                        fill="#64748b"
                        opacity="0.4"
                      />
                      <circle
                        cx={canvasConfig.targetSvgW * 0.2}
                        cy={canvasConfig.targetSvgH * 0.15}
                        r={canvasConfig.targetSvgW * 0.18}
                        fill="#64748b"
                        opacity="0.4"
                      />
                    </g>
                  ) : selectedTargetId === "m42" ? (
                    <g transform={`translate(${canvasConfig.centerX}, ${canvasConfig.centerY})`}>
                      <ellipse
                        rx={canvasConfig.targetSvgW / 2}
                        ry={canvasConfig.targetSvgH / 2}
                        fill="url(#nebulaGlow)"
                      />
                      {/* Central Stars */}
                      <circle cx="0" cy="0" r="3" fill="#ffffff" />
                      <circle cx="-3" cy="2" r="2" fill="#38bdf8" />
                      <circle cx="3" cy="-2" r="2" fill="#38bdf8" />
                    </g>
                  ) : selectedTargetId === "jupiter" ? (
                    <g transform={`translate(${canvasConfig.centerX}, ${canvasConfig.centerY})`}>
                      <circle
                        r={Math.max(6, canvasConfig.targetSvgW / 2)}
                        fill="#fef08a"
                        stroke="#ca8a04"
                        strokeWidth="1"
                      />
                      {/* Planetary Stripes */}
                      <line
                        x1={-Math.max(6, canvasConfig.targetSvgW / 2)}
                        y1="-2"
                        x2={Math.max(6, canvasConfig.targetSvgW / 2)}
                        y2="-2"
                        stroke="#b45309"
                        strokeWidth="2"
                        opacity="0.7"
                      />
                      <line
                        x1={-Math.max(6, canvasConfig.targetSvgW / 2)}
                        y1="2"
                        x2={Math.max(6, canvasConfig.targetSvgW / 2)}
                        y2="2"
                        stroke="#b45309"
                        strokeWidth="2"
                        opacity="0.7"
                      />
                    </g>
                  ) : (
                    // Default Spiral Galaxy / Cluster Oval
                    <g transform={`translate(${canvasConfig.centerX}, ${canvasConfig.centerY})`}>
                      <ellipse
                        rx={canvasConfig.targetSvgW / 2}
                        ry={canvasConfig.targetSvgH / 2}
                        fill="url(#targetGlow)"
                        transform="rotate(-25)"
                      />
                      {/* Spiral core */}
                      <ellipse
                        rx={canvasConfig.targetSvgW * 0.25}
                        ry={canvasConfig.targetSvgH * 0.25}
                        fill="#ffffff"
                        opacity="0.85"
                        transform="rotate(-25)"
                      />
                    </g>
                  )}

                  {/* 2. Sensor Wireframe / Eyepiece Circle Overlay */}
                  {isEyepieceMode ? (
                    // Eyepiece Circular True Field of View
                    <g transform={`translate(${canvasConfig.centerX}, ${canvasConfig.centerY})`}>
                      <circle
                        r={canvasConfig.sensorRectW / 2}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                      />
                      {/* Eyepiece Crosshairs */}
                      <line x1="-15" y1="0" x2="15" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                      <line x1="0" y1="-15" x2="0" y2="15" stroke="#f59e0b" strokeWidth="1.5" />
                    </g>
                  ) : (
                    // Camera Sensor Bounding Box
                    <g transform={`translate(${canvasConfig.centerX}, ${canvasConfig.centerY})`}>
                      <rect
                        x={-canvasConfig.sensorRectW / 2}
                        y={-canvasConfig.sensorRectH / 2}
                        width={canvasConfig.sensorRectW}
                        height={canvasConfig.sensorRectH}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        className="drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                      />

                      {/* Corner Reticle Brackets */}
                      {/* Top-Left */}
                      <path
                        d={`M ${-canvasConfig.sensorRectW / 2 + 16} ${-canvasConfig.sensorRectH / 2} L ${-canvasConfig.sensorRectW / 2} ${-canvasConfig.sensorRectH / 2} L ${-canvasConfig.sensorRectW / 2} ${-canvasConfig.sensorRectH / 2 + 16}`}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3"
                      />
                      {/* Top-Right */}
                      <path
                        d={`M ${canvasConfig.sensorRectW / 2 - 16} ${-canvasConfig.sensorRectH / 2} L ${canvasConfig.sensorRectW / 2} ${-canvasConfig.sensorRectH / 2} L ${canvasConfig.sensorRectW / 2} ${-canvasConfig.sensorRectH / 2 + 16}`}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3"
                      />
                      {/* Bottom-Left */}
                      <path
                        d={`M ${-canvasConfig.sensorRectW / 2 + 16} ${canvasConfig.sensorRectH / 2} L ${-canvasConfig.sensorRectW / 2} ${canvasConfig.sensorRectH / 2} L ${-canvasConfig.sensorRectW / 2} ${canvasConfig.sensorRectH / 2 - 16}`}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3"
                      />
                      {/* Bottom-Right */}
                      <path
                        d={`M ${canvasConfig.sensorRectW / 2 - 16} ${canvasConfig.sensorRectH / 2} L ${canvasConfig.sensorRectW / 2} ${canvasConfig.sensorRectH / 2} L ${canvasConfig.sensorRectW / 2} ${canvasConfig.sensorRectH / 2 - 16}`}
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3"
                      />

                      {/* Center Crosshair */}
                      <line x1="-12" y1="0" x2="12" y2="0" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                      <line x1="0" y1="-12" x2="0" y2="12" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
                    </g>
                  )}
                </svg>

                {/* Legend Watermark */}
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-[11px] font-mono text-slate-400 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                    <span>
                      {isEyepieceMode ? "Eyepiece TFOV Circle" : "Camera Sensor Reticle"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Framing Summary Metrics Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Framing Assessment
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{framing.status}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                        framing.status === "Fully Framed"
                          ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                          : framing.status === "Wide Field"
                          ? "border-sky-400/40 bg-sky-500/20 text-sky-300"
                          : "border-rose-400/40 bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {framing.fitPercentage}% Frame Coverage
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">{framing.details}</p>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] font-medium text-slate-400">Field of View (Degrees)</span>
                  <div className="mt-1 text-lg font-bold text-white">
                    {fovResult.fovWidthDeg}° × {fovResult.fovHeightDeg}°
                  </div>
                  <p className="text-[10px] text-slate-500">Angle across sky</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] font-medium text-slate-400">Field of View (Arcmin)</span>
                  <div className="mt-1 text-lg font-bold text-sky-300">
                    {fovResult.fovWidthArcmin}' × {fovResult.fovHeightArcmin}'
                  </div>
                  <p className="text-[10px] text-slate-500">60 arcmin per degree</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] font-medium text-slate-400">Target Angular Span</span>
                  <div className="mt-1 text-lg font-bold text-amber-300">
                    {activeTarget.widthArcmin}' × {activeTarget.heightArcmin}'
                  </div>
                  <p className="text-[10px] text-slate-500">{activeTarget.name}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <span className="text-[11px] font-medium text-slate-400">
                    {isEyepieceMode ? "Magnification" : "Image Scale"}
                  </span>
                  <div className="mt-1 text-lg font-bold text-white">
                    {isEyepieceMode
                      ? `${fovResult.magnification}×`
                      : fovResult.imageScaleArcsecPerPixel
                      ? `${fovResult.imageScaleArcsecPerPixel}"/px`
                      : "N/A"}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {isEyepieceMode ? "Optical power" : "Arcsec per pixel"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
