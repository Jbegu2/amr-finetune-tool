"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback, CSSProperties, memo, useId } from "react";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

type PtA = { x: number; y: number; angle: number };
type Pt = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };
type CanvasSize = { w: number; h: number };
type Viewport = Bounds & CanvasSize;

type Fine = {
  mean_x: number;
  mean_y: number;
  mean_angle: number;
  std_x_mm: number;
  std_y_mm: number;
  std_angle_deg: number;
};

type CustomPoint = {
  id: string;
  name: string;
  referenceIndex: number;
  distanceMm: string;
  flipped: boolean;
};

type ComputedCustomPoint = PtA & { customId: string; name: string };

type SavedRun = { 
  id: string; 
  name: string; 
  fine: Fine; 
  seq: PtA[]; 
  createdAt: number;
  visible?: boolean;
  customPoints?: CustomPoint[];
};

type PointInput = { x: string; y: string; angle: string };
type ValidatedPoint = Pt & { valid: boolean };

type PointTypeInfo = {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  index: number;
};

// ==========================================
// 2. CONSTANTS & CONFIGURATION
// ==========================================

const CONFIG = {
  DEFAULT_CANVAS_WIDTH: 1000,
  DEFAULT_CANVAS_HEIGHT: 700,
  MIN_ZOOM: 0.05,
  MAX_ZOOM: 50,
  ZOOM_FACTOR: 1.08,
  DEFAULT_PADDING: 0.5,
  PADDING_RATIO: 0.1,
  MIN_RANGE_THRESHOLD: 0.01,
  FALLBACK_RANGE: 2,
  TICK_SPACING_PX: 80,
  TICK_TOLERANCE: 0.01,
  POINT_RADIUS_INPUT: 5,
  POINT_RADIUS_GENERATED: 7,
  SEGMENT_LABEL_RADIUS: 14,
  STROKE_WIDTH_AXIS: 2,
  STROKE_WIDTH_POINT: 2,
  TOOLTIP_OFFSET_X: 12,
  TOOLTIP_OFFSET_Y: 12,
  MAX_SAVED_RUNS: 50,
  MAX_POINTS: 10,
  STORAGE_WARNING_SIZE: 4_000_000,
  LOCALSTORAGE_KEY: "ft_saved_runs",
  INPUT_DEBOUNCE_MS: 150,
  KEYBOARD_PAN_STEP: 20,
} as const;

const COLORS = {
  raw: "#1f77b4",
  rawPreview: "rgba(31, 119, 180, 0.4)",
  drop: "#000000",
  pick: "#16a34a",
  approach: "#9333ea",
  curve: "#dc2626",
  custom: "#f59e0b",
  axis: "#6b7280",
  grid: "#e5e7eb",
  text: "#6b7280",
  danger: "#dc2626",
  white: "#ffffff",
  primary: "#ff0000",
  savedOverlay: "#888888",
  focus: "#2563eb",
} as const;

const POINT_TYPES: readonly PointTypeInfo[] = [
  { key: 'drop', label: 'Drop (P0)', shortLabel: 'Drop', color: COLORS.drop, index: 0 },
  { key: 'pick', label: 'Pick (P1)', shortLabel: 'Pick', color: COLORS.pick, index: 1 },
  { key: 'approach', label: 'Approach (P2)', shortLabel: 'Approach', color: COLORS.approach, index: 2 },
  { key: 'curve', label: 'Curve (P3)', shortLabel: 'Curve', color: COLORS.curve, index: 3 },
] as const;

function getPointInfo(index: number): PointTypeInfo {
  if (index >= 0 && index < POINT_TYPES.length) {
    return POINT_TYPES[index];
  }
  return { key: `p${index}`, label: `P${index}`, shortLabel: `P${index}`, color: "#111111", index };
}

// ==========================================
// 3. STYLES
// ==========================================

const S: Record<string, CSSProperties> = {
  page: { padding: 20, fontFamily: "Inter, system-ui, -apple-system, sans-serif", color: "#111", maxWidth: "100%", overflowX: "hidden", background: "#f8fafc" },
  grid: { display: "grid", gridTemplateColumns: "minmax(480px, 1fr) minmax(400px, 1.5fr)", gap: 20, alignItems: "start" },
  panel: { border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  canvasContainer: { position: "relative", width: "100%", height: "55vh", minHeight: 320, overflow: "hidden", overscrollBehavior: "contain" },
  h2: { margin: 0, marginBottom: 2, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" },
  headerSub: { fontSize: 13, color: COLORS.text },
  sectionTitle: { fontWeight: 600, marginBottom: 10, fontSize: 14, color: "#374151", textTransform: "uppercase", letterSpacing: "0.02em" },
  subLabel: { fontSize: 12, color: COLORS.text, marginBottom: 6 },
  input: { border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 14, width: 85, transition: "border-color 0.15s, box-shadow 0.15s", background: "#fff" },
  inputFull: { border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 14, width: "100%", transition: "border-color 0.15s, box-shadow 0.15s", background: "#fff" },
  btnBase: { borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500, border: "1px solid transparent", transition: "background-color 0.15s, opacity 0.15s, transform 0.1s" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: "6px 4px", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em" },
  td: { borderTop: "1px solid #f3f4f6", padding: "6px 4px" },
  tooltip: { position: "fixed", display: "none", pointerEvents: "none", background: "rgba(15,23,42,0.95)", color: "#fff", fontSize: 12, padding: "6px 10px", borderRadius: 5, zIndex: 50, whiteSpace: 'pre-line', maxWidth: 220, lineHeight: 1.4 },
  centerBtn: { position: "absolute", right: 12, bottom: 12, background: "#fff", color: "#374151", border: "1px solid #e2e8f0", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", transition: "transform 0.15s, box-shadow 0.15s" },
  errorBox: { color: COLORS.danger, fontSize: 12, marginBottom: 8, padding: "8px 10px", background: "#fef2f2", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, border: "1px solid #fecaca" },
  srOnly: { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 },
  skipLink: { position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden", zIndex: 100 },
};

const focusRingStyle = `
  input:focus, select:focus, button:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid ${COLORS.focus};
    outline-offset: 2px;
  }
  button:active { transform: scale(0.98); }
  .skip-link:focus {
    position: fixed !important; left: 16px !important; top: 16px !important;
    width: auto !important; height: auto !important; padding: 12px 24px !important;
    background: ${COLORS.primary} !important; color: #fff !important;
    border-radius: 8px !important; font-size: 14px !important; font-weight: 600 !important;
    z-index: 100 !important; text-decoration: none !important;
  }
`;

const btnStyle = (type: 'primary' | 'secondary' | 'danger' | 'ghost') => {
  const base = { ...S.btnBase };
  switch (type) {
    case 'primary': return { ...base, background: COLORS.primary, color: "#fff", borderColor: COLORS.primary, fontWeight: 600 };
    case 'secondary': return { ...base, background: "#f8fafc", color: "#374151", borderColor: "#e2e8f0" };
    case 'danger': return { ...base, background: "#fef2f2", color: COLORS.danger, borderColor: "#fecaca", padding: "6px 10px", fontSize: 12 };
    default: return base;
  }
};

const legendDot = (bg: string): CSSProperties => ({ display: "inline-block", width: 10, height: 10, borderRadius: 10, background: bg, marginRight: 6 });

// ==========================================
// 4. HOOKS & UTILITIES
// ==========================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useAnnounce() {
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback((message: string) => {
    setAnnouncement("");
    setTimeout(() => setAnnouncement(message), 100);
  }, []);
  return { announcement, announce };
}

function parseFloatSafe(val: string): number | null {
  if (val === "" || val === "-" || val === "." || val === "-.") return null;
  const trimmed = val.trim();
  if (!/^-?\d*\.?\d+$/.test(trimmed)) return null;
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

const fmt3 = (v: number) => {
  const s = (Math.round(v * 1000) / 1000).toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return s === "-0" ? "0" : s;
};

function unitFromAngleDeg(deg: number) {
  const r = (deg * Math.PI) / 180;
  return { ux: Math.cos(r), uy: Math.sin(r) };
}

const roundTo = (value: number, decimals: number) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

function normalizeAngle(angleDeg: number) {
  const angle = ((angleDeg % 360) + 360) % 360;
  return angle >= 180 ? angle - 360 : angle;
}

function meanAngle(anglesDeg: number[]) {
  if (!anglesDeg.length) return 0;
  const anglesRad = anglesDeg.map(a => (a * Math.PI) / 180);
  const xSum = anglesRad.reduce((acc, a) => acc + Math.cos(a), 0);
  const ySum = anglesRad.reduce((acc, a) => acc + Math.sin(a), 0);
  const meanRad = Math.atan2(ySum, xSum);
  return normalizeAngle((meanRad * 180) / Math.PI);
}

function stdAngle(anglesDeg: number[], meanDeg: number) {
  if (anglesDeg.length < 2) return 0;
  const variance = anglesDeg
    .map(a => normalizeAngle(a - meanDeg))
    .reduce((acc, d) => acc + d * d, 0) / (anglesDeg.length - 1);
  return Math.sqrt(variance);
}

function sampleStd(vals: number[]) {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((acc, v) => acc + v, 0) / vals.length;
  const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

function computeFineTuning(points: PtA[], segments: number[]) {
  if (points.length < 1) throw new Error("Need at least 1 point");
  const neededSegments = points.length - 1;
  const normalizedSegments = [...segments];
  if (normalizedSegments.length < neededSegments) {
    normalizedSegments.push(...Array(neededSegments - normalizedSegments.length).fill(0));
  }
  normalizedSegments.length = neededSegments;

  const xVals = points.map(p => p.x);
  const yVals = points.map(p => p.y);
  const angleVals = points.map(p => p.angle);
  const meanX = xVals.reduce((acc, v) => acc + v, 0) / xVals.length;
  const meanY = yVals.reduce((acc, v) => acc + v, 0) / yVals.length;
  const meanAngleDeg = meanAngle(angleVals);
  const stdXM = sampleStd(xVals);
  const stdYM = sampleStd(yVals);
  const stdAngleDeg = stdAngle(angleVals, meanAngleDeg);
  const stdXMm = stdXM * 1000;
  const stdYMm = stdYM * 1000;
  const meanAngleRad = (meanAngleDeg * Math.PI) / 180;
  const cosA = Math.cos(meanAngleRad);
  const sinA = Math.sin(meanAngleRad);

  const sequence: PtA[] = [];
  let currentX = meanX;
  let currentY = meanY;
  sequence.push({ x: roundTo(currentX, 6), y: roundTo(currentY, 6), angle: roundTo(meanAngleDeg, 4) });
  for (const segLength of normalizedSegments) {
    currentX += segLength * cosA;
    currentY += segLength * sinA;
    sequence.push({ x: roundTo(currentX, 6), y: roundTo(currentY, 6), angle: roundTo(meanAngleDeg, 4) });
  }

  return {
    fine_tuned: {
      mean_x: roundTo(meanX, 6),
      mean_y: roundTo(meanY, 6),
      mean_angle: roundTo(meanAngleDeg, 4),
      std_x_mm: roundTo(stdXMm, 4),
      std_y_mm: roundTo(stdYMm, 4),
      std_angle_deg: roundTo(stdAngleDeg, 4),
    },
    sequence,
  };
}

function computeBounds(all: Pt[], canvasSize: CanvasSize): Bounds {
  if (!all.length) return { minX: -1, maxX: 1, minY: -0.7, maxY: 0.7 };
  const xs = all.map(p => p.x), ys = all.map(p => p.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  let rangeX = maxX - minX, rangeY = maxY - minY;
  
  // Add padding
  if (rangeX < CONFIG.MIN_RANGE_THRESHOLD && rangeY < CONFIG.MIN_RANGE_THRESHOLD) {
    minX -= 1; maxX += 1; minY -= 1; maxY += 1;
    rangeX = 2; rangeY = 2;
  } else {
    const padX = Math.max(CONFIG.DEFAULT_PADDING, CONFIG.PADDING_RATIO * (rangeX || CONFIG.FALLBACK_RANGE));
    const padY = Math.max(CONFIG.DEFAULT_PADDING, CONFIG.PADDING_RATIO * (rangeY || CONFIG.FALLBACK_RANGE));
    minX -= padX; maxX += padX; minY -= padY; maxY += padY;
    rangeX = maxX - minX; rangeY = maxY - minY;
  }
  
  // Adjust bounds to maintain equal scale (square grid cells)
  const safeW = Math.max(canvasSize.w, 1);
  const safeH = Math.max(canvasSize.h, 1);
  const canvasAspect = safeW / safeH;
  const dataAspect = rangeX / rangeY;
  
  if (dataAspect > canvasAspect) {
    const newRangeY = rangeX / canvasAspect;
    const extraY = (newRangeY - rangeY) / 2;
    minY -= extraY;
    maxY += extraY;
  } else {
    const newRangeX = rangeY * canvasAspect;
    const extraX = (newRangeX - rangeX) / 2;
    minX -= extraX;
    maxX += extraX;
  }
  
  return { minX, maxX, minY, maxY };
}

// ==========================================
// UNIFIED COORDINATE SYSTEM
// All transforms go through a single transform object for consistency
// ==========================================

interface Transform {
  // World origin in screen coordinates (center point before pan)
  originX: number;
  originY: number;
  // Pixels per world unit (includes zoom)
  pixelsPerUnit: number;
  // Pan offset in screen coordinates
  panX: number;
  panY: number;
}

function createTransform(view: Viewport, zoom: number, pan: { x: number; y: number }): Transform {
  const rangeX = view.maxX - view.minX;
  const rangeY = view.maxY - view.minY;
  // Use the smaller scale to ensure uniform scaling
  const basePixelsPerUnitX = view.w / rangeX;
  const basePixelsPerUnitY = view.h / rangeY;
  const basePixelsPerUnit = Math.min(basePixelsPerUnitX, basePixelsPerUnitY);
  
  // Center of the data in world coordinates
  const worldCenterX = (view.minX + view.maxX) / 2;
  const worldCenterY = (view.minY + view.maxY) / 2;
  
  return {
    originX: view.w / 2 - worldCenterX * basePixelsPerUnit * zoom,
    originY: view.h / 2 + worldCenterY * basePixelsPerUnit * zoom,
    pixelsPerUnit: basePixelsPerUnit * zoom,
    panX: pan.x,
    panY: pan.y,
  };
}

function worldToScreen(t: Transform, x: number, y: number): { sx: number; sy: number } {
  return {
    sx: t.originX + x * t.pixelsPerUnit + t.panX,
    sy: t.originY - y * t.pixelsPerUnit + t.panY,
  };
}

function screenToWorld(t: Transform, sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - t.panX - t.originX) / t.pixelsPerUnit,
    y: -(sy - t.panY - t.originY) / t.pixelsPerUnit,
  };
}

function getVisibleWorldBounds(t: Transform, width: number, height: number, margin: number = 100): Bounds {
  const topLeft = screenToWorld(t, -margin, -margin);
  const bottomRight = screenToWorld(t, width + margin, height + margin);
  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

// Generate nice tick values for a given range
function generateNiceTicks(min: number, max: number, targetCount: number): number[] {
  const range = max - min;
  if (range <= 0 || !isFinite(range)) return [min, max];
  
  const rawStep = range / Math.max(targetCount, 1);
  const exp = Math.floor(Math.log10(rawStep));
  const frac = rawStep / Math.pow(10, exp);
  
  let niceFrac = 1;
  if (frac >= 1.5 && frac < 3) niceFrac = 2;
  else if (frac >= 3 && frac < 7) niceFrac = 5;
  else if (frac >= 7) niceFrac = 10;
  
  const step = niceFrac * Math.pow(10, exp);
  if (!isFinite(step) || step <= 0) return [min, max];
  
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  const maxTicks = 50;
  
  for (let t = start; t <= max + step * 0.5 && ticks.length < maxTicks; t += step) {
    if (t >= min - step * 0.5) {
      ticks.push(t);
    }
  }
  
  return ticks.length >= 2 ? ticks : [min, max];
}

// Format tick label based on the step size
function formatTickLabel(value: number, step: number): string {
  if (!isFinite(value)) return "0";
  const absStep = Math.abs(step);
  let decimals = 0;
  if (absStep < 0.001) decimals = 4;
  else if (absStep < 0.01) decimals = 3;
  else if (absStep < 0.1) decimals = 2;
  else if (absStep < 1) decimals = 1;
  const s = value.toFixed(decimals).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

function calculateCustomPointPositions(customPoints: CustomPoint[], sequence: PtA[] | null, fineTuned: Fine | null): ComputedCustomPoint[] {
  if (!fineTuned || !sequence || sequence.length === 0) return [];
  return customPoints.map(cp => {
    const refIndex = Math.min(Math.max(0, cp.referenceIndex), sequence.length - 1);
    const refPoint = sequence[refIndex];
    const { ux, uy } = unitFromAngleDeg(fineTuned.mean_angle);
    const distM = (parseFloatSafe(cp.distanceMm) ?? 0) / 1000;
    const sign = cp.flipped ? -1 : 1;
    return { x: refPoint.x + ux * distM * sign, y: refPoint.y + uy * distM * sign, angle: refPoint.angle, customId: cp.id, name: cp.name || `Custom ${cp.id.slice(-4)}` };
  });
}

function saveToLocalStorage(runs: SavedRun[]): SavedRun[] {
  try {
    const limitedRuns = runs.slice(0, CONFIG.MAX_SAVED_RUNS);
    const serialized = JSON.stringify(limitedRuns);
    if (serialized.length > CONFIG.STORAGE_WARNING_SIZE) {
      const pruned = limitedRuns.slice(0, 30);
      localStorage.setItem(CONFIG.LOCALSTORAGE_KEY, JSON.stringify(pruned));
      return pruned;
    }
    localStorage.setItem(CONFIG.LOCALSTORAGE_KEY, serialized);
    return limitedRuns;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      const emergency = runs.slice(0, 10);
      try { localStorage.setItem(CONFIG.LOCALSTORAGE_KEY, JSON.stringify(emergency)); return emergency; }
      catch { return runs; }
    }
    throw e;
  }
}

// ==========================================
// 5. EXTRACTED COMPONENTS (with Accessibility)
// ==========================================

const ScreenReaderAnnouncer = memo(function ScreenReaderAnnouncer({ message }: { message: string }) {
  return <div aria-live="polite" aria-atomic="true" style={S.srOnly as CSSProperties}>{message}</div>;
});

// --- 5.1 PointInputPanel ---
interface PointInputPanelProps {
  points: PointInput[];
  segments: string[];
  error: string | null;
  isLoading: boolean;
  hasResults: boolean;
  onPointsChange: (points: PointInput[]) => void;
  onSegmentsChange: (segments: string[]) => void;
  onCompute: () => void;
  onClear: () => void;
  onSave: () => void;
  announce: (message: string) => void;
}

const PointInputPanel = memo(function PointInputPanel({ points, segments, error, isLoading, hasResults, onPointsChange, onSegmentsChange, onCompute, onClear, onSave, announce }: PointInputPanelProps) {
  const errorId = useId();
  const sectionId = useId();
  
  const handleAddPoint = useCallback(() => {
    if (points.length >= CONFIG.MAX_POINTS) {
      announce(`Maximum ${CONFIG.MAX_POINTS} points reached`);
      return;
    }
    onPointsChange([...points, { x: "", y: "", angle: "" }]);
    announce(`Point ${points.length + 1} added`);
  }, [points, onPointsChange, announce]);
  
  const handleRemovePoint = useCallback((index: number) => {
    onPointsChange(points.filter((_, idx) => idx !== index));
    announce(`Point ${index + 1} removed`);
  }, [points, onPointsChange, announce]);
  
  const handlePointFieldChange = useCallback((index: number, field: keyof PointInput, value: string) => {
    onPointsChange(points.map((pt, idx) => idx === index ? { ...pt, [field]: value } : pt));
  }, [points, onPointsChange]);
  
  const handleSegmentChange = useCallback((index: number, value: string) => {
    const newSegments = [...segments]; newSegments[index] = value; onSegmentsChange(newSegments);
  }, [segments, onSegmentsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onCompute(); }
  }, [onCompute]);

  const maxPointsReached = points.length >= CONFIG.MAX_POINTS;

  return (
    <section aria-labelledby={sectionId} onKeyDown={handleKeyDown}>
      <h2 id={sectionId} style={S.sectionTitle}>Input Points</h2>
      {error && <div id={errorId} role="alert" style={S.errorBox}><span aria-hidden="true">⚠</span><span>{error}</span></div>}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <button onClick={handleAddPoint} style={{ ...btnStyle('secondary'), opacity: maxPointsReached ? 0.5 : 1, cursor: maxPointsReached ? 'not-allowed' : 'pointer' }} aria-label="Add new input point" disabled={maxPointsReached} aria-disabled={maxPointsReached}>+ Add Point</button>
        <span style={{ fontSize: 11, color: COLORS.text }}>Max {CONFIG.MAX_POINTS}</span>
      </div>
      <div role="list" aria-label="Input points list" style={{ display: "grid", gap: 10 }}>
        {points.map((p, i) => <PointInputRow key={i} index={i} point={p} onFieldChange={handlePointFieldChange} onRemove={handleRemovePoint} totalPoints={points.length} />)}
      </div>
      {segments.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ ...S.sectionTitle, fontSize: 13 }}>Segments</h3>
          <p id="segments-desc" style={{ ...S.subLabel, marginBottom: 8 }}>Distance from {getPointInfo(0).label} to each point</p>
          <div role="list" aria-describedby="segments-desc" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
            {segments.map((s, i) => <SegmentInput key={i} index={i} value={s} onChange={handleSegmentChange} />)}
          </div>
        </div>
      )}
      <div role="group" aria-label="Actions" style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <button onClick={onCompute} style={{ ...btnStyle('primary'), opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }} disabled={isLoading} aria-busy={isLoading} aria-describedby={error ? errorId : undefined} title="Ctrl+Enter">
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
        <button onClick={onClear} style={btnStyle('secondary')} aria-label="Clear all input data">Clear</button>
        <button onClick={onSave} style={{ ...btnStyle('secondary'), opacity: hasResults ? 1 : 0.4 }} disabled={!hasResults} aria-label="Save current results" aria-disabled={!hasResults}>Save</button>
      </div>
      <p style={{ ...S.subLabel, marginTop: 8, fontSize: 10, opacity: 0.7 }}>
        <kbd style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3, fontSize: 10, border: "1px solid #e2e8f0" }}>Ctrl</kbd>+<kbd style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3, fontSize: 10, border: "1px solid #e2e8f0" }}>Enter</kbd> to generate
      </p>
    </section>
  );
});

interface PointInputRowProps { index: number; point: PointInput; onFieldChange: (index: number, field: keyof PointInput, value: string) => void; onRemove: (index: number) => void; totalPoints: number; }

const PointInputRow = memo(function PointInputRow({ index, point, onFieldChange, onRemove, totalPoints }: PointInputRowProps) {
  const rowId = useId();
  const handleChange = useCallback((field: keyof PointInput) => (e: React.ChangeEvent<HTMLInputElement>) => onFieldChange(index, field, e.target.value), [index, onFieldChange]);
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <div role="listitem" aria-label={`Point ${index + 1} of ${totalPoints}`} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr auto", gap: 8, alignItems: "center", padding: "8px 10px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
      <div aria-hidden="true" style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textAlign: "center" }}>{index + 1}</div>
      <div><label htmlFor={`${rowId}-x`} style={S.srOnly as CSSProperties}>X coordinate for point {index + 1}</label><input id={`${rowId}-x`} style={S.input} placeholder="X (m)" value={point.x} onChange={handleChange('x')} inputMode="decimal" /></div>
      <div><label htmlFor={`${rowId}-y`} style={S.srOnly as CSSProperties}>Y coordinate for point {index + 1}</label><input id={`${rowId}-y`} style={S.input} placeholder="Y (m)" value={point.y} onChange={handleChange('y')} inputMode="decimal" /></div>
      <div><label htmlFor={`${rowId}-angle`} style={S.srOnly as CSSProperties}>Angle for point {index + 1}</label><input id={`${rowId}-angle`} style={S.input} placeholder="Angle (°)" value={point.angle} onChange={handleChange('angle')} inputMode="decimal" /></div>
      <button onClick={handleRemove} style={{ ...btnStyle('danger'), padding: "4px 8px" }} aria-label={`Remove point ${index + 1}`}>×</button>
    </div>
  );
});

interface SegmentInputProps { index: number; value: string; onChange: (index: number, value: string) => void; }

const SegmentInput = memo(function SegmentInput({ index, value, onChange }: SegmentInputProps) {
  const inputId = useId();
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onChange(index, e.target.value), [index, onChange]);
  const segmentLabel = String.fromCharCode(65 + index);

  return (
    <div role="listitem" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "#f8fafc", borderRadius: 5, border: "1px solid #f1f5f9" }}>
      <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 600, color: COLORS.primary, minWidth: 18 }}>{segmentLabel}</label>
      <input id={inputId} style={{ ...S.inputFull, padding: "6px 8px", fontSize: 13 }} placeholder="0.0" value={value} onChange={handleChange} aria-label={`Segment ${segmentLabel} distance in meters`} inputMode="decimal" />
      <span aria-hidden="true" style={{ fontSize: 11, color: "#9ca3af" }}>m</span>
    </div>
  );
});

// --- 5.2 CustomPointsEditor ---
interface CustomPointsEditorProps { customPoints: CustomPoint[]; sequence: PtA[]; onChange: (points: CustomPoint[]) => void; announce: (message: string) => void; }

const CustomPointsEditor = memo(function CustomPointsEditor({ customPoints, sequence, onChange, announce }: CustomPointsEditorProps) {
  const sectionId = useId();
  const handleAdd = useCallback(() => { onChange([...customPoints, { id: Math.random().toString(36).substr(2, 9), name: `Custom ${customPoints.length + 1}`, referenceIndex: 0, distanceMm: "", flipped: false }]); announce(`Custom point ${customPoints.length + 1} added`); }, [customPoints, onChange, announce]);
  const handleUpdate = useCallback((id: string, updates: Partial<CustomPoint>) => onChange(customPoints.map(cp => cp.id === id ? { ...cp, ...updates } : cp)), [customPoints, onChange]);
  const handleDelete = useCallback((id: string) => { const idx = customPoints.findIndex(cp => cp.id === id); onChange(customPoints.filter(cp => cp.id !== id)); announce(`Custom point ${idx + 1} deleted`); }, [customPoints, onChange, announce]);

  if (!sequence || sequence.length === 0) return null;

  return (
    <section aria-labelledby={sectionId} style={{ marginTop: 20, padding: 12, border: "1px solid #fdba74", background: "#fffbeb", borderRadius: 6 }}>
      <h2 id={sectionId} style={{ ...S.sectionTitle, color: "#c2410c", marginBottom: 6 }}>Custom Points</h2>
      <p style={{ ...S.subLabel, marginBottom: 10 }}>Add points relative to generated sequence</p>
      <button onClick={handleAdd} style={{ ...btnStyle('secondary'), background: "#fff", borderColor: "#fdba74", color: "#c2410c", marginBottom: 10 }} aria-label="Add new custom point">+ Add Custom</button>
      <div role="list" aria-label="Custom points list" style={{ display: "grid", gap: 8 }}>
        {customPoints.map((cp, idx) => <CustomPointRow key={cp.id} point={cp} sequence={sequence} index={idx} totalPoints={customPoints.length} onUpdate={updates => handleUpdate(cp.id, updates)} onDelete={() => handleDelete(cp.id)} />)}
      </div>
    </section>
  );
});

const CustomPointRow = memo(function CustomPointRow({ point, sequence, index, totalPoints, onUpdate, onDelete }: { point: CustomPoint; sequence: PtA[]; index: number; totalPoints: number; onUpdate: (u: Partial<CustomPoint>) => void; onDelete: () => void }) {
  const rowId = useId();
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ name: e.target.value }), [onUpdate]);
  const handleRefChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => onUpdate({ referenceIndex: parseInt(e.target.value) }), [onUpdate]);
  const handleDistChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ distanceMm: e.target.value }), [onUpdate]);
  const handleFlip = useCallback(() => onUpdate({ flipped: !point.flipped }), [point.flipped, onUpdate]);

  return (
    <div role="listitem" aria-label={`Custom point ${index + 1} of ${totalPoints}: ${point.name}`} style={{ background: "#fff", borderRadius: 5, padding: 10, border: "1px solid #fdba74" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <label htmlFor={`${rowId}-name`} style={S.srOnly as CSSProperties}>Custom point name</label>
        <input id={`${rowId}-name`} style={{ ...S.inputFull, fontSize: 13 }} value={point.name} onChange={handleNameChange} placeholder="Name" />
        <button onClick={onDelete} style={{ ...btnStyle('danger'), padding: "4px 8px" }} aria-label={`Delete custom point ${point.name}`}>×</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <label htmlFor={`${rowId}-ref`} style={S.srOnly as CSSProperties}>Reference point</label>
          <select id={`${rowId}-ref`} style={{ ...S.inputFull, padding: "6px 8px", fontSize: 12 }} value={point.referenceIndex} onChange={handleRefChange} aria-label="Reference point">{sequence.map((_, idx) => <option key={idx} value={idx}>{getPointInfo(idx).label}</option>)}</select>
        </div>
        <div style={{ width: 70, flexShrink: 0 }}>
          <label htmlFor={`${rowId}-dist`} style={S.srOnly as CSSProperties}>Distance in mm</label>
          <input id={`${rowId}-dist`} style={{ ...S.inputFull, width: "100%", fontSize: 12 }} placeholder="mm" value={point.distanceMm} onChange={handleDistChange} inputMode="decimal" />
        </div>
        <button onClick={handleFlip} title={point.flipped ? "Reversed" : "Forward"} aria-label={`Flip direction`} aria-pressed={point.flipped} style={{ ...btnStyle('secondary'), padding: 0, width: 32, height: 32, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", background: point.flipped ? "#fef2f2" : "#f8fafc", borderColor: point.flipped ? "#fecaca" : "#e2e8f0", color: point.flipped ? COLORS.danger : "#64748b" }}><FlipIcon /></button>
      </div>
    </div>
  );
});

// --- 5.3 ResultsTables ---
interface ResultsTablesProps { sequence: PtA[] | null; computedCustomPoints: ComputedCustomPoint[]; fineTuned: Fine | null; }

const ResultsTables = memo(function ResultsTables({ sequence, computedCustomPoints, fineTuned }: ResultsTablesProps) {
  const tableId = useId();
  const stdTableId = useId();
  const sequenceRows = useMemo(() => sequence?.map((p, i) => {
    const info = getPointInfo(i);
    return <tr key={i} style={{ color: info.color }}><td style={S.td}>{info.label}</td><td style={S.td}>{fmt3(p.x)}</td><td style={S.td}>{fmt3(p.y)}</td><td style={S.td}>{fmt3(p.angle)}</td></tr>;
  }), [sequence]);
  const customRows = useMemo(() => computedCustomPoints.map(cp => (
    <tr key={cp.customId} style={{ color: COLORS.custom, fontWeight: 500, background: "#fffbeb" }}>
      <td style={S.td}>{cp.name}</td><td style={S.td}>{fmt3(cp.x)}</td><td style={S.td}>{fmt3(cp.y)}</td><td style={S.td}>{fmt3(cp.angle)}</td>
    </tr>
  )), [computedCustomPoints]);

  if (!sequence && !fineTuned) {
    return (
      <div style={{ marginTop: 24, padding: 16, background: "#f8fafc", borderRadius: 6, textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#9ca3af" }}>No data generated yet</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h2 id={tableId} style={S.sectionTitle}>Generated Points</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table} aria-labelledby={tableId}>
          <thead><tr><th scope="col" style={S.th}>Name</th><th scope="col" style={S.th}>X (m)</th><th scope="col" style={S.th}>Y (m)</th><th scope="col" style={S.th}>Angle (°)</th></tr></thead>
          <tbody>{sequenceRows}{customRows}</tbody>
        </table>
      </div>
      {fineTuned && (
        <div style={{ marginTop: 16 }}>
          <h2 id={stdTableId} style={S.sectionTitle}>Standard Deviations</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ background: "#f8fafc", borderRadius: 5, padding: "8px 12px", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em" }}>X</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt3(fineTuned.std_x_mm)} mm</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 5, padding: "8px 12px", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em" }}>Y</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt3(fineTuned.std_y_mm)} mm</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 5, padding: "8px 12px", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.03em" }}>Angle</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt3(fineTuned.std_angle_deg)}°</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// --- 5.4 VisualizationCanvas ---
interface VisualizationCanvasProps {
  view: Viewport;
  zoom: number;
  pan: { x: number; y: number };
  rawPoints: ValidatedPoint[];
  sequence: PtA[] | null;
  computedCustomPoints: ComputedCustomPoint[];
  savedRuns: SavedRun[];
  axisLine: { start: Pt; end: Pt; normalEnd: Pt } | null;
  onZoom: (factor: number, screenX: number, screenY: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onCenter: () => void;
  onResize: (size: CanvasSize) => void;
}

const VisualizationCanvas = memo(function VisualizationCanvas({
  view, zoom, pan, rawPoints, sequence, computedCustomPoints, savedRuns, axisLine,
  onZoom, onPanChange, onCenter, onResize
}: VisualizationCanvasProps) {
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ screenX: number; screenY: number; panX: number; panY: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasId = useId();

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(320, Math.round(rect.width));
      const h = Math.max(240, Math.round(rect.height));
      onResize({ w, h });
    };
    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [onResize]);

  // Create unified transform
  const transform = useMemo(() => createTransform(view, zoom, pan), [view, zoom, pan]);
  
  // Calculate visible world bounds for tick generation
  const visibleBounds = useMemo(
    () => getVisibleWorldBounds(transform, view.w, view.h, 50),
    [transform, view.w, view.h]
  );
  
  // Generate ticks with consistent step for square grid
  const { xticks, yticks, tickStep } = useMemo(() => {
    const rangeX = visibleBounds.maxX - visibleBounds.minX;
    const rangeY = visibleBounds.maxY - visibleBounds.minY;
    const maxRange = Math.max(rangeX, rangeY);
    const targetTicks = Math.max(5, Math.min(12, Math.floor(Math.min(view.w, view.h) / CONFIG.TICK_SPACING_PX)));
    
    // Calculate step based on visible range
    const rawStep = maxRange / targetTicks;
    const exp = Math.floor(Math.log10(rawStep));
    const frac = rawStep / Math.pow(10, exp);
    let niceFrac = 1;
    if (frac >= 1.5 && frac < 3) niceFrac = 2;
    else if (frac >= 3 && frac < 7) niceFrac = 5;
    else if (frac >= 7) niceFrac = 10;
    const step = niceFrac * Math.pow(10, exp);
    
    if (!isFinite(step) || step <= 0) {
      return {
        xticks: [visibleBounds.minX, visibleBounds.maxX],
        yticks: [visibleBounds.minY, visibleBounds.maxY],
        tickStep: 1
      };
    }
    
    const genTicks = (min: number, max: number) => {
      const start = Math.floor((min - step) / step) * step;
      const ticks: number[] = [];
      for (let t = start; t <= max + step && ticks.length < 40; t += step) {
        ticks.push(t);
      }
      return ticks;
    };
    
    return {
      xticks: genTicks(visibleBounds.minX, visibleBounds.maxX),
      yticks: genTicks(visibleBounds.minY, visibleBounds.maxY),
      tickStep: step
    };
  }, [visibleBounds, view.w, view.h]);

  // Convert client coordinates to SVG viewBox coordinates
  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * view.w,
      y: ((clientY - rect.top) / rect.height) * view.h
    };
  }, [view.w, view.h]);

  // Wheel handler with passive:false to prevent page scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const svgCoords = clientToSvg(e.clientX, e.clientY);
      if (!svgCoords) return;
      
      // Normalize delta across browsers and input devices
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = delta < 0 ? CONFIG.ZOOM_FACTOR : 1 / CONFIG.ZOOM_FACTOR;
      
      onZoom(factor, svgCoords.x, svgCoords.y);
    };
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [clientToSvg, onZoom]);

  // Mouse drag for panning
  useEffect(() => {
    if (!dragging) return;
    
    const handleMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      
      const rect = svg.getBoundingClientRect();
      const currentScreenX = ((e.clientX - rect.left) / rect.width) * view.w;
      const currentScreenY = ((e.clientY - rect.top) / rect.height) * view.h;
      
      const dx = currentScreenX - dragStartRef.current.screenX;
      const dy = currentScreenY - dragStartRef.current.screenY;
      
      onPanChange({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    };
    
    const handleUp = () => {
      setDragging(false);
      dragStartRef.current = null;
    };
    
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, view.w, view.h, onPanChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const svgCoords = clientToSvg(e.clientX, e.clientY);
    if (!svgCoords) return;
    
    dragStartRef.current = {
      screenX: svgCoords.x,
      screenY: svgCoords.y,
      panX: pan.x,
      panY: pan.y
    };
    setDragging(true);
  }, [clientToSvg, pan]);

  const showTip = useCallback((text: string, clientX: number, clientY: number) => {
    if (tipRef.current) {
      tipRef.current.style.display = "block";
      tipRef.current.style.left = `${clientX + CONFIG.TOOLTIP_OFFSET_X}px`;
      tipRef.current.style.top = `${clientY + CONFIG.TOOLTIP_OFFSET_Y}px`;
      tipRef.current.textContent = text;
    }
  }, []);
  
  const hideTip = useCallback(() => {
    if (tipRef.current) tipRef.current.style.display = "none";
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = CONFIG.KEYBOARD_PAN_STEP;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); onPanChange({ x: pan.x, y: pan.y + step }); break;
      case 'ArrowDown': e.preventDefault(); onPanChange({ x: pan.x, y: pan.y - step }); break;
      case 'ArrowLeft': e.preventDefault(); onPanChange({ x: pan.x + step, y: pan.y }); break;
      case 'ArrowRight': e.preventDefault(); onPanChange({ x: pan.x - step, y: pan.y }); break;
      case '+': case '=': e.preventDefault(); onZoom(CONFIG.ZOOM_FACTOR, view.w / 2, view.h / 2); break;
      case '-': case '_': e.preventDefault(); onZoom(1 / CONFIG.ZOOM_FACTOR, view.w / 2, view.h / 2); break;
      case '0': case 'Home': e.preventDefault(); onCenter(); break;
    }
  }, [pan, onPanChange, onZoom, onCenter, view.w, view.h]);

  const visibleSavedRuns = useMemo(() => savedRuns.filter(r => r.visible), [savedRuns]);
  const pointCount = (sequence?.length ?? 0) + computedCustomPoints.length + rawPoints.filter(p => p.valid).length;

  // Wrapper function for worldToScreen using our transform
  const wts = useCallback((x: number, y: number) => worldToScreen(transform, x, y), [transform]);

  return (
    <>
      <Legend hasCustomPoints={computedCustomPoints.length > 0} />
      <div ref={containerRef} style={S.canvasContainer as CSSProperties}>
        <div ref={tipRef} role="tooltip" style={S.tooltip} />
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${view.w} ${view.h}`}
          preserveAspectRatio="none"
          style={{
            background: "#fafafa",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            touchAction: "none",
            cursor: dragging ? "grabbing" : "grab",
            display: "block"
          }}
          onMouseDown={handleMouseDown}
          onMouseLeave={hideTip}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="img"
          aria-label="Visualization canvas. Use arrow keys to pan, plus/minus to zoom, 0 to fit."
          aria-describedby={canvasId}
        >
          <title id={canvasId}>Robot fine-tuning visualization</title>
          <GridLines xticks={xticks} yticks={yticks} tickStep={tickStep} worldToScreen={wts} width={view.w} height={view.h} />
          {axisLine && <AxisLineRenderer axisLine={axisLine} worldToScreen={wts} />}
          <PointsLayer rawPoints={rawPoints} sequence={sequence} computedCustomPoints={computedCustomPoints} savedRuns={visibleSavedRuns} worldToScreen={wts} showTip={showTip} hideTip={hideTip} />
        </svg>
        <button onClick={onCenter} style={S.centerBtn} aria-label="Fit view to data">Fit to data</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: COLORS.text, textAlign: "center", opacity: 0.7 }} aria-live="polite">
        {(zoom * 100).toFixed(0)}% · Scroll to zoom · Drag to pan
      </div>
    </>
  );
});

const Legend = memo(function Legend({ hasCustomPoints }: { hasCustomPoints: boolean }) {
  return (
    <div role="list" aria-label="Point type legend" style={{ display: "flex", gap: 14, fontSize: 12, color: "#6b7280", marginBottom: 10, flexWrap: "wrap" }}>
      <span role="listitem"><span style={legendDot(COLORS.raw)} aria-hidden="true" />Input</span>
      {POINT_TYPES.map(pt => <span key={pt.key} role="listitem"><span style={legendDot(pt.color)} aria-hidden="true" />{pt.shortLabel}</span>)}
      {hasCustomPoints && <span role="listitem"><span style={legendDot(COLORS.custom)} aria-hidden="true" />Custom</span>}
    </div>
  );
});

interface GridLinesProps {
  xticks: number[];
  yticks: number[];
  tickStep: number;
  worldToScreen: (x: number, y: number) => { sx: number; sy: number };
  width: number;
  height: number;
}

const GridLines = memo(function GridLines({ xticks, yticks, tickStep, worldToScreen, width, height }: GridLinesProps) {
  const xLines = useMemo(() => xticks.map((v, i) => {
    const p = worldToScreen(v, 0);
    if (p.sx < -100 || p.sx > width + 100) return null;
    const isVisible = p.sx >= 0 && p.sx <= width;
    return (
      <React.Fragment key={`x${i}`}>
        <line x1={p.sx} y1={0} x2={p.sx} y2={height} stroke={COLORS.grid} strokeWidth={1} aria-hidden="true" />
        {isVisible && (
          <text x={p.sx + 4} y={height - 8} fontSize={10} fill={COLORS.text} aria-hidden="true">
            {formatTickLabel(v, tickStep)}
          </text>
        )}
      </React.Fragment>
    );
  }).filter(Boolean), [xticks, tickStep, worldToScreen, width, height]);
  
  const yLines = useMemo(() => yticks.map((v, i) => {
    const p = worldToScreen(0, v);
    if (p.sy < -100 || p.sy > height + 100) return null;
    const isVisible = p.sy >= 0 && p.sy <= height;
    return (
      <React.Fragment key={`y${i}`}>
        <line x1={0} y1={p.sy} x2={width} y2={p.sy} stroke={COLORS.grid} strokeWidth={1} aria-hidden="true" />
        {isVisible && (
          <text x={6} y={p.sy - 4} fontSize={10} fill={COLORS.text} aria-hidden="true">
            {formatTickLabel(v, tickStep)}
          </text>
        )}
      </React.Fragment>
    );
  }).filter(Boolean), [yticks, tickStep, worldToScreen, width, height]);
  
  return <g role="presentation">{xLines}{yLines}</g>;
});

const AxisLineRenderer = memo(function AxisLineRenderer({ axisLine, worldToScreen }: { axisLine: { start: Pt; end: Pt; normalEnd: Pt }; worldToScreen: (x: number, y: number) => { sx: number; sy: number } }) {
  const s = worldToScreen(axisLine.start.x, axisLine.start.y), ne = worldToScreen(axisLine.normalEnd.x, axisLine.normalEnd.y), e = worldToScreen(axisLine.end.x, axisLine.end.y);
  return (
    <g aria-label="Mean axis line">
      <line x1={s.sx} y1={s.sy} x2={ne.sx} y2={ne.sy} stroke={COLORS.axis} strokeWidth={CONFIG.STROKE_WIDTH_AXIS} strokeDasharray="6 6" />
      {(axisLine.end.x !== axisLine.normalEnd.x || axisLine.end.y !== axisLine.normalEnd.y) && <line x1={ne.sx} y1={ne.sy} x2={e.sx} y2={e.sy} stroke={COLORS.axis} strokeWidth={CONFIG.STROKE_WIDTH_AXIS} strokeDasharray="2 4" opacity={0.5} />}
    </g>
  );
});

const PointsLayer = memo(function PointsLayer({ rawPoints, sequence, computedCustomPoints, savedRuns, worldToScreen, showTip, hideTip }: { rawPoints: ValidatedPoint[]; sequence: PtA[] | null; computedCustomPoints: ComputedCustomPoint[]; savedRuns: SavedRun[]; worldToScreen: (x: number, y: number) => { sx: number; sy: number }; showTip: (t: string, x: number, y: number) => void; hideTip: () => void }) {
  const validRawPts = useMemo(() => rawPoints.filter(p => p.valid), [rawPoints]);
  const rawPointElements = useMemo(() => validRawPts.map((p, i) => { const { sx, sy } = worldToScreen(p.x, p.y); return <circle key={`r${i}`} cx={sx} cy={sy} r={CONFIG.POINT_RADIUS_INPUT} fill={sequence ? COLORS.raw : COLORS.rawPreview} stroke={sequence ? "none" : COLORS.raw} strokeWidth={sequence ? 0 : 1} strokeDasharray={sequence ? "0" : "3 3"} opacity={sequence ? 1 : 0.5} onMouseMove={e => showTip(`Input P${i + 1}\nx: ${fmt3(p.x)}\ny: ${fmt3(p.y)}`, e.clientX, e.clientY)} onMouseLeave={hideTip} aria-label={`Input point ${i + 1}`} role="img" />; }), [validRawPts, sequence, worldToScreen, showTip, hideTip]);
  const previewLines = useMemo(() => { if (sequence || validRawPts.length <= 1) return null; return validRawPts.slice(0, -1).map((p, i) => { const p1 = worldToScreen(p.x, p.y), p2 = worldToScreen(validRawPts[i + 1].x, validRawPts[i + 1].y); return <line key={`preview${i}`} x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy} stroke={COLORS.rawPreview} strokeDasharray="4 4" aria-hidden="true" />; }); }, [sequence, validRawPts, worldToScreen]);
  const sequenceElements = useMemo(() => sequence?.map((p, i) => { const { sx, sy } = worldToScreen(p.x, p.y); const info = getPointInfo(i); return <circle key={`s${i}`} cx={sx} cy={sy} r={CONFIG.POINT_RADIUS_GENERATED} fill={info.color} stroke="#fff" strokeWidth={CONFIG.STROKE_WIDTH_POINT} onMouseMove={e => showTip(`${info.label}\nx: ${fmt3(p.x)}\ny: ${fmt3(p.y)}`, e.clientX, e.clientY)} onMouseLeave={hideTip} aria-label={info.label} role="img" />; }), [sequence, worldToScreen, showTip, hideTip]);
  const segmentLabels = useMemo(() => sequence?.slice(0, -1).map((p, i) => { const p2 = sequence[i + 1]; const { sx, sy } = worldToScreen((p.x + p2.x) / 2, (p.y + p2.y) / 2); return <g key={`lbl${i}`} aria-label={`Segment ${String.fromCharCode(65 + i)}`}><circle cx={sx} cy={sy} r={CONFIG.SEGMENT_LABEL_RADIUS} fill={COLORS.primary} opacity={0.9} /><text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold" fill="white" aria-hidden="true">{String.fromCharCode(65 + i)}</text></g>; }), [sequence, worldToScreen]);
  const customElements = useMemo(() => computedCustomPoints.map(cp => { const { sx, sy } = worldToScreen(cp.x, cp.y); return <circle key={cp.customId} cx={sx} cy={sy} r={CONFIG.POINT_RADIUS_GENERATED} fill={COLORS.custom} stroke="#fff" strokeWidth={CONFIG.STROKE_WIDTH_POINT} onMouseMove={e => showTip(`${cp.name}\nx: ${fmt3(cp.x)}\ny: ${fmt3(cp.y)}`, e.clientX, e.clientY)} onMouseLeave={hideTip} aria-label={cp.name} role="img" />; }), [computedCustomPoints, worldToScreen, showTip, hideTip]);
  const savedElements = useMemo(() => savedRuns.map(r => (<g key={r.id} opacity={0.5} aria-label={`Saved run: ${r.name}`}>{r.seq.map((p, i) => { const { sx, sy } = worldToScreen(p.x, p.y); return <circle key={i} cx={sx} cy={sy} r={CONFIG.POINT_RADIUS_INPUT} fill={getPointInfo(i).color} stroke="#fff" />; })}{r.seq.slice(0, -1).map((p, i) => { const p2 = r.seq[i + 1]; const s1 = worldToScreen(p.x, p.y), s2 = worldToScreen(p2.x, p2.y); return <line key={`sl${i}`} x1={s1.sx} y1={s1.sy} x2={s2.sx} y2={s2.sy} stroke={COLORS.savedOverlay} strokeDasharray="3 3" />; })}</g>)), [savedRuns, worldToScreen]);
  return <g role="group" aria-label="Data points">{rawPointElements}{previewLines}{sequenceElements}{segmentLabels}{customElements}{savedElements}</g>;
});

// --- 5.5 SavedRunsManager ---
interface SavedRunsManagerProps { savedRuns: SavedRun[]; onUpdate: (runs: SavedRun[]) => void; announce: (message: string) => void; }

const SavedRunsManager = memo(function SavedRunsManager({ savedRuns, onUpdate, announce }: SavedRunsManagerProps) {
  const sectionId = useId();
  const handleToggle = useCallback((id: string) => { const run = savedRuns.find(r => r.id === id); onUpdate(savedRuns.map(r => r.id === id ? { ...r, visible: !r.visible } : r)); if (run) announce(`${run.name} ${run.visible ? 'hidden' : 'shown'}`); }, [savedRuns, onUpdate, announce]);
  const handleRename = useCallback((id: string) => { const run = savedRuns.find(r => r.id === id); if (!run) return; const n = window.prompt("Rename:", run.name); if (n) { onUpdate(savedRuns.map(r => r.id === id ? { ...r, name: n } : r)); announce(`Renamed to ${n}`); } }, [savedRuns, onUpdate, announce]);
  const handleDelete = useCallback((id: string) => { const run = savedRuns.find(r => r.id === id); if (run && window.confirm(`Delete "${run.name}"?`)) { onUpdate(savedRuns.filter(r => r.id !== id)); announce(`${run.name} deleted`); } }, [savedRuns, onUpdate, announce]);

  return (
    <section aria-labelledby={sectionId} style={{ marginTop: 20 }}>
      <h2 id={sectionId} style={S.sectionTitle}>Saved Point Data</h2>
      {savedRuns.length === 0 ? (
        <p style={{ fontSize: 11, color: "#9ca3af", padding: 12, background: "#f8fafc", borderRadius: 5, textAlign: "center", border: "1px solid #f1f5f9" }}>
          No saved data yet
        </p>
      ) : (
        <div role="list" aria-label={`${savedRuns.length} saved runs`} style={{ display: "grid", gap: 8 }}>
          {savedRuns.map((r, idx) => <SavedRunCard key={r.id} run={r} index={idx} total={savedRuns.length} onToggle={handleToggle} onRename={handleRename} onDelete={handleDelete} />)}
        </div>
      )}
    </section>
  );
});

interface SavedRunCardProps { run: SavedRun; index: number; total: number; onToggle: (id: string) => void; onRename: (id: string) => void; onDelete: (id: string) => void; }

const SavedRunCard = memo(function SavedRunCard({ run, index, total, onToggle, onRename, onDelete }: SavedRunCardProps) {
  const checkboxId = useId();
  const handleToggle = useCallback(() => onToggle(run.id), [run.id, onToggle]);
  const handleRename = useCallback(() => onRename(run.id), [run.id, onRename]);
  const handleDelete = useCallback(() => onDelete(run.id), [run.id, onDelete]);
  const [expanded, setExpanded] = useState(false);

  return (
    <article role="listitem" aria-label={`Saved run ${index + 1} of ${total}: ${run.name}`} style={{ border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: expanded ? "1px solid #f1f5f9" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "#9ca3af" }}>{expanded ? "▼" : "▶"}</button>
          <h3 style={{ fontWeight: 500, margin: 0, fontSize: 13 }}>{run.name}</h3>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#6b7280" }}>
            <input id={checkboxId} type="checkbox" checked={!!run.visible} onChange={handleToggle} style={{ width: 14, height: 14 }} />
            <span>Show</span>
          </label>
          <button onClick={handleRename} style={{ ...btnStyle('secondary'), padding: "3px 8px", fontSize: 11 }} aria-label={`Rename ${run.name}`}>Rename</button>
          <button onClick={handleDelete} style={{ ...btnStyle('danger'), padding: "3px 8px" }} aria-label={`Delete ${run.name}`}>×</button>
        </div>
      </div>
      {expanded && <div style={{ padding: 10 }}><SavedTabs run={run} /></div>}
    </article>
  );
});

const SavedTabs = memo(function SavedTabs({ run }: { run: SavedRun }) {
  const [tab, setTab] = useState<"gen" | "sd">("gen");
  const tabListId = useId();
  const genRows = useMemo(() => run.seq.map((p, i) => {
    const info = getPointInfo(i);
    return <tr key={i} style={{ color: info.color }}><td style={S.td}>{info.shortLabel}</td><td style={S.td}>{fmt3(p.x)}</td><td style={S.td}>{fmt3(p.y)}</td><td style={S.td}>{fmt3(p.angle)}</td></tr>;
  }), [run.seq]);

  return (
    <div>
      <div role="tablist" aria-label="Data views" style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {(['gen', 'sd'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            aria-controls={`${tabListId}-panel-${t}`}
            id={`${tabListId}-tab-${t}`}
            onClick={() => setTab(t)}
            style={{
              ...S.btnBase,
              padding: "4px 10px",
              fontSize: 11,
              background: tab === t ? "#e2e8f0" : "#f8fafc",
              fontWeight: tab === t ? 600 : 400,
              border: "1px solid #e2e8f0",
              color: tab === t ? "#374151" : "#9ca3af"
            }}
          >
            {t === 'gen' ? 'Points' : 'Std Dev'}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${tabListId}-panel-${tab}`} aria-labelledby={`${tabListId}-tab-${tab}`}>
        {tab === "gen" ? (
          <table style={S.table}><tbody>{genRows}</tbody></table>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>X: <strong>{fmt3(run.fine.std_x_mm)}mm</strong></span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Y: <strong>{fmt3(run.fine.std_y_mm)}mm</strong></span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Angle: <strong>{fmt3(run.fine.std_angle_deg)}°</strong></span>
          </div>
        )}
      </div>
    </div>
  );
});

// --- 5.6 Icons ---
const ABBLogo = memo(() => <svg width="120" height="40" viewBox="0 0 120 40" role="img" aria-label="ABB Logo"><rect width="120" height="40" fill={COLORS.primary} /><text x="10" y="28" fontFamily="Arial" fontSize="24" fontWeight="bold" fill="white">JBB</text></svg>);
const FlipIcon = memo(() => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 8h16M16 4l4 4-4 4" /><path d="M20 16H4M8 12l-4 4 4 4" /></svg>);

// ==========================================
// 6. MAIN COMPONENT
// ==========================================

export default function FineTuneWeb() {
  const [points, setPoints] = useState<PointInput[]>([{ x: "", y: "", angle: "" }]);
  const [segments, setSegments] = useState<string[]>([]);
  const [customPoints, setCustomPoints] = useState<CustomPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fineTuned, setFineTuned] = useState<Fine | null>(null);
  const [sequence, setSequence] = useState<PtA[] | null>(null);
  const [manualBounds, setManualBounds] = useState<Bounds | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ w: CONFIG.DEFAULT_CANVAS_WIDTH, h: CONFIG.DEFAULT_CANVAS_HEIGHT });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saved, setSaved] = useState<SavedRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { announcement, announce } = useAnnounce();

  // Load saved runs from localStorage
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CONFIG.LOCALSTORAGE_KEY) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw).map((run: SavedRun) => ({ ...run, visible: run.visible ?? true }));
        setSaved(parsed);
      } catch { /* ignore parse errors */ }
    }
  }, []);
  
  // Persist saved runs
  const debouncedSaved = useDebounce(saved, 500);
  useEffect(() => { 
    if (typeof window !== 'undefined') { 
      if (debouncedSaved.length === 0) {
        localStorage.removeItem(CONFIG.LOCALSTORAGE_KEY);
      } else {
        const actual = saveToLocalStorage(debouncedSaved); 
        if (actual.length !== debouncedSaved.length) setSaved(actual); 
      }
    } 
  }, [debouncedSaved]);
  
  // Sync segment count with point count
  useEffect(() => {
    const need = Math.max(0, points.length - 1);
    setSegments(prev => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push("");
      return next;
    });
  }, [points.length]);

  const computedCustomPoints = useMemo(
    () => calculateCustomPointPositions(customPoints, sequence, fineTuned),
    [customPoints, fineTuned, sequence]
  );
  
  const rawPts: ValidatedPoint[] = useMemo(() => points.map(p => {
    const x = parseFloatSafe(p.x);
    const y = parseFloatSafe(p.y);
    return { x: x ?? 0, y: y ?? 0, valid: x !== null && y !== null };
  }), [points]);
  
  const allVisiblePts = useMemo(() => {
    const pts: Pt[] = [...rawPts.filter(p => p.valid), ...(sequence || [])];
    computedCustomPoints.forEach(p => pts.push(p));
    saved.filter(r => r.visible).forEach(r => r.seq.forEach(p => pts.push(p)));
    return pts;
  }, [rawPts, sequence, computedCustomPoints, saved]);
  
  const view = useMemo(() => {
    const bounds = manualBounds ?? computeBounds(allVisiblePts, canvasSize);
    return { ...bounds, w: canvasSize.w, h: canvasSize.h };
  }, [manualBounds, allVisiblePts, canvasSize]);
  
  const axisLine = useMemo(() => {
    if (!fineTuned || !sequence?.length) return null;
    const { ux, uy } = unitFromAngleDeg(fineTuned.mean_angle);
    const { mean_x: mx, mean_y: my } = fineTuned;
    let minT = 0, maxT = 0;
    [...sequence, ...computedCustomPoints].forEach(p => {
      const t = (p.x - mx) * ux + (p.y - my) * uy;
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
    });
    const normalEndT = (sequence[sequence.length - 1].x - mx) * ux + (sequence[sequence.length - 1].y - my) * uy;
    return {
      start: { x: mx + minT * ux, y: my + minT * uy },
      end: { x: mx + maxT * ux, y: my + maxT * uy },
      normalEnd: { x: mx + normalEndT * ux, y: my + normalEndT * uy }
    };
  }, [fineTuned, sequence, computedCustomPoints]);

  const handleCompute = useCallback(() => {
    setError(null);
    setIsLoading(true);
    announce("Generating points...");
    
    if (points.length < 1) {
      setError("Enter at least one point.");
      setIsLoading(false);
      announce("Error: Enter at least one point");
      return;
    }
    if (points.length > CONFIG.MAX_POINTS) {
      setError(`Maximum ${CONFIG.MAX_POINTS} points allowed.`);
      setIsLoading(false);
      announce(`Error: Maximum ${CONFIG.MAX_POINTS} points allowed`);
      return;
    }
    
    const cleanPts: PtA[] = [];
    for (const p of points) {
      const x = parseFloatSafe(p.x), y = parseFloatSafe(p.y), a = parseFloatSafe(p.angle);
      if (x === null || y === null || a === null) {
        setError("All points require valid numeric X, Y, and Angle values.");
        setIsLoading(false);
        announce("Error: Invalid input values");
        return;
      }
      cleanPts.push({ x, y, angle: a });
    }
    
    const parsedSegments: number[] = [];
    for (let i = 0; i < segments.length; i += 1) {
      const raw = segments[i].trim();
      if (raw === "") { parsedSegments.push(0); continue; }
      const val = parseFloatSafe(raw);
      if (val === null) {
        const label = String.fromCharCode(65 + i);
        setError(`Segment ${label} must be a number.`);
        setIsLoading(false);
        announce(`Error: Segment ${label} must be a number`);
        return;
      }
      parsedSegments.push(val);
    }
    
    try {
      const result = computeFineTuning(cleanPts, parsedSegments);
      setFineTuned(result.fine_tuned);
      setSequence(result.sequence);
      setManualBounds(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      announce(`Generated ${result.sequence?.length || 0} points successfully`);
    } catch (e: unknown) {
      const msg = `Unexpected error: ${e instanceof Error ? e.message : String(e)}`;
      setError(msg);
      announce(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [points, segments, announce]);

  const handleClear = useCallback(() => {
    setPoints([{ x: "", y: "", angle: "" }]);
    setFineTuned(null);
    setSequence(null);
    setCustomPoints([]);
    setError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    announce("All data cleared");
  }, [announce]);
  
  const handleSave = useCallback(() => {
    const name = window.prompt("Name run:", "Station_");
    if (name && fineTuned && sequence) {
      setSaved(prev => [{
        id: `${Date.now()}`,
        name,
        fine: fineTuned,
        seq: sequence,
        createdAt: Date.now(),
        customPoints,
        visible: true
      }, ...prev]);
      announce(`Saved as "${name}"`);
    }
  }, [fineTuned, sequence, customPoints, announce]);
  
  // Zoom around a point in screen coordinates
  const handleZoom = useCallback((factor: number, screenX: number, screenY: number) => {
    const newZoom = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, zoom * factor));
    const actualFactor = newZoom / zoom;
    
    // The transform is centered around (view.w/2, view.h/2), so we need to 
    // adjust pan relative to that center point, not (0,0)
    const centerX = view.w / 2;
    const centerY = view.h / 2;
    const offsetX = screenX - centerX;
    const offsetY = screenY - centerY;
    
    // Adjust pan to keep the zoom point stationary
    setPan(p => ({
      x: offsetX * (1 - actualFactor) + p.x * actualFactor,
      y: offsetY * (1 - actualFactor) + p.y * actualFactor
    }));
    setZoom(newZoom);
  }, [zoom, view.w, view.h]);
  
  const handleCenter = useCallback(() => {
    if (!allVisiblePts.length) return;
    setManualBounds(computeBounds(allVisiblePts, canvasSize));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [allVisiblePts, canvasSize]);

  const combinedStyles = useMemo(() => 
    focusRingStyle + `@media (max-width: 1200px){ .ft-grid{ grid-template-columns: 1fr !important; } }`, 
  []);

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
      <a href="#main-content" className="skip-link" style={S.skipLink as CSSProperties}>Skip to main content</a>
      <ScreenReaderAnnouncer message={announcement} />
      
      <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
        <ABBLogo />
        <div>
          <h1 style={{ ...S.h2, fontSize: 26, marginBottom: 2 }}>AMR Fine-Tuning Tool</h1>
          <p style={{ ...S.headerSub, fontSize: 13 }}>I didn&apos;t like using the Excel sheet - JB</p>
        </div>
      </header>
      
      <main id="main-content" className="ft-grid" style={S.grid}>
        <div style={{ ...S.panel, padding: 16 }}>
          <PointInputPanel
            points={points}
            segments={segments}
            error={error}
            isLoading={isLoading}
            hasResults={!!fineTuned}
            onPointsChange={setPoints}
            onSegmentsChange={setSegments}
            onCompute={handleCompute}
            onClear={handleClear}
            onSave={handleSave}
            announce={announce}
          />
          <CustomPointsEditor customPoints={customPoints} sequence={sequence || []} onChange={setCustomPoints} announce={announce} />
          <ResultsTables sequence={sequence} computedCustomPoints={computedCustomPoints} fineTuned={fineTuned} />
        </div>
        
        <div style={{ ...S.panel, padding: 16 }}>
          <h2 style={{ ...S.sectionTitle, marginBottom: 12 }}>Generated Points Graph</h2>
          <VisualizationCanvas
            view={view}
            zoom={zoom}
            pan={pan}
            rawPoints={rawPts}
            sequence={sequence}
            computedCustomPoints={computedCustomPoints}
            savedRuns={saved}
            axisLine={axisLine}
            onZoom={handleZoom}
            onPanChange={setPan}
            onCenter={handleCenter}
            onResize={setCanvasSize}
          />
          <SavedRunsManager savedRuns={saved} onUpdate={setSaved} announce={announce} />
        </div>
      </main>
    </div>
  );
}
