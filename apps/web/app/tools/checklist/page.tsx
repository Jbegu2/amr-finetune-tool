"use client";

import React, { useState, useEffect, useCallback, useMemo, memo, useId, CSSProperties } from "react";
import { colors, spacing, styles, buttonStyle, modalStyles } from "../../../lib/theme";

// ==========================================
// TYPES
// ==========================================

interface ChecklistItem {
  id: string;
  name: string;
  hasNotes: boolean;
}

interface ChecklistItemState {
  id: string;
  name: string;
  completed: boolean;
  notes: string;
  hasNotes: boolean;
}

interface SavedChecklist {
  id: string;
  amrNumber: string;
  projectSite: string;
  items: ChecklistItemState[];
  createdAt: number;
  updatedAt: number;
}

type Phase = "list" | "setup" | "active";

// ==========================================
// CONSTANTS
// ==========================================

const LOCALSTORAGE_KEY = "integration_checklists";

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "pc-image", name: "PC Image", hasNotes: false },
  { id: "pc-software", name: "PC Software", hasNotes: false },
  { id: "amr-id", name: "Set AMR ID in AMR Studio", hasNotes: false },
  { id: "alphasense", name: "Document alphasense number", hasNotes: true },
  { id: "plc-firmware", name: "PLC Firmware", hasNotes: false },
  { id: "plc-software", name: "PLC Software", hasNotes: false },
  { id: "plc-sfp", name: "PLC Safety Function Parameters (PLC SFP)", hasNotes: false },
  { id: "vslam", name: "Vslam", hasNotes: false },
  { id: "scalance-firmware", name: "Scalance Firmware", hasNotes: false },
  { id: "scalance-configpack", name: "Scalance Configpack", hasNotes: false },
  { id: "scalance-id", name: "Set Scalance ID", hasNotes: false },
  { id: "mac-address", name: "Document AMR MAC address", hasNotes: true },
  { id: "vehicle-ip", name: "Document Vehicle IP Address", hasNotes: true },
  { id: "front-laser", name: "Front Laser Scanner", hasNotes: true },
  { id: "rear-laser", name: "Rear Laser Scanner", hasNotes: true },
  { id: "front-hmi", name: "Front HMI", hasNotes: false },
  { id: "rear-hmi", name: "Rear HMI", hasNotes: false },
  { id: "vslam-pair", name: "Pair to Vslam Server", hasNotes: false },
  { id: "zero-cal", name: "Zero Calibration", hasNotes: false },
  { id: "mag-strip", name: "Mag Strip Calibration", hasNotes: false },
];

const ACCENT_COLOR = colors.warning; // #f59e0b

// ==========================================
// STYLES
// ==========================================

const S: Record<string, CSSProperties> = {
  page: {
    ...styles.page,
    maxWidth: 900,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
  },
  h1: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  card: {
    ...styles.card,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...styles.sectionTitle,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    background: colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: "100%",
    background: ACCENT_COLOR,
    borderRadius: 4,
    transition: "width 0.3s ease",
  },
  progressText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  checklistItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: spacing.lg,
    padding: spacing.lg,
    background: colors.bgPage,
    borderRadius: 6,
    border: `1px solid ${colors.borderLight}`,
    marginBottom: spacing.lg,
  },
  checklistItemCompleted: {
    background: `${ACCENT_COLOR}08`,
    borderColor: `${ACCENT_COLOR}30`,
  },
  checkbox: {
    width: 20,
    height: 20,
    accentColor: ACCENT_COLOR,
    cursor: "pointer",
    flexShrink: 0,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemNameCompleted: {
    textDecoration: "line-through",
    color: colors.textMuted,
  },
  notesInput: {
    ...styles.input,
    marginTop: spacing.sm,
    fontSize: 13,
    padding: "6px 10px",
  },
  savedCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    background: colors.bgCard,
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.md,
    cursor: "pointer",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  savedInfo: {
    flex: 1,
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  savedMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  savedProgress: {
    fontSize: 12,
    fontWeight: 500,
    color: ACCENT_COLOR,
    marginLeft: spacing.lg,
  },
  emptyState: {
    textAlign: "center",
    padding: 40,
    color: colors.textMuted,
    fontSize: 14,
  },
  formGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  setupItem: {
    display: "flex",
    alignItems: "center",
    gap: spacing.md,
    padding: "8px 10px",
    background: colors.bgPage,
    borderRadius: 5,
    marginBottom: spacing.sm,
    cursor: "pointer",
    userSelect: "none",
  },
  setupCheckbox: {
    width: 16,
    height: 16,
    accentColor: ACCENT_COLOR,
    cursor: "pointer",
  },
  buttonGroup: {
    display: "flex",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: spacing.sm,
  },
};

const focusRingStyle = `
  input:focus, select:focus, button:focus-visible {
    outline: 2px solid ${colors.focus};
    outline-offset: 2px;
  }
  button:active { transform: scale(0.98); }
`;

// ==========================================
// UTILITIES
// ==========================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadFromStorage(): SavedChecklist[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(checklists: SavedChecklist[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(checklists));
  } catch (e) {
    console.error("Failed to save to localStorage:", e);
  }
}

// ==========================================
// COMPONENTS
// ==========================================

// Primary button with accent color
function AccentButton({ 
  children, 
  onClick, 
  disabled, 
  style 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonStyle("primary"),
        background: ACCENT_COLOR,
        borderColor: ACCENT_COLOR,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Professional custom checkbox
function Checkbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        border: `2px solid ${checked ? ACCENT_COLOR : colors.border}`,
        background: checked ? ACCENT_COLOR : colors.bgCard,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        flexShrink: 0,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.white}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

// Confirm delete modal
const ConfirmModal = memo(function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      else if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <div style={modalStyles.overlay} onClick={onCancel} role="dialog" aria-modal="true">
      <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: 0, marginBottom: 16, fontSize: 14, color: colors.textMuted }}>{message}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={buttonStyle("secondary")}>Cancel</button>
          <button 
            onClick={onConfirm} 
            style={{ 
              ...buttonStyle("primary"), 
              background: colors.danger, 
              borderColor: colors.danger 
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
});

// Saved checklists list view
const SavedChecklistsList = memo(function SavedChecklistsList({
  checklists,
  onSelect,
  onDelete,
  onNew,
}: {
  checklists: SavedChecklist[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<SavedChecklist | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, checklist: SavedChecklist) => {
    e.stopPropagation();
    setDeleteTarget(checklist);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl }}>
        <h2 style={S.sectionTitle}>Saved Checklists</h2>
        <AccentButton onClick={onNew}>+ New Checklist</AccentButton>
      </div>

      {checklists.length === 0 ? (
        <div style={S.emptyState}>
          <p style={{ marginBottom: spacing.lg }}>No saved checklists yet.</p>
          <AccentButton onClick={onNew}>Create Your First Checklist</AccentButton>
        </div>
      ) : (
        <div>
          {checklists.map((checklist) => {
            const completed = checklist.items.filter((i) => i.completed).length;
            const total = checklist.items.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={checklist.id}
                style={S.savedCard}
                onClick={() => onSelect(checklist.id)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(checklist.id)}
                tabIndex={0}
                role="button"
                aria-label={`Open checklist for AMR ${checklist.amrNumber}`}
              >
                <div style={S.savedInfo}>
                  <div style={S.savedTitle}>
                    AMR {checklist.amrNumber} — {checklist.projectSite}
                  </div>
                  <div style={S.savedMeta}>
                    Updated {formatDate(checklist.updatedAt)}
                  </div>
                </div>
                <div style={S.savedProgress}>
                  {completed}/{total} ({percent}%)
                </div>
                <button
                  onClick={(e) => handleDeleteClick(e, checklist)}
                  style={{
                    ...buttonStyle("danger"),
                    marginLeft: spacing.md,
                    padding: "4px 10px",
                  }}
                  aria-label={`Delete checklist for AMR ${checklist.amrNumber}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Checklist"
          message={`Are you sure you want to delete the checklist for AMR ${deleteTarget.amrNumber}? This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
});

// Setup phase - configure new checklist
const SetupPhase = memo(function SetupPhase({
  onConfirm,
  onCancel,
}: {
  onConfirm: (amrNumber: string, projectSite: string, items: ChecklistItem[]) => void;
  onCancel: () => void;
}) {
  const [amrNumber, setAmrNumber] = useState("");
  const [projectSite, setProjectSite] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(DEFAULT_CHECKLIST_ITEMS.map((i) => i.id))
  );
  const [useDefaults, setUseDefaults] = useState(true);

  const amrInputId = useId();
  const projectInputId = useId();

  const handleToggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(DEFAULT_CHECKLIST_ITEMS.map((i) => i.id)));
  };

  const handleClearAll = () => {
    setSelectedItems(new Set());
  };

  const handleToggleDefaults = () => {
    if (useDefaults) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(DEFAULT_CHECKLIST_ITEMS.map((i) => i.id)));
    }
    setUseDefaults(!useDefaults);
  };

  const handleSubmit = () => {
    if (!amrNumber.trim() || !projectSite.trim() || selectedItems.size === 0) return;
    
    const items = DEFAULT_CHECKLIST_ITEMS.filter((i) => selectedItems.has(i.id));
    onConfirm(amrNumber.trim(), projectSite.trim(), items);
  };

  const isValid = amrNumber.trim() && projectSite.trim() && selectedItems.size > 0;

  return (
    <div>
      <h2 style={S.sectionTitle}>New Checklist Setup</h2>

      <div style={S.card}>
        <div style={S.formGroup}>
          <label htmlFor={amrInputId} style={S.label}>AMR Vehicle ID</label>
          <input
            id={amrInputId}
            type="text"
            value={amrNumber}
            onChange={(e) => setAmrNumber(e.target.value)}
            placeholder="e.g. 001"
            style={styles.input}
          />
        </div>

        <div style={S.formGroup}>
          <label htmlFor={projectInputId} style={S.label}>Project / Site</label>
          <input
            id={projectInputId}
            type="text"
            value={projectSite}
            onChange={(e) => setProjectSite(e.target.value)}
            placeholder="e.g. DTP"
            style={styles.input}
          />
        </div>

        <div style={S.formGroup}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <span style={S.label}>Checklist Items ({selectedItems.size} selected)</span>
            <div style={{ display: "flex", gap: spacing.sm }}>
              <button onClick={handleSelectAll} style={{ ...buttonStyle("secondary"), padding: "4px 10px", fontSize: 11 }}>
                Select All
              </button>
              <button onClick={handleClearAll} style={{ ...buttonStyle("secondary"), padding: "4px 10px", fontSize: 11 }}>
                Clear All
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: "auto", border: `1px solid ${colors.borderLight}`, borderRadius: 6, padding: spacing.sm }}>
            {DEFAULT_CHECKLIST_ITEMS.map((item) => (
              <label key={item.id} style={S.setupItem}>
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleToggleItem(item.id)}
                  style={S.setupCheckbox}
                />
                <span style={{ fontSize: 13, color: colors.textPrimary }}>{item.name}</span>
                {item.hasNotes && (
                  <span style={{ fontSize: 10, color: ACCENT_COLOR, marginLeft: "auto" }}>+ notes</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div style={S.buttonGroup}>
          <AccentButton onClick={handleSubmit} disabled={!isValid}>
            Create Checklist
          </AccentButton>
          <button onClick={onCancel} style={buttonStyle("secondary")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

// Active checklist view
const ActiveChecklist = memo(function ActiveChecklist({
  checklist,
  onUpdate,
  onBack,
}: {
  checklist: SavedChecklist;
  onUpdate: (updated: SavedChecklist) => void;
  onBack: () => void;
}) {
  const completed = checklist.items.filter((i) => i.completed).length;
  const total = checklist.items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = useCallback((itemId: string) => {
    const updated: SavedChecklist = {
      ...checklist,
      updatedAt: Date.now(),
      items: checklist.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    };
    onUpdate(updated);
  }, [checklist, onUpdate]);

  const handleNotesChange = useCallback((itemId: string, notes: string) => {
    const updated: SavedChecklist = {
      ...checklist,
      updatedAt: Date.now(),
      items: checklist.items.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      ),
    };
    onUpdate(updated);
  }, [checklist, onUpdate]);

  return (
    <div>
      <button onClick={onBack} style={{ ...buttonStyle("secondary"), ...S.backButton }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to List
      </button>

      <div style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <h2 style={{ ...S.sectionTitle, fontSize: 18, textTransform: "none", letterSpacing: "normal" }}>
          AMR {checklist.amrNumber} — {checklist.projectSite}
        </h2>
        <div style={S.progressBar}>
          <div style={{ ...S.progressFill, width: `${percent}%` }} />
        </div>
        <div style={S.progressText}>
          {completed} of {total} steps complete ({percent}%)
        </div>
      </div>

      <div>
        {checklist.items.map((item, index) => (
          <div
            key={item.id}
            style={{
              ...S.checklistItem,
              ...(item.completed ? S.checklistItemCompleted : {}),
            }}
          >
            <Checkbox
              checked={item.completed}
              onChange={() => handleToggle(item.id)}
              ariaLabel={`Mark ${item.name} as ${item.completed ? "incomplete" : "complete"}`}
            />
            <div style={S.itemContent}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                <span style={{ fontSize: 12, color: colors.textMuted, minWidth: 24 }}>{index + 1}.</span>
                <span style={{ ...S.itemName, ...(item.completed ? S.itemNameCompleted : {}) }}>
                  {item.name}
                </span>
              </div>
              {item.hasNotes && (
                <input
                  type="text"
                  value={item.notes}
                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                  placeholder="Enter notes or value..."
                  style={S.notesInput}
                  aria-label={`Notes for ${item.name}`}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {completed === total && total > 0 && (
        <div
          style={{
            marginTop: spacing.xl,
            padding: spacing.xl,
            background: `${colors.success}10`,
            border: `1px solid ${colors.success}30`,
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: spacing.sm }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: colors.success }}>
            All steps complete!
          </div>
          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: spacing.xs }}>
            AMR {checklist.amrNumber} integration is ready for verification.
          </div>
        </div>
      )}
    </div>
  );
});

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function IntegrationChecklistPage() {
  const [phase, setPhase] = useState<Phase>("list");
  const [savedChecklists, setSavedChecklists] = useState<SavedChecklist[]>([]);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadFromStorage();
    setSavedChecklists(loaded);
    setIsLoaded(true);
  }, []);

  // Auto-save to localStorage when checklists change
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(savedChecklists);
    }
  }, [savedChecklists, isLoaded]);

  const activeChecklist = useMemo(() => {
    return savedChecklists.find((c) => c.id === activeChecklistId) || null;
  }, [savedChecklists, activeChecklistId]);

  const handleNewChecklist = useCallback(() => {
    setPhase("setup");
  }, []);

  const handleCancelSetup = useCallback(() => {
    setPhase("list");
  }, []);

  const handleConfirmSetup = useCallback((amrNumber: string, projectSite: string, items: ChecklistItem[]) => {
    const newChecklist: SavedChecklist = {
      id: generateId(),
      amrNumber,
      projectSite,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        completed: false,
        notes: "",
        hasNotes: item.hasNotes,
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSavedChecklists((prev) => [newChecklist, ...prev]);
    setActiveChecklistId(newChecklist.id);
    setPhase("active");
  }, []);

  const handleSelectChecklist = useCallback((id: string) => {
    setActiveChecklistId(id);
    setPhase("active");
  }, []);

  const handleDeleteChecklist = useCallback((id: string) => {
    setSavedChecklists((prev) => prev.filter((c) => c.id !== id));
    if (activeChecklistId === id) {
      setActiveChecklistId(null);
      setPhase("list");
    }
  }, [activeChecklistId]);

  const handleUpdateChecklist = useCallback((updated: SavedChecklist) => {
    setSavedChecklists((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveChecklistId(null);
    setPhase("list");
  }, []);

  // Render loading state
  if (!isLoaded) {
    return (
      <div style={S.page}>
        <div style={{ textAlign: "center", padding: 60, color: colors.textMuted }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style dangerouslySetInnerHTML={{ __html: focusRingStyle }} />

      <header style={S.header}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `${ACCENT_COLOR}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ACCENT_COLOR}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 11l2 2 4-4" />
            <path d="M9 17h6" />
          </svg>
        </div>
        <h1 style={S.h1}>Integration Checklist</h1>
      </header>

      <main>
        {phase === "list" && (
          <SavedChecklistsList
            checklists={savedChecklists}
            onSelect={handleSelectChecklist}
            onDelete={handleDeleteChecklist}
            onNew={handleNewChecklist}
          />
        )}

        {phase === "setup" && (
          <SetupPhase onConfirm={handleConfirmSetup} onCancel={handleCancelSetup} />
        )}

        {phase === "active" && activeChecklist && (
          <ActiveChecklist
            checklist={activeChecklist}
            onUpdate={handleUpdateChecklist}
            onBack={handleBackToList}
          />
        )}
      </main>
    </div>
  );
}
