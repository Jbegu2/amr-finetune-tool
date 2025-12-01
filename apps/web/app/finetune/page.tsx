"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback, CSSProperties, memo, useId } from "react";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

type PtA = { x: number; y: number; angle: number };
type Pt = { x: number; y: number };
type Viewport = { minX: number; maxX: number; minY: number; maxY: number; w: number; h: number };

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

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN;

if (!API_ORIGIN && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_API_ORIGIN environment variable is not set');
}

const CONFIG = {
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 700,
  MIN_ZOOM: 0.05,
  MAX_ZOOM: 50,
  ZOOM_FACTOR: 1.15,
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
  STORAGE_WARNING_SIZE: 4_000_000,
  LOCALSTORAGE_KEY: "ft_saved_runs",
  DEFAULT_API_URL: 'http://localhost:8000',
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
  page: { padding: 24, fontFamily: "Inter, system-ui, Arial", color: "#111", maxWidth: "100%", overflowX: "hidden" },
  grid: { display: "grid", gridTemplateColumns: "minmax(550px, 2fr) minmax(400px, 3fr)", gap: 24, alignItems: "start" },
  panel: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, background: "#fff" },
  canvasContainer: { position: "relative", width: "100%", maxHeight: "60vh", overflow: "hidden", overscrollBehavior: "contain" },
  h2: { margin: 0, marginBottom: 4, fontSize: 32, fontWeight: 700 },
  headerSub: { fontSize: 14, color: COLORS.text },
  sectionTitle: { fontWeight: 600, marginBottom: 12, fontSize: 16 },
  subLabel: { fontSize: 13, color: COLORS.text, marginBottom: 8 },
  input: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 15, width: 90, transition: "border-color 0.15s, box-shadow 0.15s" },
  inputFull: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 15, width: "100%", transition: "border-color 0.15s, box-shadow 0.15s" },
  btnBase: { borderRadius: 8, padding: "12px 20px", cursor: "pointer", fontSize: 15, fontWeight: 600, border: "1px solid transparent", transition: "background-color 0.15s, opacity 0.15s, transform 0.1s" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "8px 6px" },
  td: { borderTop: "1px solid #f3f4f6", padding: "8px 6px" },
  tooltip: { position: "fixed", display: "none", pointerEvents: "none", background: "rgba(0,0,0,0.9)", color: "#fff", fontSize: 13, padding: "8px 12px", borderRadius: 6, zIndex: 50, whiteSpace: 'pre-line', maxWidth: 250 },
  centerBtn: { position: "absolute", right: 16, bottom: 16, background: "#ffffff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 9999, padding: "10px 16px", fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", transition: "transform 0.15s, box-shadow 0.15s" },
  errorBox: { color: COLORS.danger, fontSize: 13, marginBottom: 10, padding: "8px 12px", background: "#fee2e2", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 },
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
    case 'primary': return { ...base, background: COLORS.primary, color: "#fff", borderColor: COLORS.primary };
    case 'secondary': return { ...base, background: "#f3f4f6", color: "#111827", borderColor: "#e5e7eb", fontWeight: 400 };
    case 'danger': return { ...base, background: COLORS.danger, color: "#fff", borderColor: COLORS.danger, padding: "10px 16px", fontSize: 14 };
    default: return base;
  }
};

const legendDot = (bg: string): CSSProperties => ({ display: "inline-block", width: 12, height: 12, borderRadius: 12, background: bg, marginRight: 8 });

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

const formatByScale = (v: number, scale: number) => {
  let decimals = 3;
  if (scale > 100) decimals = 0;
  else if (scale > 10) decimals = 1;
  else if (scale > 1) decimals = 2;
  const s = v.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return s === "-0" ? "0" : s;
};

function unitFromAngleDeg(deg: number) {
  const r = (deg * Math.PI) / 180;
  return { ux: Math.cos(r), uy: Math.sin(r) };
}

function computeBounds(all: Pt[]): Viewport {
  if (!all.length) return { minX: -1, maxX: 1, minY: -0.7, maxY: 0.7, w: 0, h: 0 };
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
  // Canvas aspect ratio: width/height = 1000/700
  const canvasAspect = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
  const dataAspect = rangeX / rangeY;
  
  if (dataAspect > canvasAspect) {
    // Data is wider than canvas - expand Y range
    const newRangeY = rangeX / canvasAspect;
    const extraY = (newRangeY - rangeY) / 2;
    minY -= extraY;
    maxY += extraY;
  } else {
    // Data is taller than canvas - expand X range
    const newRangeX = rangeY * canvasAspect;
    const extraX = (newRangeX - rangeX) / 2;
    minX -= extraX;
    maxX += extraX;
  }
  
  return { minX, maxX, minY, maxY, w: 0, h: 0 };
}

function makeAdaptiveTicks(min: number, max: number, screenPixels: number, scale: number) {
  const range = max - min;
  if (range <= 0 || !isFinite(range)) return [min, max];
  
  // At very low zoom (zoomed out), we need fewer but well-spaced ticks
  // At very high zoom (zoomed in), we need more granular ticks
  const targetTickCount = Math.max(5, Math.min(20, Math.floor(screenPixels / CONFIG.TICK_SPACING_PX)));
  const rawStep = range / targetTickCount;
  
  // Round to nice number
  const exp = Math.floor(Math.log10(rawStep));
  const frac = rawStep / Math.pow(10, exp);
  let niceFrac = 1;
  if (frac >= 1.5 && frac < 3) niceFrac = 2;
  else if (frac >= 3 && frac < 7) niceFrac = 5;
  else if (frac >= 7) niceFrac = 10;
  const step = niceFrac * Math.pow(10, exp);
  
  if (!isFinite(step) || step <= 0) return [min, max];
  
  // Extend range slightly to ensure we cover edges
  const extendedMin = min - step;
  const extendedMax = max + step;
  const start = Math.floor(extendedMin / step) * step;
  
  const ticks: number[] = [];
  const maxTicks = 50; // Prevent infinite loops
  for (let t = start; t <= extendedMax && ticks.length < maxTicks; t += step) {
    ticks.push(t);
  }
  return ticks.length >= 2 ? ticks : [min, max];
}

// Calculate visible world bounds based on current zoom/pan with extra margin for grid
function getVisibleWorldBounds(view: Viewport, scale: number, pan: { x: number; y: number }): { minX: number; maxX: number; minY: number; maxY: number } {
  const cx = view.w / 2, cy = view.h / 2;
  // Inverse transform: screen -> world
  const screenToWorld = (sx: number, sy: number) => {
    const sx0 = (sx - pan.x - cx) / scale + cx;
    const sy0 = (sy - pan.y - cy) / scale + cy;
    const x = (sx0 / view.w) * (view.maxX - view.minX) + view.minX;
    const y = ((view.h - sy0) / view.h) * (view.maxY - view.minY) + view.minY;
    return { x, y };
  };
  // Add margin to ensure grid extends beyond visible area
  const margin = 200;
  const topLeft = screenToWorld(-margin, -margin);
  const bottomRight = screenToWorld(view.w + margin, view.h + margin);
  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y)
  };
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
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      const emergency = runs.slice(0, 10);
      try { localStorage.setItem(CONFIG.LOCALSTORAGE_KEY, JSON.stringify(emergency)); return emergency; }
      catch { return runs; }
    }
    throw e;
  }
}

function createWorldToScreen(view: Viewport, scale: number, pan: { x: number; y: number }) {
  return (x: number, y: number) => {
    const sx0 = ((x - view.minX) / (view.maxX - view.minX)) * view.w;
    const sy0 = view.h - ((y - view.minY) / (view.maxY - view.minY)) * view.h;
    const cx = view.w / 2, cy = view.h / 2;
    return { sx: cx + (sx0 - cx) * scale + pan.x, sy: cy + (sy0 - cy) * scale + pan.y };
  };
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

  return (
    <section aria-labelledby={sectionId} onKeyDown={handleKeyDown}>
      <h2 id={sectionId} style={S.sectionTitle}>Input Points</h2>
      {error && <div id={errorId} role="alert" style={S.errorBox}><span aria-hidden="true">⚠️</span><span>{error}</span></div>}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={handleAddPoint} style={btnStyle('secondary')} aria-label="Add new input point">➕ Add Point</button>
      </div>
      <div role="list" aria-label="Input points list" style={{ display: "grid", gap: 16 }}>
        {points.map((p, i) => <PointInputRow key={i} index={i} point={p} onFieldChange={handlePointFieldChange} onRemove={handleRemovePoint} totalPoints={points.length} />)}
      </div>
      <div style={{ marginTop: 32 }}>
        <h3 style={S.sectionTitle}>Segments</h3>
        <p id="segments-desc" style={S.subLabel}>Distance from {getPointInfo(0).label} to each subsequent point</p>
        <div role="list" aria-describedby="segments-desc" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginTop: 12 }}>
          {segments.map((s, i) => <SegmentInput key={i} index={i} value={s} onChange={handleSegmentChange} />)}
        </div>
      </div>
      <div role="group" aria-label="Actions" style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        <button onClick={onCompute} style={{ ...btnStyle('primary'), opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }} disabled={isLoading} aria-busy={isLoading} aria-describedby={error ? errorId : undefined} title="Ctrl+Enter">
          {isLoading ? '⏳ Generating...' : 'Generate'}
        </button>
        <button onClick={onClear} style={btnStyle('secondary')} aria-label="Clear all input data">Clear All</button>
        <button onClick={onSave} style={{ ...btnStyle('secondary'), opacity: hasResults ? 1 : 0.5 }} disabled={!hasResults} aria-label="Save current results" aria-disabled={!hasResults}>Save Point Data</button>
      </div>
      <p style={{ ...S.subLabel, marginTop: 12, fontSize: 12 }}>
        <kbd style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>Ctrl</kbd>+<kbd style={{ background: "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>Enter</kbd> to generate
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
    <div role="listitem" aria-label={`Point ${index + 1} of ${totalPoints}`} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr auto", gap: 12, alignItems: "center", padding: 12, background: "#f9fafb", borderRadius: 8 }}>
      <div aria-hidden="true" style={{ fontSize: 14, fontWeight: 600, color: "#374151", textAlign: "center" }}>{index + 1}</div>
      <div><label htmlFor={`${rowId}-x`} style={S.srOnly as CSSProperties}>X coordinate for point {index + 1}</label><input id={`${rowId}-x`} style={S.input} placeholder="X (m)" value={point.x} onChange={handleChange('x')} inputMode="decimal" /></div>
      <div><label htmlFor={`${rowId}-y`} style={S.srOnly as CSSProperties}>Y coordinate for point {index + 1}</label><input id={`${rowId}-y`} style={S.input} placeholder="Y (m)" value={point.y} onChange={handleChange('y')} inputMode="decimal" /></div>
      <div><label htmlFor={`${rowId}-angle`} style={S.srOnly as CSSProperties}>Angle for point {index + 1}</label><input id={`${rowId}-angle`} style={S.input} placeholder="Angle (°)" value={point.angle} onChange={handleChange('angle')} inputMode="decimal" /></div>
      <button onClick={handleRemove} style={btnStyle('danger')} aria-label={`Remove point ${index + 1}`}>Remove</button>
    </div>
  );
});

interface SegmentInputProps { index: number; value: string; onChange: (index: number, value: string) => void; }

const SegmentInput = memo(function SegmentInput({ index, value, onChange }: SegmentInputProps) {
  const inputId = useId();
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onChange(index, e.target.value), [index, onChange]);
  const segmentLabel = String.fromCharCode(65 + index);

  return (
    <div role="listitem" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
      <label htmlFor={inputId} style={{ fontSize: 15, fontWeight: 600, color: COLORS.primary, minWidth: 24 }}>{segmentLabel}</label>
      <input id={inputId} style={S.inputFull} placeholder="0.0" value={value} onChange={handleChange} aria-label={`Segment ${segmentLabel} distance in meters`} inputMode="decimal" />
      <span aria-hidden="true" style={{ fontSize: 12, color: COLORS.text }}>m</span>
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
    <section aria-labelledby={sectionId} style={{ marginTop: 32, padding: 16, border: "2px solid #fed7aa", background: "#fff7ed", borderRadius: 8 }}>
      <h2 id={sectionId} style={{ ...S.sectionTitle, color: "#c2410c" }}>Custom Points</h2>
      <p style={S.subLabel}>Add points relative to generated sequence</p>
      <button onClick={handleAdd} style={{ ...btnStyle('secondary'), background: "#fff", borderColor: "#fed7aa", color: "#c2410c", marginBottom: 16 }} aria-label="Add new custom point">➕ Add Custom Point</button>
      <div role="list" aria-label="Custom points list" style={{ display: "grid", gap: 12 }}>
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
    <div role="listitem" aria-label={`Custom point ${index + 1} of ${totalPoints}: ${point.name}`} style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #fed7aa" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <label htmlFor={`${rowId}-name`} style={S.srOnly as CSSProperties}>Custom point name</label>
        <input id={`${rowId}-name`} style={S.inputFull} value={point.name} onChange={handleNameChange} placeholder="Name" />
        <button onClick={onDelete} style={{ ...btnStyle('danger'), width: "auto", minWidth: 60, padding: 8, flexShrink: 0 }} aria-label={`Delete custom point ${point.name}`}>Delete</button>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}><label htmlFor={`${rowId}-ref`} style={S.srOnly as CSSProperties}>Reference point</label><select id={`${rowId}-ref`} style={{ ...S.inputFull, padding: 9 }} value={point.referenceIndex} onChange={handleRefChange} aria-label="Reference point">{sequence.map((_, idx) => <option key={idx} value={idx}>{getPointInfo(idx).label}</option>)}</select></div>
        <div style={{ position: "relative", width: 100, flexShrink: 0 }}><label htmlFor={`${rowId}-dist`} style={S.srOnly as CSSProperties}>Distance in millimeters</label><input id={`${rowId}-dist`} style={{ ...S.inputFull, paddingRight: 28 }} placeholder="mm" value={point.distanceMm} onChange={handleDistChange} inputMode="decimal" /><span aria-hidden="true" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#9ca3af" }}>mm</span></div>
        <button onClick={handleFlip} title={point.flipped ? "Direction: reversed" : "Direction: forward"} aria-label={`Flip direction, currently ${point.flipped ? 'reversed' : 'forward'}`} aria-pressed={point.flipped} style={{ ...btnStyle('secondary'), padding: 0, width: 40, height: 40, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", background: point.flipped ? "#fee2e2" : "#f3f4f6", borderColor: point.flipped ? "#fca5a5" : "#e5e7eb", color: point.flipped ? COLORS.danger : "#4b5563" }}><FlipIcon /></button>
      </div>
    </div>
  );
});

// --- 5.3 ResultsTables ---
interface ResultsTablesProps { sequence: PtA[] | null; computedCustomPoints: ComputedCustomPoint[]; fineTuned: Fine | null; }

const ResultsTables = memo(function ResultsTables({ sequence, computedCustomPoints, fineTuned }: ResultsTablesProps) {
  const tableId = useId();
  const stdTableId = useId();
  const sequenceRows = useMemo(() => sequence?.map((p, i) => { const info = getPointInfo(i); return <tr key={i} style={{ color: info.color }}><td style={S.td}>{info.label}</td><td style={S.td}>{fmt3(p.x)}</td><td style={S.td}>{fmt3(p.y)}</td><td style={S.td}>{fmt3(p.angle)}</td></tr>; }), [sequence]);
  const customRows = useMemo(() => computedCustomPoints.map(cp => <tr key={cp.customId} style={{ color: COLORS.custom, fontWeight: 500, background: "#fffbeb" }}><td style={S.td}>{cp.name}</td><td style={S.td}>{fmt3(cp.x)}</td><td style={S.td}>{fmt3(cp.y)}</td><td style={S.td}>{fmt3(cp.angle)}</td></tr>), [computedCustomPoints]);

  return (
    <div style={{ marginTop: 40 }}>
      <h2 id={tableId} style={S.sectionTitle}>Generated Points</h2>
      <table style={S.table} aria-labelledby={tableId}>
        <thead><tr><th scope="col" style={S.th}>Name</th><th scope="col" style={S.th}>X (m)</th><th scope="col" style={S.th}>Y (m)</th><th scope="col" style={S.th}>Angle (°)</th></tr></thead>
        <tbody>{sequence ? <>{sequenceRows}{customRows}</> : <tr><td colSpan={4} style={S.td}>No data generated yet</td></tr>}</tbody>
      </table>
      <div style={{ marginTop: 24 }}>
        <h2 id={stdTableId} style={S.sectionTitle}>Standard Deviations</h2>
        <table style={S.table} aria-labelledby={stdTableId}>
          <thead><tr><th scope="col" style={S.th}>Metric</th><th scope="col" style={S.th}>Value</th></tr></thead>
          <tbody>{fineTuned ? (<><tr><td style={S.td}>Std Dev X (mm)</td><td style={S.td}>{fmt3(fineTuned.std_x_mm)}</td></tr><tr><td style={S.td}>Std Dev Y (mm)</td><td style={S.td}>{fmt3(fineTuned.std_y_mm)}</td></tr><tr><td style={S.td}>Angle Std Dev (deg)</td><td style={S.td}>{fmt3(fineTuned.std_angle_deg)}</td></tr></>) : <tr><td colSpan={2} style={S.td}>No data generated yet</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
});

// --- 5.4 VisualizationCanvas ---
interface VisualizationCanvasProps {
  view: Viewport; scale: number; pan: { x: number; y: number }; rawPoints: ValidatedPoint[]; sequence: PtA[] | null;
  computedCustomPoints: ComputedCustomPoint[]; savedRuns: SavedRun[]; axisLine: { start: Pt; end: Pt; normalEnd: Pt } | null;
  onZoom: (deltaY: number, centerX: number, centerY: number) => void; onPanChange: (pan: { x: number; y: number }) => void; onCenter: () => void;
}

const VisualizationCanvas = memo(function VisualizationCanvas({ view, scale, pan, rawPoints, sequence, computedCustomPoints, savedRuns, axisLine, onZoom, onPanChange, onCenter }: VisualizationCanvasProps) {
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasId = useId();

  const worldToScreen = useMemo(() => createWorldToScreen(view, scale, pan), [view, scale, pan]);
  
  // Calculate visible world bounds for proper tick generation at any zoom level
  const visibleBounds = useMemo(() => getVisibleWorldBounds(view, scale, pan), [view, scale, pan]);
  
  // Use unified tick step for square grid cells
  const { xticks, yticks } = useMemo(() => {
    const rangeX = visibleBounds.maxX - visibleBounds.minX;
    const rangeY = visibleBounds.maxY - visibleBounds.minY;
    // Use the larger range to determine step size, ensuring consistent grid
    const maxRange = Math.max(rangeX, rangeY);
    const targetTicks = Math.max(5, Math.min(15, Math.floor(CONFIG.CANVAS_WIDTH / CONFIG.TICK_SPACING_PX)));
    const rawStep = maxRange / targetTicks;
    
    // Round to nice number
    const exp = Math.floor(Math.log10(rawStep));
    const frac = rawStep / Math.pow(10, exp);
    let niceFrac = 1;
    if (frac >= 1.5 && frac < 3) niceFrac = 2;
    else if (frac >= 3 && frac < 7) niceFrac = 5;
    else if (frac >= 7) niceFrac = 10;
    const step = niceFrac * Math.pow(10, exp);
    
    if (!isFinite(step) || step <= 0) {
      return { xticks: [visibleBounds.minX, visibleBounds.maxX], yticks: [visibleBounds.minY, visibleBounds.maxY] };
    }
    
    // Generate ticks with same step for both axes
    const genTicks = (min: number, max: number) => {
      const extMin = min - step;
      const extMax = max + step;
      const start = Math.floor(extMin / step) * step;
      const ticks: number[] = [];
      for (let t = start; t <= extMax && ticks.length < 50; t += step) {
        ticks.push(t);
      }
      return ticks;
    };
    
    return { xticks: genTicks(visibleBounds.minX, visibleBounds.maxX), yticks: genTicks(visibleBounds.minY, visibleBounds.maxY) };
  }, [visibleBounds]);

  // Native wheel listener with passive:false on container to properly prevent page scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      // Scale mouse position from screen pixels to viewBox coordinates
      const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
      const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      onZoom(e.deltaY, cx, cy);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoom]);

  useEffect(() => {
    if (!dragging) return;
    const handleUp = () => { setDragging(false); setLastMouse(null); };
    const handleMove = (e: MouseEvent) => { if (lastMouse) { onPanChange({ x: pan.x + e.clientX - lastMouse.x, y: pan.y + e.clientY - lastMouse.y }); setLastMouse({ x: e.clientX, y: e.clientY }); } };
    window.addEventListener('mouseup', handleUp); window.addEventListener('mousemove', handleMove);
    return () => { window.removeEventListener('mouseup', handleUp); window.removeEventListener('mousemove', handleMove); };
  }, [dragging, lastMouse, pan, onPanChange]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setDragging(true); setLastMouse({ x: e.clientX, y: e.clientY }); }, []);
  const showTip = useCallback((text: string, clientX: number, clientY: number) => { if (tipRef.current) { tipRef.current.style.display = "block"; tipRef.current.style.left = `${clientX + CONFIG.TOOLTIP_OFFSET_X}px`; tipRef.current.style.top = `${clientY + CONFIG.TOOLTIP_OFFSET_Y}px`; tipRef.current.textContent = text; } }, []);
  const hideTip = useCallback(() => { if (tipRef.current) tipRef.current.style.display = "none"; }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = CONFIG.KEYBOARD_PAN_STEP;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); onPanChange({ x: pan.x, y: pan.y + step }); break;
      case 'ArrowDown': e.preventDefault(); onPanChange({ x: pan.x, y: pan.y - step }); break;
      case 'ArrowLeft': e.preventDefault(); onPanChange({ x: pan.x + step, y: pan.y }); break;
      case 'ArrowRight': e.preventDefault(); onPanChange({ x: pan.x - step, y: pan.y }); break;
      case '+': case '=': e.preventDefault(); onZoom(-100, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2); break;
      case '-': case '_': e.preventDefault(); onZoom(100, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2); break;
      case '0': case 'Home': e.preventDefault(); onCenter(); break;
    }
  }, [pan, onPanChange, onZoom, onCenter]);

  const visibleSavedRuns = useMemo(() => savedRuns.filter(r => r.visible), [savedRuns]);
  const pointCount = (sequence?.length ?? 0) + computedCustomPoints.length + rawPoints.filter(p => p.valid).length;

  return (
    <>
      <Legend hasCustomPoints={computedCustomPoints.length > 0} />
      <div ref={containerRef} style={S.canvasContainer as CSSProperties}>
        <div ref={tipRef} role="tooltip" style={S.tooltip} />
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${CONFIG.CANVAS_WIDTH} ${CONFIG.CANVAS_HEIGHT}`} preserveAspectRatio="xMidYMid meet" style={{ background: "white", border: "2px solid #e5e7eb", borderRadius: 8, touchAction: "none", cursor: dragging ? "grabbing" : "grab", maxHeight: "60vh", display: "block" }} onMouseDown={handleMouseDown} onMouseLeave={hideTip} onKeyDown={handleKeyDown} tabIndex={0} role="img" aria-label={`Visualization canvas showing ${pointCount} points. Use arrow keys to pan, plus/minus to zoom, 0 to center.`} aria-describedby={canvasId}>
          <title id={canvasId}>Robot fine-tuning visualization with {pointCount} points at {(scale * 100).toFixed(0)}% zoom</title>
          <GridLines xticks={xticks} yticks={yticks} scale={scale} worldToScreen={worldToScreen} />
          {axisLine && <AxisLineRenderer axisLine={axisLine} worldToScreen={worldToScreen} />}
          <PointsLayer rawPoints={rawPoints} sequence={sequence} computedCustomPoints={computedCustomPoints} savedRuns={visibleSavedRuns} worldToScreen={worldToScreen} showTip={showTip} hideTip={hideTip} />
        </svg>
        <button onClick={onCenter} style={S.centerBtn} aria-label="Center and reset view">Center</button>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: COLORS.text, textAlign: "center" }} aria-live="polite">Zoom: {(scale * 100).toFixed(0)}% | Scroll to zoom | Drag to pan | <kbd></kbd><kbd></kbd> <kbd></kbd> </div>
    </>
  );
});

const Legend = memo(function Legend({ hasCustomPoints }: { hasCustomPoints: boolean }) {
  return (
    <div role="list" aria-label="Point type legend" style={{ display: "flex", gap: 20, fontSize: 14, color: "#374151", marginBottom: 16, flexWrap: "wrap" }}>
      <span role="listitem"><span style={legendDot(COLORS.raw)} aria-hidden="true" />Input</span>
      {POINT_TYPES.map(pt => <span key={pt.key} role="listitem"><span style={legendDot(pt.color)} aria-hidden="true" />{pt.shortLabel}</span>)}
      {hasCustomPoints && <span role="listitem"><span style={legendDot(COLORS.custom)} aria-hidden="true" />Custom</span>}
    </div>
  );
});

const GridLines = memo(function GridLines({ xticks, yticks, scale, worldToScreen }: { xticks: number[]; yticks: number[]; scale: number; worldToScreen: (x: number, y: number) => { sx: number; sy: number } }) {
  const xLines = useMemo(() => xticks.map((v, i) => {
    const p = worldToScreen(v, 0);
    // Only skip if completely off canvas
    if (p.sx < -200 || p.sx > CONFIG.CANVAS_WIDTH + 200) return null;
    return (
      <React.Fragment key={`x${i}`}>
        <line x1={p.sx} y1={0} x2={p.sx} y2={CONFIG.CANVAS_HEIGHT} stroke={COLORS.grid} strokeWidth={1} aria-hidden="true" />
        {p.sx >= 0 && p.sx <= CONFIG.CANVAS_WIDTH && (
          <text x={p.sx + 3} y={CONFIG.CANVAS_HEIGHT - 6} fontSize={11} fill={COLORS.text} aria-hidden="true">{formatByScale(v, scale)}</text>
        )}
      </React.Fragment>
    );
  }).filter(Boolean), [xticks, scale, worldToScreen]);
  
  const yLines = useMemo(() => yticks.map((v, i) => {
    const p = worldToScreen(0, v);
    // Only skip if completely off canvas
    if (p.sy < -200 || p.sy > CONFIG.CANVAS_HEIGHT + 200) return null;
    return (
      <React.Fragment key={`y${i}`}>
        <line x1={0} y1={p.sy} x2={CONFIG.CANVAS_WIDTH} y2={p.sy} stroke={COLORS.grid} strokeWidth={1} aria-hidden="true" />
        {p.sy >= 0 && p.sy <= CONFIG.CANVAS_HEIGHT && (
          <text x={4} y={p.sy - 3} fontSize={11} fill={COLORS.text} aria-hidden="true">{formatByScale(v, scale)}</text>
        )}
      </React.Fragment>
    );
  }).filter(Boolean), [yticks, scale, worldToScreen]);
  
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
    <section aria-labelledby={sectionId} style={{ marginTop: 32 }}>
      <h2 id={sectionId} style={S.sectionTitle}>Saved Point Data</h2>
      {savedRuns.length === 0 ? <p style={{ fontSize: 13, color: COLORS.text, padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>No saved data. Generate points and click "Save Point Data" to save.</p> : <div role="list" aria-label={`${savedRuns.length} saved runs`}>{savedRuns.map((r, idx) => <SavedRunCard key={r.id} run={r} index={idx} total={savedRuns.length} onToggle={handleToggle} onRename={handleRename} onDelete={handleDelete} />)}</div>}
    </section>
  );
});

interface SavedRunCardProps { run: SavedRun; index: number; total: number; onToggle: (id: string) => void; onRename: (id: string) => void; onDelete: (id: string) => void; }

const SavedRunCard = memo(function SavedRunCard({ run, index, total, onToggle, onRename, onDelete }: SavedRunCardProps) {
  const checkboxId = useId();
  const handleToggle = useCallback(() => onToggle(run.id), [run.id, onToggle]);
  const handleRename = useCallback(() => onRename(run.id), [run.id, onRename]);
  const handleDelete = useCallback(() => onDelete(run.id), [run.id, onDelete]);

  return (
    <article role="listitem" aria-label={`Saved run ${index + 1} of ${total}: ${run.name}`} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12, background: "#fafafa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontWeight: 600, margin: 0 }}>{run.name}</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><input id={checkboxId} type="checkbox" checked={!!run.visible} onChange={handleToggle} /><span>Show</span></label>
          <button onClick={handleRename} style={btnStyle('secondary')} aria-label={`Rename ${run.name}`}>Rename</button>
          <button onClick={handleDelete} style={btnStyle('danger')} aria-label={`Delete ${run.name}`}>Delete</button>
        </div>
      </div>
      <SavedTabs run={run} />
    </article>
  );
});

const SavedTabs = memo(function SavedTabs({ run }: { run: SavedRun }) {
  const [tab, setTab] = useState<"gen" | "sd">("gen");
  const tabListId = useId();
  const genRows = useMemo(() => run.seq.map((p, i) => { const info = getPointInfo(i); return <tr key={i} style={{ color: info.color }}><td style={S.td}>{info.shortLabel}</td><td style={S.td}>{fmt3(p.x)}</td><td style={S.td}>{fmt3(p.y)}</td><td style={S.td}>{fmt3(p.angle)}</td></tr>; }), [run.seq]);

  return (
    <div>
      <div role="tablist" aria-label="Data views" style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        {(['gen', 'sd'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} aria-controls={`${tabListId}-panel-${t}`} id={`${tabListId}-tab-${t}`} onClick={() => setTab(t)} style={{ ...S.btnBase, background: tab === t ? "#e5e7eb" : "#f3f4f6", fontWeight: tab === t ? 600 : 400, border: "1px solid #e5e7eb" }}>{t === 'gen' ? 'Generated Points' : 'Standard Deviation'}</button>)}
      </div>
      <div role="tabpanel" id={`${tabListId}-panel-${tab}`} aria-labelledby={`${tabListId}-tab-${tab}`}>
        <table style={S.table}>{tab === "gen" ? <tbody>{genRows}</tbody> : <tbody><tr><td style={S.td}>Std Dev X</td><td style={S.td}>{fmt3(run.fine.std_x_mm)} mm</td></tr><tr><td style={S.td}>Std Dev Y</td><td style={S.td}>{fmt3(run.fine.std_y_mm)} mm</td></tr><tr><td style={S.td}>Std Dev Angle</td><td style={S.td}>{fmt3(run.fine.std_angle_deg)}°</td></tr></tbody>}</table>
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
  const [manualBounds, setManualBounds] = useState<Viewport | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saved, setSaved] = useState<SavedRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { announcement, announce } = useAnnounce();

  useEffect(() => { const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CONFIG.LOCALSTORAGE_KEY) : null; if (raw) try { setSaved(JSON.parse(raw)); } catch {} }, []);
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
  useEffect(() => { const need = Math.max(0, points.length - 1); setSegments(prev => { const next = prev.slice(0, need); while (next.length < need) next.push(""); return next; }); }, [points.length]);
  useEffect(() => { return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); }; }, []);

  const computedCustomPoints = useMemo(() => calculateCustomPointPositions(customPoints, sequence, fineTuned), [customPoints, fineTuned, sequence]);
  const rawPts: ValidatedPoint[] = useMemo(() => points.map(p => ({ x: parseFloatSafe(p.x) ?? 0, y: parseFloatSafe(p.y) ?? 0, valid: parseFloatSafe(p.x) !== null && parseFloatSafe(p.y) !== null && parseFloatSafe(p.angle) !== null })), [points]);
  const allVisiblePts = useMemo(() => { const pts: Pt[] = [...rawPts.filter(p => p.valid), ...(sequence || [])]; computedCustomPoints.forEach(p => pts.push(p)); saved.filter(r => r.visible).forEach(r => r.seq.forEach(p => pts.push(p))); return pts; }, [rawPts, sequence, computedCustomPoints, saved]);
  const view = useMemo(() => { const b = manualBounds ?? computeBounds(allVisiblePts); return { ...b, w: CONFIG.CANVAS_WIDTH, h: CONFIG.CANVAS_HEIGHT }; }, [manualBounds, allVisiblePts]);
  const axisLine = useMemo(() => { if (!fineTuned || !sequence?.length) return null; const { ux, uy } = unitFromAngleDeg(fineTuned.mean_angle); const { mean_x: mx, mean_y: my } = fineTuned; let minT = 0, maxT = 0; [...sequence, ...computedCustomPoints].forEach(p => { const t = (p.x - mx) * ux + (p.y - my) * uy; minT = Math.min(minT, t); maxT = Math.max(maxT, t); }); const normalEndT = (sequence[sequence.length - 1].x - mx) * ux + (sequence[sequence.length - 1].y - my) * uy; return { start: { x: mx + minT * ux, y: my + minT * uy }, end: { x: mx + maxT * ux, y: my + maxT * uy }, normalEnd: { x: mx + normalEndT * ux, y: my + normalEndT * uy } }; }, [fineTuned, sequence, computedCustomPoints]);

  const handleCompute = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setError(null); setIsLoading(true); announce("Generating points...");
    if (points.length < 1) { setError("Enter at least one point."); setIsLoading(false); announce("Error: Enter at least one point"); return; }
    const cleanPts: PtA[] = [];
    for (const p of points) { const x = parseFloatSafe(p.x), y = parseFloatSafe(p.y), a = parseFloatSafe(p.angle); if (x === null || y === null || a === null) { setError("All points require valid numeric X, Y, and Angle values."); setIsLoading(false); announce("Error: Invalid input values"); return; } cleanPts.push({ x, y, angle: a }); }
    try {
      const res = await fetch(`${API_ORIGIN || CONFIG.DEFAULT_API_URL}/fine_tune/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points: cleanPts, segments: segments.map(s => parseFloatSafe(s) ?? 0) }), signal: abortControllerRef.current.signal });
      if (!res.ok) { const txt = await res.text(); throw new Error(`API error ${res.status}: ${txt}`); }
      const json = await res.json(); setFineTuned(json.fine_tuned); setSequence(json.sequence); setManualBounds(null);
      if (json.sequence?.length > 1) { const d = Math.hypot(json.sequence.at(-1).x - json.sequence[0].x, json.sequence.at(-1).y - json.sequence[0].y); setScale(d < 0.1 ? 5 : d > 10 ? 0.5 : 1); }
      setPan({ x: 0, y: 0 }); announce(`Generated ${json.sequence?.length || 0} points successfully`);
    } catch (e: any) { if (e.name === 'AbortError') return; const msg = e.message.includes('API error') ? `Server error: ${e.message}` : e.message.includes('fetch') || e.message.includes('network') ? `Network error: Cannot reach server.` : `Unexpected error: ${e.message}`; setError(msg); announce(`Error: ${msg}`); }
    finally { setIsLoading(false); abortControllerRef.current = null; }
  }, [points, segments, announce]);

  const handleClear = useCallback(() => { setPoints([{ x: "", y: "", angle: "" }]); setFineTuned(null); setSequence(null); setCustomPoints([]); setError(null); announce("All data cleared"); }, [announce]);
  const handleSave = useCallback(() => { const name = window.prompt("Name run:", "Station_"); if (name && fineTuned && sequence) { setSaved(prev => [{ id: `${Date.now()}`, name, fine: fineTuned, seq: sequence, createdAt: Date.now(), customPoints }, ...prev]); announce(`Saved as "${name}"`); } }, [fineTuned, sequence, customPoints, announce]);
  const handleZoom = useCallback((deltaY: number, cx: number, cy: number) => { const k = deltaY < 0 ? CONFIG.ZOOM_FACTOR : 1 / CONFIG.ZOOM_FACTOR; setPan(p => ({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k })); setScale(s => Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, s * k))); }, []);
  const handleCenter = useCallback(() => { if (sequence) setManualBounds(computeBounds(sequence.map(p => ({ x: p.x, y: p.y })))); setScale(1); setPan({ x: 0, y: 0 }); }, [sequence]);

  const combinedStyles = useMemo(() => 
    focusRingStyle + `@media (max-width: 1400px){ .ft-grid{ grid-template-columns: 1fr !important; } }`, 
  []);

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{ __html: combinedStyles }} />
      <a href="#main-content" className="skip-link" style={S.skipLink as CSSProperties}>Skip to main content</a>
      <ScreenReaderAnnouncer message={announcement} />
      <header style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, padding: "16px 0" }}>
        <ABBLogo />
        <div><h1 style={S.h2}>AMR Fine-Tuning Tool</h1><p style={S.headerSub}>I didn't like using the Excel sheet - JB</p></div>
      </header>
      <main id="main-content" className="ft-grid" style={S.grid}>
        <div style={S.panel}>
          <PointInputPanel points={points} segments={segments} error={error} isLoading={isLoading} hasResults={!!fineTuned} onPointsChange={setPoints} onSegmentsChange={setSegments} onCompute={handleCompute} onClear={handleClear} onSave={handleSave} announce={announce} />
          <CustomPointsEditor customPoints={customPoints} sequence={sequence || []} onChange={setCustomPoints} announce={announce} />
          <ResultsTables sequence={sequence} computedCustomPoints={computedCustomPoints} fineTuned={fineTuned} />
        </div>
        <div style={S.panel}>
          <h2 style={S.sectionTitle}>Generated Points Graph</h2>
          <VisualizationCanvas view={view} scale={scale} pan={pan} rawPoints={rawPts} sequence={sequence} computedCustomPoints={computedCustomPoints} savedRuns={saved} axisLine={axisLine} onZoom={handleZoom} onPanChange={setPan} onCenter={handleCenter} />
          <SavedRunsManager savedRuns={saved} onUpdate={setSaved} announce={announce} />
        </div>
      </main>
    </div>
  );
}
