"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * UI for fine-tuning: points table, segments, graph, saved runs.
 * Expects backend POST `${NEXT_PUBLIC_API_ORIGIN}/fine_tune/run`
 * body: { points: {x,y,angle}[], segments: number[] }
 * response: { fine_tuned: Fine, sequence: PtA[] }
 */

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
type SavedRun = { 
  id: string; 
  name: string; 
  fine: Fine; 
  seq: PtA[]; 
  createdAt: number;
  visible?: boolean;
};

// Input state using strings
type PointInput = { x: string; y: string; angle: string };

const fmt3 = (v: number) => {
  const s = (Math.round(v * 1000) / 1000)
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
  return s === "-0" ? "0" : s;
};

function unitFromAngleDeg(deg: number) {
  const r = (deg * Math.PI) / 180;
  return { ux: Math.cos(r), uy: Math.sin(r) };
}

// --- Bounds ---
function computeBounds(all: Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (!all.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  let minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  
  // If all points are at origin or very close, use a reasonable default range
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  
  if (rangeX < 0.01 && rangeY < 0.01) {
    // Points are essentially at the same location, use 2 meter range
    return { minX: minX - 1, maxX: maxX + 1, minY: minY - 1, maxY: maxY + 1 };
  }
  
  const padX = Math.max(0.5, 0.1 * (rangeX || 2));
  const padY = Math.max(0.5, 0.1 * (rangeY || 2));
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
}

// --- Adaptive grid/ticks ---
function niceStep(raw: number) {
  if (!isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const frac = raw / Math.pow(10, exp);
  let niceFrac: number;
  if (frac < 1.5) niceFrac = 1;
  else if (frac < 3) niceFrac = 2;
  else if (frac < 7) niceFrac = 5;
  else niceFrac = 10;
  return niceFrac * Math.pow(10, exp);
}

function makeAdaptiveTicks(
  min: number,
  max: number,
  screenPixels: number,
  scale: number,
  targetPx = 80,
  maxTicks = 400
) {
  const range = max - min;
  if (range <= 0 || !isFinite(range)) return [min, max];
  
  // Adjust for scale to generate more ticks when zoomed out
  const effectiveRange = range / Math.max(scale, 0.1);
  const worldPerPx = effectiveRange / screenPixels;
  const rawStep = worldPerPx * targetPx;
  const step = niceStep(rawStep);
  
  if (!isFinite(step) || step <= 0) return [min, max];

  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  const numSteps = Math.ceil((end - start) / step);
  const N = Math.min(maxTicks, Math.max(3, numSteps + 1));
  
  for (let i = 0; i <= N; i++) {
    const t = start + i * step;
    if (t < min - step * 0.01) continue;
    if (t > max + step * 0.01) break;
    ticks.push(t);
  }
  
  // Always include at least min and max
  if (ticks.length === 0) {
    ticks.push(min, max);
  }
  
  return ticks;
}

// --------------------------- Styles ---------------------------
const S: any = {
  page: { padding: 16, fontFamily: "Inter, system-ui, Arial", color: "#111" },
  grid: { display: "grid", gridTemplateColumns: "520px 1fr", gap: 16 },
  panel: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" },
  h2: { margin: 0, marginBottom: 12 },
  sectionTitle: { fontWeight: 600, marginBottom: 8 },
  subLabel: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  input: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px", fontSize: 14, width: 80 },
  inputNarrow: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 8px", fontSize: 14, width: 96 },
  btnPrimary: {
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#f3f4f6",
    color: "#111827",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
  },
  btnDanger: {
    background: "#dc2626",
    color: "#fff",
    border: "1px solid #dc2626",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    width: 80,
    textAlign: "center" as const,
  },
  btnRed: {
    background: "#dc2626",
    color: "#fff",
    border: "1px solid #dc2626",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { textAlign: "left" as const, borderBottom: "1px solid #e5e7eb", padding: "6px 4px" },
  td: { borderTop: "1px solid #f3f4f6", padding: "6px 4px" },
  legendDot: (bg: string) => ({
    display: "inline-block" as const,
    width: 10,
    height: 10,
    borderRadius: 10,
    background: bg,
    marginRight: 6,
  }),
  tooltip: {
    position: "fixed" as const,
    display: "none" as const,
    pointerEvents: "none" as const,
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    fontSize: 12,
    padding: "6px 8px",
    borderRadius: 6,
    zIndex: 50,
  },
  centerBtn: {
    position: "absolute" as const,
    right: 12,
    bottom: 12,
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #e5e7eb",
    borderRadius: 9999,
    padding: "8px 12px",
    fontSize: 12,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },
};

// --------------------------- Component ---------------------------
export default function FineTuneWeb() {
  // Inputs - NOW USING STRINGS
  const [points, setPoints] = useState<PointInput[]>([
    { x: "", y: "", angle: "" },
  ]);
  const [segments, setSegments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [fineTuned, setFineTuned] = useState<Fine | null>(null);
  const [sequence, setSequence] = useState<PtA[] | null>(null);

  // View
  const W = 900,
    H = 560;
  const [manualBounds, setManualBounds] = useState<null | {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>(null);

  // Screen-space pan/zoom
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{ x: number; y: number } | null>(null);

  // Tooltip
  const tipRef = useRef<HTMLDivElement>(null);
  function showTip(html: string, cx: number, cy: number) {
    const el = tipRef.current;
    if (!el) return;
    el.style.display = "block";
    el.style.left = `${cx + 12}px`;
    el.style.top = `${cy + 12}px`;
    el.innerHTML = html;
  }
  function hideTip() {
    const el = tipRef.current;
    if (el) el.style.display = "none";
  }

  // Saved runs
  const [saved, setSaved] = useState<SavedRun[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("ft_saved_runs");
      return raw ? (JSON.parse(raw) as SavedRun[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ft_saved_runs", JSON.stringify(saved));
    }
  }, [saved]);

  // Dynamic segments: N points -> N-1 segments
  useEffect(() => {
    const need = Math.max(0, points.length - 1);
    setSegments((prev) => {
      const next = prev.slice(0, need);
      while (next.length < need) next.push("");
      return next;
    });
  }, [points.length]);

  function setPointAt(i: number, np: Partial<PointInput>) {
    setPoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...np } : p)));
  }
  function onAddPoint() {
    if (points.length < 6) setPoints((prev) => [...prev, { x: "", y: "", angle: "" }]);
  }
  function onClear() {
    setPoints([{ x: "", y: "", angle: "" }]);
    setFineTuned(null);
    setSequence(null);
  }
  function onRemoveRow(i: number) {
    setPoints((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateSeg(i: number, s: string) {
    setSegments((prev) => {
      const cp = prev.slice();
      cp[i] = s;
      return cp;
    });
  }

  // Compute
  async function onCompute() {
    setError(null);
    if (points.length < 1) {
      setError("Enter at least one point.");
      return;
    }
    const cleanPts: PtA[] = [];
    for (const p of points) {
      const xx = Number(p.x);
      const yy = Number(p.y);
      const aa = Number(p.angle);
      if (!Number.isFinite(xx) || !Number.isFinite(yy) || !Number.isFinite(aa)) {
        setError("All points require numeric X, Y, Angle.");
        return;
      }
      cleanPts.push({ x: xx, y: yy, angle: aa });
    }
    const segClean = segments.map((v) => {
      const num = Number(v);
      return Number.isFinite(num) ? num : 0;
    });

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ORIGIN}/fine_tune/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: cleanPts, segments: segClean }),
      });
      if (!res.ok) {
        setError(`API error ${res.status}`);
        return;
      }
      const json = await res.json();
      setFineTuned(json.fine_tuned);
      setSequence(json.sequence);
      setManualBounds(null);
      setScale(1);
      setPan({ x: 0, y: 0 });
    } catch (e: any) {
      setError(`Network error: ${e?.message ?? String(e)}`);
    }
  }

  // Plot data - convert string inputs to numbers for display
  const rawPts: Pt[] = useMemo(
    () =>
      points.map((p) => {
        const x = Number(p.x);
        const y = Number(p.y);
        return {
          x: Number.isFinite(x) ? x : 0,
          y: Number.isFinite(y) ? y : 0,
        };
      }),
    [points]
  );
  const seqPts: Pt[] = useMemo(
    () => (sequence ? sequence.map((p) => ({ x: p.x, y: p.y })) : []),
    [sequence]
  );
  
  // Include visible saved runs in bounds
  const allVisiblePts = useMemo(() => {
    const pts = [...rawPts, ...seqPts];
    saved.filter(r => r.visible).forEach(r => {
      r.seq.forEach(p => pts.push({ x: p.x, y: p.y }));
    });
    return pts;
  }, [rawPts, seqPts, saved]);
  
  const autoBounds = useMemo(() => computeBounds(allVisiblePts), [allVisiblePts]);
  const bounds = manualBounds ?? autoBounds;
  const view: Viewport = { ...bounds, w: W, h: H };

  // ADAPTIVE ticks
  const xticks = makeAdaptiveTicks(bounds.minX, bounds.maxX, W, scale);
  const yticks = makeAdaptiveTicks(bounds.minY, bounds.maxY, H, scale);

  // Base world->screen, then apply screen pan/zoom
  function worldToScreen(x: number, y: number, v: Viewport) {
    const sx0 = ((x - v.minX) / (v.maxX - v.minX)) * v.w;
    const sy0 = v.h - ((y - v.minY) / (v.maxY - v.minY)) * v.h;
    return { sx: sx0 * scale + pan.x, sy: sy0 * scale + pan.y };
  }

  // Dotted axis trimmed to last generated point
  const axisLine = useMemo(() => {
    if (!fineTuned || !sequence || sequence.length === 0) return null;
    const { mean_x, mean_y, mean_angle } = fineTuned;
    const { ux, uy } = unitFromAngleDeg(mean_angle);
    const a = { x: mean_x, y: mean_y };
    const last = sequence[sequence.length - 1];
    const t = (last.x - a.x) * ux + (last.y - a.y) * uy;
    const end = { x: a.x + t * ux, y: a.y + t * uy };
    return { a, b: end };
  }, [fineTuned, sequence]);

  const C = {
    raw: "#1f77b4",
    drop: "#000000",
    pick: "#16a34a",
    approach: "#9333ea",
    curve: "#dc2626",
    axis: "#6b7280",
  };

  // Saved runs
  function saveCurrent() {
    if (!fineTuned || !sequence) return;
    const name = window.prompt("Name this run:", "Station 1B");
    if (!name) return;
    const id = `${Date.now()}-${Math.random()}`;
    setSaved((prev) => [{ id, name, fine: fineTuned, seq: sequence, createdAt: Date.now(), visible: false }, ...prev]);
  }
  function deleteSaved(id: string) {
    setSaved((prev) => prev.filter((r) => r.id !== id));
  }
  function renameSaved(id: string) {
    const run = saved.find((r) => r.id === id);
    if (!run) return;
    const name = window.prompt("Edit name:", run.name);
    if (!name) return;
    setSaved((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  }
  function toggleSavedVisibility(id: string) {
    setSaved((prev) => prev.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r)));
  }
  function centerOnOutput() {
    if (!sequence || sequence.length === 0) return;
    setManualBounds(computeBounds(sequence.map((p) => ({ x: p.x, y: p.y }))));
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  // Wheel zoom (cursor-centric)
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    e.stopPropagation();
    
    const k = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const cx = e.clientX - rect.left,
      cy = e.clientY - rect.top;
    setPan((prev) => ({ x: cx - (cx - prev.x) * k, y: cy - (cy - prev.y) * k }));
    setScale((s) => Math.max(0.2, Math.min(10, s * k)));
  }

  // Middle-mouse drag
  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 1) return;
    e.preventDefault();
    setDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragging && lastMouse) {
      const dx = e.clientX - lastMouse.x,
        dy = e.clientY - lastMouse.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  }
  function onMouseUpOrLeave() {
    setDragging(false);
    setLastMouse(null);
  }

  return (
    <div style={S.page}>
      <style>
        {`
          @media (max-width: 1200px){
            .ft-grid{
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 48, width: "auto" }} />
        <h2 style={{ ...S.h2, marginBottom: 0 }}>Fine-Tune Points</h2>
      </div>
      
      <div className="ft-grid" style={{ ...S.grid, alignItems: "start" }}>
        {/* LEFT PANEL */}
        <div style={S.panel}>
          <div style={S.sectionTitle}>Points</div>
          {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 6 }}>{error}</div>}

          {/* Add point ABOVE */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button onClick={onAddPoint} style={S.btnSecondary}>
              Add point
            </button>
          </div>

          {/* Points grid */}
          <div style={{ display: "grid", gap: 20 }}>
            {points.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "35px 100px 100px 120px auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280", width: 24, textAlign: "right" }}>{i + 1}</div>

                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="X (m)"
                  value={p.x}
                  onChange={(e) => setPointAt(i, { x: e.currentTarget.value })}
                  autoComplete="off"
                  data-lpignore="true"
                  style={S.input}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Y (m)"
                  value={p.y}
                  onChange={(e) => setPointAt(i, { y: e.currentTarget.value })}
                  autoComplete="off"
                  data-lpignore="true"
                  style={S.input}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Angle (deg)"
                  value={p.angle}
                  onChange={(e) => setPointAt(i, { angle: e.currentTarget.value })}
                  autoComplete="off"
                  data-lpignore="true"
                  style={{ ...S.input, width: 90 }}
                />
                <button onClick={() => onRemoveRow(i)} style={S.btnDanger}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Segments */}
          <div style={{ marginTop: 60 }}>
            <div style={S.subLabel}>Segments (meters)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, max-content)", gap: 8 }}>
              {segments.map((s, i) => {
                const label = String.fromCharCode(65 + i); // A,B,C,...
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 12, width: 16, textAlign: "right", color: "#6b7280" }}>{label}</div>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={`${label} (m)`}
                      value={s}
                      onChange={(e) => updateSeg(i, e.currentTarget.value)}
                      autoComplete="off"
                      data-lpignore="true"
                      style={S.inputNarrow}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 40 }}>
            <button onClick={onCompute} style={S.btnRed}>
              Generate
            </button>
            <button onClick={onClear} style={S.btnSecondary}>
              Clear
            </button>
            <button onClick={saveCurrent} style={S.btnSecondary} disabled={!fineTuned || !sequence}>
              Save Point Data
            </button>
          </div>

          {/* Results on LEFT */}
          <div style={{ display: "block", marginTop: 60 }}>
            <div>
              <div style={S.sectionTitle}>Fine-Tuned / Generated</div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>X (m)</th>
                    <th style={S.th}>Y (m)</th>
                    <th style={S.th}>Angle (deg)</th>
                  </tr>
                </thead>
                <tbody>
                  {fineTuned && sequence ? (
                    <>
                      <tr style={{ color: C.drop }}>
                        <td style={S.td}>Drop (P0)</td>
                        <td style={S.td}>{fmt3(sequence[0].x)}</td>
                        <td style={S.td}>{fmt3(sequence[0].y)}</td>
                        <td style={S.td}>{fmt3(sequence[0].angle)}</td>
                      </tr>
                      {sequence.slice(1).map((p, i) => {
                        const color = [C.pick, C.approach, C.curve][i] ?? "#111";
                        const name = ["Pick (P1)", "Approach (P2)", "Curve (P3)"][i] ?? `P${i + 1}`;
                        return (
                          <tr key={i + 1} style={{ color }}>
                            <td style={S.td}>{name}</td>
                            <td style={S.td}>{fmt3(p.x)}</td>
                            <td style={S.td}>{fmt3(p.y)}</td>
                            <td style={S.td}>{fmt3(p.angle)}</td>
                          </tr>
                        );
                      })}
                    </>
                  ) : (
                    <tr>
                      <td style={S.td} colSpan={4}>
                        &nbsp;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <div style={S.sectionTitle}>Standard Deviations</div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Metric</th>
                    <th style={S.th}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {fineTuned ? (
                    <>
                      <tr>
                        <td style={S.td}>Std Dev X (mm)</td>
                        <td style={S.td}>{fmt3(fineTuned.std_x_mm)}</td>
                      </tr>
                      <tr>
                        <td style={S.td}>Std Dev Y (mm)</td>
                        <td style={S.td}>{fmt3(fineTuned.std_y_mm)}</td>
                      </tr>
                      <tr>
                        <td style={S.td}>Angle Std Dev (deg)</td>
                        <td style={S.td}>{fmt3(fineTuned.std_angle_deg)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td style={S.td} colSpan={2}>
                        &nbsp;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={S.panel}>
          <div style={S.sectionTitle}>Graph</div>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              gap: 28,
              fontSize: 14,
              color: "#374151",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <span>
              <span style={S.legendDot(C.raw)} />
              Input Points
            </span>
            <span>
              <span style={S.legendDot(C.drop)} />
              Drop (P0)
            </span>
            <span>
              <span style={S.legendDot(C.pick)} />
              Pick (P1)
            </span>
            <span>
              <span style={S.legendDot(C.approach)} />
              Approach (P2)
            </span>
            <span>
              <span style={S.legendDot(C.curve)} />
              Curve (P3)
            </span>
          </div>

          <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
            <div ref={tipRef} style={S.tooltip} />
            <svg
              width="100%"
              viewBox={`0 0 ${W} ${H}`}
              style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, touchAction: "none" }}
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUpOrLeave}
              onMouseLeave={onMouseUpOrLeave}
            >
              {/* Grid */}
              {xticks.map((xv, idx) => {
                const { sx } = worldToScreen(xv, bounds.minY, view);
                return <line key={`vg-${idx}`} x1={sx} y1={0} x2={sx} y2={H} stroke="#f3f4f6" />;
              })}
              {yticks.map((yv, idx) => {
                const { sy } = worldToScreen(bounds.minX, yv, view);
                return <line key={`hg-${idx}`} x1={0} y1={sy} x2={W} y2={sy} stroke="#f3f4f6" />;
              })}
              {/* Axes labels */}
              {xticks.map((xv, idx) => {
                const { sx } = worldToScreen(xv, bounds.minY, view);
                return (
                  <text key={`xt-${idx}`} x={sx + 2} y={H - 4} fontSize={10} fill="#6b7280">
                    {fmt3(xv)}
                  </text>
                );
              })}
              {yticks.map((yv, idx) => {
                const { sy } = worldToScreen(bounds.minX, yv, view);
                return (
                  <text key={`yt-${idx}`} x={2} y={sy - 2} fontSize={10} fill="#6b7280">
                    {fmt3(yv)}
                  </text>
                );
              })}

              {/* Dotted axis (trimmed) */}
              {fineTuned &&
                axisLine &&
                (() => {
                  const a = worldToScreen(axisLine.a.x, axisLine.a.y, view);
                  const b = worldToScreen(axisLine.b.x, axisLine.b.y, view);
                  return (
                    <line
                      x1={a.sx}
                      y1={a.sy}
                      x2={b.sx}
                      y2={b.sy}
                      stroke={C.axis}
                      strokeWidth={2}
                      strokeDasharray="6 6"
                    />
                  );
                })()}

              {/* Raw input points with hover (x,y) */}
              {rawPts.map((p, i) => {
                const { sx, sy } = worldToScreen(p.x, p.y, view);
                return (
                  <circle
                    key={`raw-${i}`}
                    cx={sx}
                    cy={sy}
                    r={5}
                    fill={C.raw}
                    onMouseMove={(e) =>
                      showTip(
                        `Input P${i + 1}<br/>x: ${fmt3(p.x)} m<br/>y: ${fmt3(p.y)} m`,
                        e.clientX,
                        e.clientY
                      )
                    }
                    onMouseLeave={hideTip}
                  />
                );
              })}

              {/* Generated points with hover (x,y,angle) */}
              {sequence &&
                sequence.map((p, i) => {
                  const { sx, sy } = worldToScreen(p.x, p.y, view);
                  const fill = [C.drop, C.pick, C.approach, C.curve][i] ?? C.raw;
                  const name =
                    ["Drop (P0)", "Pick (P1)", "Approach (P2)", "Curve (P3)"][i] ?? `P${i}`;
                  return (
                    <circle
                      key={`seq-${i}`}
                      cx={sx}
                      cy={sy}
                      r={6}
                      fill={fill}
                      stroke="#111827"
                      strokeWidth={i === 0 ? 1 : 0}
                      onMouseMove={(e) =>
                        showTip(
                          `${name}<br/>x: ${fmt3(p.x)} m<br/>y: ${fmt3(p.y)} m<br/>angle: ${fmt3(
                            p.angle
                          )}°`,
                          e.clientX,
                          e.clientY
                        )
                      }
                      onMouseLeave={hideTip}
                    />
                  );
                })}
              
              {/* Overlay saved runs that are marked visible */}
              {saved.filter(r => r.visible).map((run) => (
                <g key={`saved-${run.id}`} opacity={0.6}>
                  {/* Draw lines between points */}
                  {run.seq.slice(0, -1).map((p, i) => {
                    const p1 = worldToScreen(p.x, p.y, view);
                    const p2 = worldToScreen(run.seq[i + 1].x, run.seq[i + 1].y, view);
                    return (
                      <line
                        key={`saved-line-${run.id}-${i}`}
                        x1={p1.sx}
                        y1={p1.sy}
                        x2={p2.sx}
                        y2={p2.sy}
                        stroke="#888"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      />
                    );
                  })}
                  {/* Draw points */}
                  {run.seq.map((p, i) => {
                    const { sx, sy } = worldToScreen(p.x, p.y, view);
                    const fill = [C.drop, C.pick, C.approach, C.curve][i] ?? C.raw;
                    const name = ["Drop (P0)", "Pick (P1)", "Approach (P2)", "Curve (P3)"][i] ?? `P${i}`;
                    return (
                      <circle
                        key={`saved-${run.id}-${i}`}
                        cx={sx}
                        cy={sy}
                        r={5}
                        fill={fill}
                        stroke="#ffffff"
                        strokeWidth={1}
                        onMouseMove={(e) =>
                          showTip(
                            `${run.name} - ${name}<br/>x: ${fmt3(p.x)} m<br/>y: ${fmt3(p.y)} m<br/>angle: ${fmt3(p.angle)}°`,
                            e.clientX,
                            e.clientY
                          )
                        }
                        onMouseLeave={hideTip}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>

            <button onClick={centerOnOutput} style={S.centerBtn}>
              Center
            </button>
          </div>

          {/* Saved runs under graph */}
          <div style={{ marginTop: 24 }}>
            <div style={S.sectionTitle}>Saved Point Data</div>
            {saved.length === 0 ? (
              <div style={{ fontSize: 12, color: "#6b7280" }}>No saved data.</div>
            ) : (
              saved.map((r) => (
                <div
                  key={r.id}
                  style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={r.visible || false}
                          onChange={() => toggleSavedVisibility(r.id)}
                        />
                        Show on graph
                      </label>
                      <button onClick={() => renameSaved(r.id)} style={S.btnSecondary}>
                        Rename
                      </button>
                      <button onClick={() => deleteSaved(r.id)} style={S.btnDanger}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <SavedTabs run={r} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedTabs({ run }: { run: SavedRun }) {
  const [tab, setTab] = useState<"gen" | "sd">("gen");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => setTab("gen")}
          style={{
            ...S.btnSecondary,
            background: tab === "gen" ? "#e5e7eb" : "#f3f4f6",
          }}
        >
          Generated
        </button>
        <button
          onClick={() => setTab("sd")}
          style={{
            ...S.btnSecondary,
            background: tab === "sd" ? "#e5e7eb" : "#f3f4f6",
          }}
        >
          Standard Deviation
        </button>
      </div>

      {tab === "gen" ? (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>X (m)</th>
              <th style={S.th}>Y (m)</th>
              <th style={S.th}>Angle (deg)</th>
            </tr>
          </thead>
          <tbody>
            {run.seq.map((p, i) => {
              const names = ["Drop (P0)", "Pick (P1)", "Approach (P2)", "Curve (P3)"];
              const colors = ["#000000", "#16a34a", "#9333ea", "#dc2626"];
              return (
                <tr key={i} style={{ color: colors[i] ?? "#111" }}>
                  <td style={S.td}>{names[i] ?? `P${i}`}</td>
                  <td style={S.td}>{fmt3(p.x)}</td>
                  <td style={S.td}>{fmt3(p.y)}</td>
                  <td style={S.td}>{fmt3(p.angle)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Metric</th>
              <th style={S.th}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>Std Dev X (mm)</td>
              <td style={S.td}>{fmt3(run.fine.std_x_mm)}</td>
            </tr>
            <tr>
              <td style={S.td}>Std Dev Y (mm)</td>
              <td style={S.td}>{fmt3(run.fine.std_y_mm)}</td>
            </tr>
            <tr>
              <td style={S.td}>Angle Std Dev (deg)</td>
              <td style={S.td}>{fmt3(run.fine.std_angle_deg)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}