"use client";

import React, { useState, useEffect, useCallback, useRef, Component, ReactNode, CSSProperties } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { colors, spacing, fontSize, fontFamily, buttonStyle, modalStyles } from "../lib/theme";

// ==========================================
// TYPES
// ==========================================

type InspectionStatus = "pass" | "fail" | "pending";

interface InspectionItem {
  id: string;
  itemNumber: string | number;
  description: string;
  status: InspectionStatus;
  notes: string;
  rowIndex: number;
}

interface HeaderField {
  label: string;
  value: string;
  cellAddress?: string;
  isRequired?: boolean;
}

interface HeaderInfo {
  fields: HeaderField[];
  robotModel?: string;
  serialNumber?: string;
  date?: string;
  [key: string]: unknown;
}

interface InspectionData {
  headerInfo: HeaderInfo;
  items: InspectionItem[];
  currentItemIndex: number;
  inspectorInitials: string;
  bonusQuestionAnswer: "pass" | "fail" | null;
  originalWorkbook?: ExcelJS.Workbook;
}

interface ExcelParseResult {
  headerInfo: HeaderInfo;
  items: InspectionItem[];
  workbook: ExcelJS.Workbook;
}

type WizardStep = "upload" | "header" | "inspection" | "review" | "initials" | "bonus" | "generate";

// ==========================================
// STYLES
// ==========================================

const pdiStyles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: spacing["2xl"],
    fontFamily,
  },
  header: {
    textAlign: "center",
    marginBottom: spacing["2xl"],
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 700,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: 1.5,
  },
  card: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: spacing["2xl"],
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    marginBottom: spacing.lg,
  },
  uploadArea: {
    border: `2px dashed ${colors.border}`,
    borderRadius: 10,
    padding: 48,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.25s ease",
    background: colors.bgCard,
  },
  uploadAreaHover: {
    borderColor: colors.primary,
    background: colors.borderLight,
  },
  questionCard: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: spacing["2xl"],
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    marginBottom: spacing.lg,
    minHeight: 400,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  progressBar: {
    height: 4,
    background: colors.borderLight,
    borderRadius: 2,
    overflow: "hidden",
    flex: 1,
  },
  progressFill: {
    height: "100%",
    background: colors.primary,
    transition: "width 0.3s ease",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    fontSize: fontSize.base,
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
    background: colors.bgCard,
  },
  textarea: {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    fontSize: fontSize.base,
    boxSizing: "border-box" as const,
    fontFamily,
    resize: "vertical" as const,
    minHeight: 120,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  reviewItem: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeft: `4px solid ${colors.border}`,
  },
  badge: {
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: fontSize.xs,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.02em",
  },
};

// ==========================================
// EXCEL PARSER
// ==========================================

async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in Excel file");
  }

  const getCellValue = (cellAddress: string): string => {
    const cell = worksheet.getCell(cellAddress);
    if (!cell || cell.value === null || cell.value === undefined) {
      return "";
    }
    if (typeof cell.value === "object") {
      if ("result" in cell.value) {
        return String(cell.value.result || "");
      }
      if ("richText" in cell.value) {
        return (cell.value as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join("");
      }
      return String(cell.value);
    }
    return String(cell.value).trim();
  };

  // Parse header fields
  const fieldDefinitions = [
    { label: "Customer Name", cellAddress: "B3", isRequired: true },
    { label: "Serial Number", cellAddress: "B4", isRequired: true },
    { label: "Box Number", cellAddress: "B5", isRequired: false },
    { label: "Dispatch Location", cellAddress: "B6", isRequired: false },
    { label: "Model", cellAddress: "D3", isRequired: true },
    { label: "Supervisor Name", cellAddress: "D4", isRequired: false },
    { label: "Inspector Name", cellAddress: "D5", isRequired: false },
    { label: "Date", cellAddress: "D6", isRequired: false },
  ];

  const headerFields: HeaderField[] = fieldDefinitions.map((field) => ({
    label: field.label,
    value: getCellValue(field.cellAddress),
    cellAddress: field.cellAddress,
    isRequired: field.isRequired,
  }));

  const headerInfo: HeaderInfo = {
    fields: headerFields,
    robotModel: getCellValue("D3"),
    serialNumber: getCellValue("B4"),
    date: getCellValue("D6"),
  };

  // Parse inspection items (rows 8-44, column B)
  const items: InspectionItem[] = [];
  for (let rowNum = 8; rowNum <= 44; rowNum++) {
    const cell = worksheet.getCell(`B${rowNum}`);
    let description = "";

    if (cell && cell.value !== null && cell.value !== undefined) {
      if (typeof cell.value === "object") {
        if ("richText" in cell.value) {
          description = (cell.value as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join("");
        } else if ("result" in cell.value) {
          description = String(cell.value.result || "");
        } else {
          description = String(cell.value);
        }
      } else {
        description = String(cell.value);
      }
      description = description.trim();
    }

    if (!description) continue;

    items.push({
      id: `item-${rowNum}`,
      itemNumber: String(rowNum),
      description,
      status: "pending",
      notes: "",
      rowIndex: rowNum - 1,
    });
  }

  return { headerInfo, items, workbook };
}

// ==========================================
// EXCEL GENERATOR
// ==========================================

async function generateExcelFile(data: InspectionData): Promise<void> {
  if (!data.originalWorkbook) {
    throw new Error("Original workbook not found");
  }

  const workbook = data.originalWorkbook;
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("No worksheet found in workbook");
  }

  // Update header fields
  data.headerInfo.fields.forEach((field) => {
    if (field.cellAddress && field.value) {
      const cell = worksheet.getCell(field.cellAddress);
      cell.value = field.value;
    }
  });

  // Update inspection items
  data.items.forEach((item) => {
    const rowNum = item.rowIndex + 1;

    if (item.status !== "pending") {
      const passFailCell = worksheet.getCell(`C${rowNum}`);
      passFailCell.value = item.status === "pass" ? "Y" : "X";

      if (data.inspectorInitials) {
        const initialsCell = worksheet.getCell(`E${rowNum}`);
        initialsCell.value = data.inspectorInitials;
      }
    }

    if (item.status === "fail" && item.notes) {
      const notesCell = worksheet.getCell(`D${rowNum}`);
      notesCell.value = item.notes;
    }
  });

  // Generate filename
  const robotModel = (data.headerInfo.robotModel || "Unknown").replace(/[<>:"/\\|?*]/g, "").trim();
  const serialNumber = (data.headerInfo.serialNumber || "Unknown").replace(/[<>:"/\\|?*]/g, "").trim();
  const passFail = data.bonusQuestionAnswer === "pass" ? "Pass" : data.bonusQuestionAnswer === "fail" ? "Fail" : "Pending";
  const filename = `${robotModel} PDI - ${serialNumber} - ${passFail}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
}

// ==========================================
// WIZARD HOOK
// ==========================================

const STORAGE_KEY = "pdi-inspection-wizard-data";

function useInspectionWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>("upload");
  const [data, setData] = useState<InspectionData | null>(null);
  const workbookRef = useRef<ExcelJS.Workbook | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed.data);
        setCurrentStep(parsed.step || "upload");
      } catch {
        console.error("Failed to load saved data");
      }
    }
  }, []);

  useEffect(() => {
    if (data) {
      const { originalWorkbook, ...serializableData } = data;
      void originalWorkbook;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: serializableData, step: currentStep }));
    }
  }, [data, currentStep]);

  const goToStep = useCallback((step: WizardStep) => setCurrentStep(step), []);

  const initializeData = useCallback((headerInfo: HeaderInfo, items: InspectionItem[], workbook: ExcelJS.Workbook) => {
    workbookRef.current = workbook;
    setData({
      headerInfo,
      items,
      currentItemIndex: 0,
      inspectorInitials: "",
      bonusQuestionAnswer: null,
      originalWorkbook: workbook,
    });
  }, []);

  const setHeaderInfo = useCallback((headerInfo: HeaderInfo) => {
    setData((prev) =>
      prev
        ? { ...prev, headerInfo }
        : {
            headerInfo,
            items: [],
            currentItemIndex: 0,
            inspectorInitials: "",
            bonusQuestionAnswer: null,
            originalWorkbook: workbookRef.current || undefined,
          }
    );
  }, []);

  const setCurrentItemIndex = useCallback((index: number) => {
    setData((prev) => (prev ? { ...prev, currentItemIndex: index } : null));
  }, []);

  const markItemPass = useCallback((itemId: string) => {
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map((item) => (item.id === itemId ? { ...item, status: "pass" as const, notes: "" } : item)),
      };
    });
  }, []);

  const markItemFail = useCallback((itemId: string, notes: string) => {
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map((item) => (item.id === itemId ? { ...item, status: "fail" as const, notes } : item)),
      };
    });
  }, []);

  const fullyFailRobot = useCallback(() => {
    setData((prev) => {
      if (!prev) return null;
      const currentIndex = prev.currentItemIndex;
      return {
        ...prev,
        items: prev.items.map((item, index) => {
          if (index >= currentIndex && item.status === "pending") {
            return { ...item, status: "fail" as const, notes: item.notes || "Robot failed inspection" };
          }
          return item;
        }),
      };
    });
    setCurrentStep("review");
  }, []);

  const setInspectorInitials = useCallback((initials: string) => {
    setData((prev) => (prev ? { ...prev, inspectorInitials: initials } : null));
  }, []);

  const setBonusQuestionAnswer = useCallback((answer: "pass" | "fail") => {
    setData((prev) => (prev ? { ...prev, bonusQuestionAnswer: answer } : null));
  }, []);

  const reset = useCallback(() => {
    setData(null);
    workbookRef.current = null;
    setCurrentStep("upload");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    currentStep,
    data: data ? { ...data, originalWorkbook: workbookRef.current || data.originalWorkbook } : null,
    goToStep,
    initializeData,
    setHeaderInfo,
    setCurrentItemIndex,
    markItemPass,
    markItemFail,
    fullyFailRobot,
    setInspectorInitials,
    setBonusQuestionAnswer,
    reset,
  };
}

// ==========================================
// ERROR BOUNDARY
// ==========================================

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={pdiStyles.container}>
          <div style={pdiStyles.card}>
            <h1 style={{ color: colors.danger, marginBottom: spacing.md }}>Something went wrong</h1>
            <p style={{ marginBottom: spacing.md }}>{this.state.error?.message || "An unexpected error occurred"}</p>
            <button
              style={buttonStyle("primary")}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// NOTE MODAL
// ==========================================

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  initialNotes?: string;
}

function NoteModal({ isOpen, onClose, onSubmit, initialNotes = "" }: NoteModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState("");

  useEffect(() => {
    setNotes(initialNotes);
    setError("");
  }, [initialNotes, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setError("Please enter a note describing the issue");
      return;
    }
    onSubmit(trimmedNotes);
    setNotes("");
    setError("");
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.box, maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ ...pdiStyles.title, fontSize: fontSize.lg, marginBottom: spacing.md }}>Add Failure Note</h2>
        <p style={{ marginBottom: spacing.lg, color: colors.textMuted }}>Please describe the issue that caused this item to fail:</p>
        <textarea
          style={pdiStyles.textarea}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setError("");
          }}
          placeholder="Enter details about the failure..."
          autoFocus
          rows={6}
        />
        {error && <p style={pdiStyles.errorText}>{error}</p>}
        <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.xl, justifyContent: "flex-end" }}>
          <button style={buttonStyle("secondary")} onClick={onClose}>
            Cancel
          </button>
          <button style={{ ...buttonStyle("primary"), background: colors.danger, borderColor: colors.danger }} onClick={handleSubmit}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STEP COMPONENTS
// ==========================================

function UploadStep({ onFileParsed }: { onFileParsed: (result: ExcelParseResult) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSavedData, setHasSavedData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.data) setHasSavedData(true);
      } catch {
        // Ignore
      }
    }
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await parseExcelFile(file);
      setIsLoading(false);
      onFileParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse Excel file");
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedData(false);
  };

  return (
    <div style={pdiStyles.container}>
      <div style={pdiStyles.header}>
        <h1 style={pdiStyles.title}>PDI Inspection Sheet</h1>
        <p style={pdiStyles.subtitle}>Upload the blank Excel template for the correct revision</p>
      </div>

      {hasSavedData && (
        <div
          style={{
            background: "rgba(255, 0, 0, 0.1)",
            border: `1px solid ${colors.primary}`,
            padding: spacing.lg,
            borderRadius: 10,
            marginBottom: spacing.lg,
            textAlign: "center",
          }}
        >
          <p style={{ marginBottom: spacing.sm }}>⚠️ There is saved inspection data from a previous session.</p>
          <button style={{ ...buttonStyle("secondary"), fontSize: fontSize.sm }} onClick={handleClearSavedData}>
            Clear Saved Data
          </button>
        </div>
      )}

      <div
        style={{
          ...pdiStyles.uploadArea,
          ...(isDragging ? pdiStyles.uploadAreaHover : {}),
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLoading ? (
          <div>
            <div style={{ fontSize: 48, marginBottom: spacing.md }}>⏳</div>
            <p>Parsing Excel file...</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 48, marginBottom: spacing.md }}>📄</div>
            <p style={{ fontSize: fontSize.lg, marginBottom: spacing.sm }}>Drag and drop your Excel file here</p>
            <p style={{ color: colors.textMuted }}>or click to browse</p>
            <p style={{ marginTop: spacing.lg, fontSize: fontSize.sm, color: colors.textMuted }}>Supported formats: .xlsx, .xls</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: "none" }} />

      {error && (
        <div
          style={{
            background: "rgba(220, 38, 38, 0.1)",
            color: colors.danger,
            padding: spacing.lg,
            borderRadius: 10,
            marginTop: spacing.lg,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function HeaderStep({ headerInfo, onComplete }: { headerInfo: HeaderInfo; onComplete: (h: HeaderInfo) => void }) {
  const [fields, setFields] = useState<HeaderField[]>(headerInfo?.fields || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (headerInfo) setFields(headerInfo.fields || []);
  }, [headerInfo]);

  if (!headerInfo) {
    return (
      <div style={pdiStyles.container}>
        <div style={pdiStyles.card}>
          <p>Loading header information...</p>
        </div>
      </div>
    );
  }

  const updateField = (index: number, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], value };
    setFields(newFields);
    if (errors[newFields[index].label]) {
      const newErrors = { ...errors };
      delete newErrors[newFields[index].label];
      setErrors(newErrors);
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.isRequired && !field.value.trim()) {
        newErrors[field.label] = "This field is required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const updatedHeaderInfo: HeaderInfo = {
      ...headerInfo,
      fields,
      robotModel: fields.find((f) => f.label.toLowerCase().includes("model"))?.value || "",
      serialNumber: fields.find((f) => f.label.toLowerCase().includes("serial"))?.value || "",
      date: fields.find((f) => f.label.toLowerCase().includes("date"))?.value || "",
    };

    onComplete(updatedHeaderInfo);
  };

  return (
    <div style={pdiStyles.container}>
      <div style={pdiStyles.header}>
        <h1 style={pdiStyles.title}>Fill Header Information</h1>
        <p style={pdiStyles.subtitle}>Please fill in the header information from the inspection sheet</p>
      </div>

      <div style={pdiStyles.card}>
        {fields.length === 0 ? (
          <p style={{ textAlign: "center", color: colors.textMuted }}>No header fields found. You can proceed to the inspection.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
            {fields.map((field, index) => (
              <div key={index}>
                <label style={{ display: "block", marginBottom: spacing.sm, fontWeight: 500, color: colors.textPrimary }}>
                  {field.label}
                  {field.isRequired && <span style={{ color: colors.danger }}> *</span>}
                </label>
                <input
                  style={pdiStyles.input}
                  type="text"
                  value={field.value}
                  onChange={(e) => updateField(index, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
                {errors[field.label] && <p style={pdiStyles.errorText}>{errors[field.label]}</p>}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: spacing.xl, display: "flex", justifyContent: "flex-end" }}>
          <button style={buttonStyle("primary")} onClick={handleSubmit}>
            Continue to Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

function InspectionStep({
  items,
  currentIndex,
  onItemPass,
  onItemFail,
  onFullyFail,
  onPrevious,
}: {
  items: InspectionItem[];
  currentIndex: number;
  onItemPass: (id: string) => void;
  onItemFail: (id: string, notes: string) => void;
  onFullyFail: () => void;
  onPrevious: () => void;
}) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  if (!currentItem) return null;

  return (
    <div style={pdiStyles.container}>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl }}>
        <span style={{ fontSize: fontSize.sm, color: colors.textMuted }}>
          Question {currentIndex + 1} of {items.length}
        </span>
        <div style={pdiStyles.progressBar}>
          <div style={{ ...pdiStyles.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      <div style={pdiStyles.questionCard}>
        <div>
          <div style={{ fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Item {currentItem.itemNumber}
          </div>
          <div style={{ fontSize: fontSize.lg, fontWeight: 500, lineHeight: 1.5, color: colors.textPrimary }}>{currentItem.description}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          <div style={{ display: "flex", gap: spacing.md, justifyContent: "center" }}>
            <button
              style={{ ...buttonStyle("primary"), background: colors.success, borderColor: colors.success, minWidth: 120 }}
              onClick={() => onItemPass(currentItem.id)}
            >
              ✓ Pass
            </button>
            <button
              style={{ ...buttonStyle("primary"), background: colors.danger, borderColor: colors.danger, minWidth: 120 }}
              onClick={() => setShowNoteModal(true)}
            >
              ✗ Fail
            </button>
          </div>
          <button style={{ ...buttonStyle("secondary"), marginTop: spacing.md }} onClick={() => window.confirm("Are you sure you want to fully fail the robot?") && onFullyFail()}>
            Fully Fail Robot
          </button>
          {currentIndex > 0 && (
            <button style={{ ...buttonStyle("secondary"), marginTop: spacing.sm }} onClick={onPrevious}>
              ← Previous Question
            </button>
          )}
        </div>
      </div>

      <NoteModal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} onSubmit={(notes) => { onItemFail(currentItem.id, notes); setShowNoteModal(false); }} initialNotes={currentItem.notes} />
    </div>
  );
}

function ReviewStep({ items, onEditItem, onComplete }: { items: InspectionItem[]; onEditItem: (id: string) => void; onComplete: () => void }) {
  const passedCount = items.filter((i) => i.status === "pass").length;
  const failedCount = items.filter((i) => i.status === "fail").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div style={pdiStyles.container}>
      <div style={pdiStyles.header}>
        <h1 style={pdiStyles.title}>Review Inspection</h1>
        <p style={pdiStyles.subtitle}>Review all inspection items before finalizing</p>
      </div>

      <div style={{ ...pdiStyles.card, marginBottom: spacing.lg }}>
        <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 600, color: colors.success }}>{passedCount}</div>
            <div style={{ color: colors.textMuted, marginTop: spacing.xs }}>Passed</div>
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 600, color: colors.danger }}>{failedCount}</div>
            <div style={{ color: colors.textMuted, marginTop: spacing.xs }}>Failed</div>
          </div>
          {pendingCount > 0 && (
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, color: colors.textLight }}>{pendingCount}</div>
              <div style={{ color: colors.textMuted, marginTop: spacing.xs }}>Pending</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: spacing.xl }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              ...pdiStyles.reviewItem,
              borderLeftColor: item.status === "pass" ? colors.success : item.status === "fail" ? colors.danger : colors.textLight,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: fontSize.sm, color: colors.textMuted }}>Item {item.itemNumber}: </span>
                <span>{item.description}</span>
              </div>
              <span
                style={{
                  ...pdiStyles.badge,
                  background: item.status === "pass" ? "rgba(22,163,74,0.1)" : item.status === "fail" ? "rgba(220,38,38,0.1)" : colors.borderLight,
                  color: item.status === "pass" ? colors.success : item.status === "fail" ? colors.danger : colors.textMuted,
                }}
              >
                {item.status === "pass" ? "Pass" : item.status === "fail" ? "Fail" : "Pending"}
              </span>
            </div>
            {item.status === "fail" && item.notes && (
              <div style={{ marginTop: spacing.sm, padding: spacing.md, background: colors.bgPage, borderRadius: 6, fontSize: fontSize.sm, color: colors.textSecondary }}>
                <strong>Notes:</strong> {item.notes}
              </div>
            )}
            <button style={{ ...buttonStyle("secondary"), marginTop: spacing.md, fontSize: fontSize.sm }} onClick={() => onEditItem(item.id)}>
              Edit
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button style={buttonStyle("primary")} onClick={onComplete}>
          Continue to Initials
        </button>
      </div>
    </div>
  );
}

function InitialsStep({ initialValue, onComplete }: { initialValue: string; onComplete: (initials: string) => void }) {
  const [initials, setInitials] = useState(initialValue);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = initials.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter your initials");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 5) {
      setError("Initials should be between 2 and 5 characters");
      return;
    }
    if (!/^[A-Z]+$/.test(trimmed)) {
      setError("Initials should only contain letters");
      return;
    }
    onComplete(trimmed);
  };

  return (
    <div style={pdiStyles.container}>
      <div style={pdiStyles.header}>
        <h1 style={pdiStyles.title}>Enter Your Initials</h1>
        <p style={pdiStyles.subtitle}>Please enter your inspector initials</p>
      </div>

      <div style={pdiStyles.card}>
        <div>
          <label style={{ display: "block", marginBottom: spacing.sm, fontWeight: 500, color: colors.textPrimary }}>
            Inspector Initials <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            style={pdiStyles.input}
            type="text"
            value={initials}
            onChange={(e) => {
              setInitials(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="e.g., JD"
            maxLength={5}
            autoFocus
          />
          {error && <p style={pdiStyles.errorText}>{error}</p>}
        </div>
        <div style={{ marginTop: spacing.xl, display: "flex", justifyContent: "flex-end" }}>
          <button style={buttonStyle("primary")} onClick={handleSubmit}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function BonusQuestionStep({ currentAnswer, onAnswer }: { currentAnswer: "pass" | "fail" | null; onAnswer: (answer: "pass" | "fail") => void }) {
  return (
    <div style={pdiStyles.container}>
      <div style={pdiStyles.header}>
        <h1 style={pdiStyles.title}>Final Question</h1>
        <p style={pdiStyles.subtitle}>Did the robot pass or fail overall?</p>
      </div>

      <div style={{ ...pdiStyles.questionCard, minHeight: 300 }}>
        <div style={{ fontSize: fontSize.lg, fontWeight: 500, textAlign: "center", marginBottom: spacing["2xl"] }}>Based on your inspection, did the robot pass or fail overall?</div>

        <div style={{ display: "flex", flexDirection: "column", gap: spacing.md }}>
          <div style={{ display: "flex", gap: spacing.md, justifyContent: "center" }}>
            <button
              style={{
                ...buttonStyle(currentAnswer === "pass" ? "primary" : "secondary"),
                ...(currentAnswer === "pass" ? { background: colors.success, borderColor: colors.success } : {}),
                minWidth: 150,
              }}
              onClick={() => onAnswer("pass")}
            >
              ✓ Robot Passed
            </button>
            <button
              style={{
                ...buttonStyle(currentAnswer === "fail" ? "primary" : "secondary"),
                ...(currentAnswer === "fail" ? { background: colors.danger, borderColor: colors.danger } : {}),
                minWidth: 150,
              }}
              onClick={() => onAnswer("fail")}
            >
              ✗ Robot Failed
            </button>
          </div>
        </div>

        <p style={{ marginTop: spacing.xl, textAlign: "center", color: colors.textMuted, fontSize: fontSize.sm }}>This answer will be used for the output file name</p>
      </div>
    </div>
  );
}

function GenerateStep({ data, onComplete }: { data: InspectionData; onComplete: () => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");

    try {
      if (!data.originalWorkbook) {
        throw new Error("Original workbook data is missing");
      }
      await generateExcelFile(data);
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate Excel file");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isComplete) {
    return (
      <div style={pdiStyles.container}>
        <div style={pdiStyles.header}>
          <div style={{ fontSize: 64, marginBottom: spacing.lg, color: colors.success }}>✓</div>
          <h1 style={pdiStyles.title}>Excel File Generated!</h1>
          <p style={pdiStyles.subtitle}>Your inspection sheet has been downloaded</p>
        </div>

        <div style={pdiStyles.card}>
          <p style={{ textAlign: "center", marginBottom: spacing.xl }}>The file has been saved with the proper naming format based on your header information.</p>
          <div
            style={{
              background: colors.bgPage,
              padding: spacing.lg,
              borderRadius: 10,
              marginBottom: spacing.xl,
              fontSize: fontSize.sm,
              border: `1px solid ${colors.border}`,
            }}
          >
            <strong>Filename:</strong> {data.headerInfo.robotModel || "Unknown"} PDI - {data.headerInfo.serialNumber || "Unknown"} -{" "}
            {data.bonusQuestionAnswer === "pass" ? "Pass" : "Fail"}.xlsx
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button style={buttonStyle("primary")} onClick={onComplete}>
              Start New Inspection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pdiStyles.container}>
      <div style={pdiStyles.header}>
        <h1 style={pdiStyles.title}>Generate Excel File</h1>
        <p style={pdiStyles.subtitle}>Generate and download your completed inspection sheet</p>
      </div>

      <div style={pdiStyles.card}>
        <div style={{ marginBottom: spacing.xl }}>
          <h2 style={{ marginBottom: spacing.md, fontSize: fontSize.lg }}>Review Summary</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.textMuted }}>Robot Model:</span>
              <span style={{ fontWeight: 500 }}>{data.headerInfo.robotModel || "N/A"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.textMuted }}>Serial Number:</span>
              <span style={{ fontWeight: 500 }}>{data.headerInfo.serialNumber || "N/A"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.textMuted }}>Inspector:</span>
              <span style={{ fontWeight: 500 }}>{data.inspectorInitials || "N/A"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.textMuted }}>Overall Status:</span>
              <span style={{ fontWeight: 500 }}>{data.bonusQuestionAnswer === "pass" ? "Pass" : data.bonusQuestionAnswer === "fail" ? "Fail" : "Pending"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: spacing.sm }}>
              <span style={{ color: colors.textMuted }}>Total Items:</span>
              <span style={{ fontWeight: 500 }}>{data.items.length}</span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(220,38,38,0.1)", color: colors.danger, padding: spacing.lg, borderRadius: 10, marginBottom: spacing.lg }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <button style={{ ...buttonStyle("primary"), minWidth: 200 }} onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate Excel File"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function PDIWeb() {
  const {
    currentStep,
    data,
    goToStep,
    initializeData,
    setHeaderInfo,
    setCurrentItemIndex,
    markItemPass,
    markItemFail,
    fullyFailRobot,
    setInspectorInitials,
    setBonusQuestionAnswer,
    reset,
  } = useInspectionWizard();

  const handleFileParsed = (result: ExcelParseResult) => {
    initializeData(result.headerInfo, result.items, result.workbook);
    goToStep("header");
  };

  const handleHeaderComplete = (headerInfo: HeaderInfo) => {
    setHeaderInfo(headerInfo);
    goToStep("inspection");
  };

  const handleItemPass = (itemId: string) => {
    markItemPass(itemId);
    if (data) {
      const nextIndex = data.currentItemIndex + 1;
      if (nextIndex < data.items.length) {
        setCurrentItemIndex(nextIndex);
      } else {
        goToStep("review");
      }
    }
  };

  const handleItemFail = (itemId: string, notes: string) => {
    markItemFail(itemId, notes);
    if (data) {
      const nextIndex = data.currentItemIndex + 1;
      if (nextIndex < data.items.length) {
        setCurrentItemIndex(nextIndex);
      } else {
        goToStep("review");
      }
    }
  };

  const handleEditItem = (itemId: string) => {
    if (data) {
      const itemIndex = data.items.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        setCurrentItemIndex(itemIndex);
        goToStep("inspection");
      }
    }
  };

  if (!currentStep) {
    return (
      <div style={pdiStyles.container}>
        <div style={pdiStyles.card}>
          <h1>Error</h1>
          <p>Something went wrong. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ background: colors.bgPage, minHeight: "100vh" }}>
        {currentStep !== "upload" && (
          <div style={{ position: "fixed", top: spacing.lg, right: spacing.lg, zIndex: 1000 }}>
            <button
              style={{ ...buttonStyle("secondary"), fontSize: fontSize.sm }}
              onClick={() => {
                if (window.confirm("Are you sure you want to start over? All progress will be lost.")) {
                  reset();
                }
              }}
            >
              ← Start Over
            </button>
          </div>
        )}

        {currentStep === "upload" && <UploadStep onFileParsed={handleFileParsed} />}

        {currentStep === "header" && data && <HeaderStep headerInfo={data.headerInfo} onComplete={handleHeaderComplete} />}

        {currentStep === "header" && !data && (
          <div style={pdiStyles.container}>
            <div style={pdiStyles.card}>
              <p>Loading header information...</p>
            </div>
          </div>
        )}

        {currentStep === "inspection" && data && (
          <InspectionStep
            items={data.items}
            currentIndex={data.currentItemIndex}
            onItemPass={handleItemPass}
            onItemFail={handleItemFail}
            onFullyFail={fullyFailRobot}
            onPrevious={() => data.currentItemIndex > 0 && setCurrentItemIndex(data.currentItemIndex - 1)}
          />
        )}

        {currentStep === "review" && data && <ReviewStep items={data.items} onEditItem={handleEditItem} onComplete={() => goToStep("initials")} />}

        {currentStep === "initials" && data && <InitialsStep initialValue={data.inspectorInitials} onComplete={(initials) => { setInspectorInitials(initials); goToStep("bonus"); }} />}

        {currentStep === "bonus" && data && <BonusQuestionStep currentAnswer={data.bonusQuestionAnswer} onAnswer={(answer) => { setBonusQuestionAnswer(answer); goToStep("generate"); }} />}

        {currentStep === "generate" && data && <GenerateStep data={data} onComplete={reset} />}
      </div>
    </ErrorBoundary>
  );
}
