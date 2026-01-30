/**
 * JB Tools - Shared Theme Module
 * Based on UI-DESIGN-SYSTEM.md
 */

import { CSSProperties } from "react";

// ==========================================
// COLORS
// ==========================================

export const colors = {
  // Primary
  primary: "#ff0000",
  focus: "#2563eb",
  danger: "#dc2626",

  // Semantic
  success: "#16a34a",
  warning: "#f59e0b",
  purple: "#9333ea",
  blue: "#1f77b4",

  // Neutrals
  textPrimary: "#111",
  textSecondary: "#374151",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  bgPage: "#f8fafc",
  bgCard: "#ffffff",
  white: "#ffffff",
} as const;

// ==========================================
// SPACING
// ==========================================

export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
} as const;

// ==========================================
// TYPOGRAPHY
// ==========================================

export const fontFamily = "Inter, system-ui, -apple-system, sans-serif";

export const fontSize = {
  xs: 10,
  sm: 11,
  base: 14,
  md: 13,
  lg: 16,
  xl: 22,
  "2xl": 26,
} as const;

// ==========================================
// COMPONENT STYLES
// ==========================================

export const styles: Record<string, CSSProperties> = {
  // Page wrapper
  page: {
    padding: spacing["2xl"],
    fontFamily,
    color: colors.textPrimary,
    maxWidth: "100%",
    overflowX: "hidden",
    background: colors.bgPage,
    minHeight: "100vh",
  },

  // Card/Panel
  card: {
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: spacing.xl,
    background: colors.bgCard,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },

  // Section title (h2)
  sectionTitle: {
    fontWeight: 600,
    marginBottom: spacing.lg,
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },

  // Input base
  input: {
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: fontSize.base,
    width: "100%",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
    background: colors.bgCard,
  },

  // Table
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    borderBottom: `1px solid ${colors.border}`,
    padding: "6px 4px",
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  td: {
    borderTop: `1px solid ${colors.borderLight}`,
    padding: "6px 4px",
  },

  // Error box
  errorBox: {
    color: colors.danger,
    fontSize: 12,
    padding: "8px 10px",
    background: "#fef2f2",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #fecaca",
  },
};

// ==========================================
// BUTTON STYLES
// ==========================================

const buttonBase: CSSProperties = {
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  border: "1px solid transparent",
  transition: "background-color 0.15s, opacity 0.15s, transform 0.1s",
};

export function buttonStyle(
  variant: "primary" | "secondary" | "danger" | "ghost"
): CSSProperties {
  switch (variant) {
    case "primary":
      return {
        ...buttonBase,
        background: colors.primary,
        color: colors.white,
        borderColor: colors.primary,
        fontWeight: 600,
      };
    case "secondary":
      return {
        ...buttonBase,
        background: colors.bgPage,
        color: colors.textSecondary,
        borderColor: colors.border,
      };
    case "danger":
      return {
        ...buttonBase,
        background: "#fef2f2",
        color: colors.danger,
        borderColor: "#fecaca",
        padding: "6px 10px",
        fontSize: 12,
      };
    case "ghost":
    default:
      return buttonBase;
  }
}

// ==========================================
// MODAL STYLES
// ==========================================

export const modalStyles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  box: {
    background: colors.bgCard,
    borderRadius: 10,
    padding: spacing["2xl"],
    minWidth: 320,
    maxWidth: 400,
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
};

// ==========================================
// LAYOUT STYLES
// ==========================================

export const layoutStyles = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottom: `1px solid ${colors.border}`,
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(480px, 1fr) minmax(400px, 1.5fr)",
    gap: spacing["2xl"],
    alignItems: "start",
  },
};

// ==========================================
// LOGO COMPONENT
// ==========================================

export function JBBLogo({ width = 120, height = 40 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 40"
      role="img"
      aria-label="JBB Logo"
    >
      <rect width="120" height="40" fill={colors.primary} />
      <text
        x="10"
        y="28"
        fontFamily="Arial"
        fontSize="24"
        fontWeight="bold"
        fill="white"
      >
        JBB
      </text>
    </svg>
  );
}
