"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback, CSSProperties } from "react";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

type NodeOccurrence = {
  nodeId: string;
  parentId?: string;
  parentType?: string;
  path: string;
};

type AnalysisResult = {
  duplicates: string[];
  occurrences: Map<string, NodeOccurrence[]>;
  totalNodes: number;
};

type FileData = {
  name: string;
  data: unknown;
  analyzedAt: number;
};

type WorkingState = {
  fileName: string | null;
  duplicates: string[];
  occurrences: [string, NodeOccurrence[]][];
  totalNodes: number;
  searchQuery: string;
};

// ==========================================
// 2. CONSTANTS & CONFIGURATION
// ==========================================

const CONFIG = {
  LOCALSTORAGE_KEY: "pk_working_state",
  DEBOUNCE_MS: 500,
  PAGE_SIZE: 50,
} as const;

const COLORS = {
  primary: "#ff0000",
  focus: "#2563eb",
  danger: "#dc2626",
  success: "#16a34a",
  warning: "#f59e0b",
  text: "#111",
  textSecondary: "#374151",
  textMuted: "#6b7280",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  bgPage: "#f8fafc",
  bgCard: "#ffffff",
  bgHover: "#f8fafc",
} as const;

// ==========================================
// 3. STYLES
// ==========================================

const S: Record<string, CSSProperties> = {
  page: {
    padding: 20,
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: COLORS.text,
    maxWidth: 900,
    margin: "0 auto",
    background: COLORS.bgPage,
    minHeight: "100vh",
  },
  header: {
    marginBottom: 20,
  },
  h1: {
    margin: 0,
    marginBottom: 4,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    margin: 0,
  },
  panel: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: 16,
    background: COLORS.bgCard,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    marginBottom: 16,
  },
  dropZone: {
    border: `2px dashed ${COLORS.border}`,
    borderRadius: 10,
    padding: 40,
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s",
    background: COLORS.bgCard,
  },
  dropZoneActive: {
    borderColor: COLORS.focus,
    background: "#eff6ff",
  },
  dropZoneText: {
    fontSize: 14,
    color: COLORS.textMuted,
    margin: 0,
  },
  dropZoneHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#f0fdf4",
    border: `1px solid ${COLORS.success}`,
    borderRadius: 8,
    marginBottom: 16,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.success,
  },
  btnBase: {
    borderRadius: 6,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    border: "1px solid transparent",
    transition: "background-color 0.15s, opacity 0.15s, transform 0.1s",
  },
  btnPrimary: {
    background: COLORS.primary,
    color: "#fff",
    borderColor: COLORS.primary,
    fontWeight: 600,
  },
  btnSecondary: {
    background: COLORS.bgPage,
    color: COLORS.textSecondary,
    borderColor: COLORS.border,
  },
  btnDanger: {
    background: "#fef2f2",
    color: COLORS.danger,
    borderColor: "#fecaca",
  },
  errorBox: {
    color: COLORS.danger,
    fontSize: 12,
    marginBottom: 16,
    padding: "8px 10px",
    background: "#fef2f2",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #fecaca",
  },
  statsRow: {
    display: "flex",
    gap: 20,
    marginBottom: 16,
  },
  stat: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.text,
  },
  searchContainer: {
    position: "relative" as const,
    marginBottom: 16,
  },
  searchInput: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    padding: "8px 10px",
    paddingRight: 80,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
    background: COLORS.bgCard,
  },
  searchHint: {
    position: "absolute" as const,
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 11,
    color: COLORS.textMuted,
    pointerEvents: "none" as const,
  },
  nodeCard: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
    background: COLORS.bgCard,
    transition: "border-color 0.15s, box-shadow 0.15s",
    overflow: "hidden",
  },
  nodeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    cursor: "pointer",
    transition: "background-color 0.15s",
  },
  nodeId: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "monospace",
    color: COLORS.text,
  },
  badge: {
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 10px",
    borderRadius: 12,
    background: `${COLORS.warning}20`,
    color: COLORS.warning,
  },
  occurrenceList: {
    fontSize: 12,
    color: COLORS.textSecondary,
    padding: "0 12px 12px 12px",
    borderTop: `1px solid ${COLORS.borderLight}`,
  },
  occurrenceItem: {
    padding: "8px 0",
    borderBottom: `1px solid ${COLORS.borderLight}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  copyBtn: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 4,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bgPage,
    cursor: "pointer",
    color: COLORS.textMuted,
    transition: "background-color 0.15s, border-color 0.15s",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: 40,
    color: COLORS.textMuted,
    fontSize: 14,
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.02em",
  },
  processingOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(255, 255, 255, 0.9)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  spinner: {
    width: 40,
    height: 40,
    border: `3px solid ${COLORS.border}`,
    borderTopColor: COLORS.primary,
    borderRadius: "50%",
    marginBottom: 16,
  },
  loadMoreBtn: {
    width: "100%",
    padding: "12px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    background: COLORS.bgCard,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.textSecondary,
    transition: "background-color 0.15s, border-color 0.15s",
    marginTop: 8,
  },
  paginationInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
};

// ==========================================
// 4. UTILITY FUNCTIONS
// ==========================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function findVisualNodeDuplicates(data: unknown): AnalysisResult {
  const occurrences = new Map<string, NodeOccurrence[]>();
  let totalNodes = 0;

  function search(obj: unknown, path: string, parentId?: string, parentType?: string) {
    if (obj && typeof obj === "object") {
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => search(item, `${path}[${i}]`, parentId, parentType));
      } else {
        const record = obj as Record<string, unknown>;
        // Capture this object's id and type for child context
        const thisId = (record.id as string) ?? (record.nodeId as string) ?? undefined;
        const thisType = (record.type as string) ?? (record.nodeType as string) ?? undefined;

        for (const [key, value] of Object.entries(record)) {
          if (key === "visualNode" && typeof value === "string") {
            totalNodes++;
            const occurrence: NodeOccurrence = {
              nodeId: value,
              parentId: thisId ?? parentId,
              parentType: thisType ?? parentType,
              path: `${path}.${key}`,
            };
            const list = occurrences.get(value) || [];
            list.push(occurrence);
            occurrences.set(value, list);
          }
          search(value, `${path}.${key}`, thisId ?? parentId, thisType ?? parentType);
        }
      }
    }
  }

  search(data, "root");

  // Filter to only duplicates (2+ occurrences)
  const duplicates = [...occurrences.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([nodeId]) => nodeId);

  return { duplicates, occurrences, totalNodes };
}

// ==========================================
// 5. COMPONENTS
// ==========================================

function NodeCard({ 
  nodeId, 
  occurrences, 
  onCopy,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: { 
  nodeId: string; 
  occurrences: NodeOccurrence[]; 
  onCopy: (text: string) => void;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleHeaderClick = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const handleCopyClick = useCallback((e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    onCopy(text);
  }, [onCopy]);

  return (
    <div 
      style={{
        ...S.nodeCard,
        ...(isHovered ? { borderColor: COLORS.focus, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" } : {}),
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Clickable header */}
      <div 
        style={{
          ...S.nodeHeader,
          background: isHovered ? COLORS.bgHover : "transparent",
        }}
        onClick={handleHeaderClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleHeaderClick();
          }
        }}
        aria-expanded={expanded}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 12 }}>
            {expanded ? "▼" : "▶"}
          </span>
          <span style={S.nodeId}>{nodeId}</span>
          <button
            style={S.copyBtn}
            onClick={(e) => handleCopyClick(e, nodeId)}
            title="Copy node ID"
          >
            Copy
          </button>
        </div>
        <span style={S.badge}>
          {occurrences.length} {occurrences.length === 1 ? "segment" : "segments"}
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={S.occurrenceList}>
          <div style={{ paddingTop: 8 }}>
            {occurrences.map((occ, i) => (
              <div 
                key={i} 
                style={{
                  ...S.occurrenceItem,
                  borderBottom: i === occurrences.length - 1 ? "none" : S.occurrenceItem.borderBottom,
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  {occ.parentId ? (
                    <>
                      <span style={{ color: COLORS.textMuted }}>Segment:</span>{" "}
                      <code style={{ background: COLORS.bgHover, padding: "2px 6px", borderRadius: 4 }}>
                        {occ.parentId}
                      </code>
                      {occ.parentType && (
                        <span style={{ color: COLORS.textMuted, marginLeft: 8 }}>
                          ({occ.parentType})
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: COLORS.textMuted }}>Unknown parent</span>
                  )}
                </span>
                {occ.parentId && (
                  <button
                    style={S.copyBtn}
                    onClick={(e) => handleCopyClick(e, occ.parentId!)}
                    title="Copy segment ID"
                  >
                    Copy
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessingOverlay({ fileName }: { fileName: string }) {
  return (
    <div style={S.processingOverlay}>
      <div 
        style={S.spinner}
        className="pk-spinner"
      />
      <p style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, margin: 0 }}>
        Analyzing file...
      </p>
      <p style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
        {fileName}
      </p>
    </div>
  );
}

// ==========================================
// 6. MAIN COMPONENT
// ==========================================

export default function PainKillerWeb() {
  // State
  const [file, setFile] = useState<FileData | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [occurrences, setOccurrences] = useState<Map<string, NodeOccurrence[]>>(new Map());
  const [totalNodes, setTotalNodes] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFileName, setProcessingFileName] = useState("");
  const [visibleCount, setVisibleCount] = useState<number>(CONFIG.PAGE_SIZE);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const raw = typeof window !== "undefined" 
      ? window.localStorage.getItem(CONFIG.LOCALSTORAGE_KEY) 
      : null;
    if (raw) {
      try {
        const state: WorkingState = JSON.parse(raw);
        if (state.fileName) {
          setFile({ name: state.fileName, data: null, analyzedAt: Date.now() });
        }
        if (state.duplicates) setDuplicates(state.duplicates);
        if (state.occurrences) {
          setOccurrences(new Map(state.occurrences));
        }
        if (state.totalNodes) setTotalNodes(state.totalNodes);
        if (state.searchQuery) setSearchQuery(state.searchQuery);
      } catch { /* ignore parse errors */ }
    }
  }, []);

  // Save to localStorage with debounce
  const workingState: WorkingState = useMemo(() => ({
    fileName: file?.name ?? null,
    duplicates,
    occurrences: [...occurrences.entries()],
    totalNodes,
    searchQuery,
  }), [file?.name, duplicates, occurrences, totalNodes, searchQuery]);

  const debouncedState = useDebounce(workingState, CONFIG.DEBOUNCE_MS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CONFIG.LOCALSTORAGE_KEY, JSON.stringify(debouncedState));
      } catch { /* ignore storage errors */ }
    }
  }, [debouncedState]);

  // Filtered duplicates based on search
  const filteredDuplicates = useMemo(() => {
    if (!searchQuery.trim()) return duplicates;
    const query = searchQuery.toLowerCase();
    return duplicates.filter(nodeId => nodeId.toLowerCase().includes(query));
  }, [duplicates, searchQuery]);

  // Paginated duplicates
  const visibleDuplicates = useMemo(() => {
    return filteredDuplicates.slice(0, visibleCount);
  }, [filteredDuplicates, visibleCount]);

  const hasMore = visibleCount < filteredDuplicates.length;

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(CONFIG.PAGE_SIZE);
  }, [searchQuery]);

  // Auto-focus search after file loads
  useEffect(() => {
    if (file && duplicates.length > 0 && searchInputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [file, duplicates.length]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && file && !isProcessing) {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [file, isProcessing]);

  // File handling
  const processFile = useCallback((fileContent: string, fileName: string) => {
    setError(null);
    setIsProcessing(true);
    setProcessingFileName(fileName);

    // Use setTimeout to allow the UI to update before processing
    setTimeout(() => {
      try {
        const data = JSON.parse(fileContent);
        const result = findVisualNodeDuplicates(data);
        
        setFile({ name: fileName, data, analyzedAt: Date.now() });
        setDuplicates(result.duplicates);
        setOccurrences(result.occurrences);
        setTotalNodes(result.totalNodes);
        setVisibleCount(CONFIG.PAGE_SIZE);
      } catch (e) {
        setError(`Failed to parse JSON file: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        setIsProcessing(false);
        setProcessingFileName("");
      }
    }, 50);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFile(content, selectedFile.name);
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsText(selectedFile);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processFile(content, droppedFile.name);
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsText(droppedFile);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setDuplicates([]);
    setOccurrences(new Map());
    setTotalNodes(0);
    setSearchQuery("");
    setError(null);
    setVisibleCount(CONFIG.PAGE_SIZE);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    localStorage.removeItem(CONFIG.LOCALSTORAGE_KEY);
  }, []);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(text);
      setTimeout(() => setCopyFeedback(null), 1500);
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + CONFIG.PAGE_SIZE);
  }, []);

  const handleShowAll = useCallback(() => {
    setVisibleCount(filteredDuplicates.length);
  }, [filteredDuplicates.length]);

  return (
    <div style={S.page}>
      {/* Processing overlay */}
      {isProcessing && <ProcessingOverlay fileName={processingFileName} />}

      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>Thomas&apos;s Pain Killer</h1>
        <p style={S.subtitle}>
          Detect duplicate visualNode entries that may cause AMR pathing issues in Synoas integrations
        </p>
      </div>

      {/* Copy feedback toast */}
      {copyFeedback && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: COLORS.success,
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 6,
          fontSize: 13,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 100,
        }}>
          Copied: {copyFeedback}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={S.errorBox}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* File upload zone */}
      {!file && !isProcessing && (
        <div
          style={{
            ...S.dropZone,
            ...(isDragging ? S.dropZoneActive : {}),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <p style={S.dropZoneText}>
            {isDragging ? "Drop file here..." : "Drop a layout JSON file here, or click to select"}
          </p>
          <p style={S.dropZoneHint}>Accepts .json files</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* File loaded - show results */}
      {file && !isProcessing && (
        <>
          {/* File info bar */}
          <div style={S.fileInfo}>
            <span style={S.fileName}>✓ {file.name}</span>
            <button
              style={{ ...S.btnBase, ...S.btnDanger }}
              onClick={handleClear}
            >
              Clear
            </button>
          </div>

          {/* Stats */}
          <div style={S.panel}>
            <div style={S.statsRow}>
              <div style={S.stat}>
                <span style={S.statLabel}>Total Nodes</span>
                <span style={S.statValue}>{totalNodes.toLocaleString()}</span>
              </div>
              <div style={S.stat}>
                <span style={S.statLabel}>Duplicates</span>
                <span style={{
                  ...S.statValue,
                  color: duplicates.length > 0 ? COLORS.warning : COLORS.success,
                }}>
                  {duplicates.length.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Results panel */}
          <div style={S.panel}>
            <h2 style={S.sectionTitle}>Duplicate Nodes</h2>

            {duplicates.length > 0 ? (
              <>
                {/* Search input with hint */}
                <div style={S.searchContainer}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    style={S.searchInput}
                    placeholder="Search by node ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span style={S.searchHint}>Press / to search</span>
                </div>

                {/* Pagination info */}
                <div style={S.paginationInfo}>
                  <span>
                    {searchQuery 
                      ? `Showing ${Math.min(visibleCount, filteredDuplicates.length)} of ${filteredDuplicates.length} matches`
                      : `Showing ${Math.min(visibleCount, filteredDuplicates.length)} of ${filteredDuplicates.length} duplicates`
                    }
                  </span>
                  {hasMore && (
                    <button
                      style={{ ...S.copyBtn, padding: "4px 10px" }}
                      onClick={handleShowAll}
                    >
                      Show all
                    </button>
                  )}
                </div>

                {/* Node cards */}
                {visibleDuplicates.length > 0 ? (
                  <>
                    {visibleDuplicates.map((nodeId) => (
                      <NodeCard
                        key={nodeId}
                        nodeId={nodeId}
                        occurrences={occurrences.get(nodeId) || []}
                        onCopy={handleCopy}
                        isHovered={hoveredNodeId === nodeId}
                        onMouseEnter={() => setHoveredNodeId(nodeId)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                      />
                    ))}

                    {/* Load more button */}
                    {hasMore && (
                      <button
                        style={S.loadMoreBtn}
                        onClick={handleLoadMore}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = COLORS.bgHover;
                          e.currentTarget.style.borderColor = COLORS.focus;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = COLORS.bgCard;
                          e.currentTarget.style.borderColor = COLORS.border;
                        }}
                      >
                        Load {Math.min(CONFIG.PAGE_SIZE, filteredDuplicates.length - visibleCount)} more...
                      </button>
                    )}
                  </>
                ) : (
                  <div style={S.emptyState}>
                    <span style={{ fontSize: 24, marginBottom: 8, display: "block" }}>🔍</span>
                    No duplicates match &quot;{searchQuery}&quot;
                  </div>
                )}
              </>
            ) : (
              <div style={S.emptyState}>
                <span style={{ fontSize: 32, marginBottom: 8, display: "block" }}>✓</span>
                No duplicate visual nodes found!
              </div>
            )}
          </div>
        </>
      )}

      {/* Styles */}
      <style>{`
        input:focus, button:focus-visible {
          outline: 2px solid ${COLORS.focus};
          outline-offset: 2px;
        }
        button:active {
          transform: scale(0.98);
        }
        .pk-spinner {
          animation: pk-spin 0.8s linear infinite;
        }
        @keyframes pk-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
