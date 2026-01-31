"use client";

import Link from "next/link";
import { colors, spacing, buttonStyle } from "../lib/theme";

export default function Home() {
  return (
    <div
      style={{
        padding: spacing["2xl"],
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {/* Hero Section */}
      <section
        style={{
          textAlign: "center",
          paddingTop: 32,
          paddingBottom: 32,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: spacing.lg,
            color: colors.textPrimary,
            cursor: "default",
          }}
        >
          JBB Tool Portal
        </h1>
        <p
          style={{
            fontSize: 16,
            color: colors.textMuted,
            maxWidth: 500,
            margin: "0 auto",
            lineHeight: 1.6,
            cursor: "default",
          }}
        >
          A collection of utility tools for AMR layout creation and commissioning workflows.
        </p>
      </section>

      {/* Quick Access */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: spacing["2xl"],
          marginTop: spacing["2xl"],
        }}
      >
        {/* Fine-Tune Tool Card */}
        <Link
          href="/tools/finetune"
          style={{ textDecoration: "none" }}
        >
          <article
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: spacing["2xl"],
              background: colors.bgCard,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.15s, border-color 0.15s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = colors.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: `${colors.primary}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.lg,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="8" width="20" height="8" rx="1" />
                <line x1="6" y1="8" x2="6" y2="12" />
                <line x1="10" y1="8" x2="10" y2="14" />
                <line x1="14" y1="8" x2="14" y2="12" />
                <line x1="18" y1="8" x2="18" y2="14" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              AMR Fine-Tuning
            </h2>
            <p
              style={{
                fontSize: 14,
                color: colors.textMuted,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Fine-tune points during the creation of layouts with AMRs. Calculate mean positions, angles, and visualize sequences.
            </p>
          </article>
        </Link>

        {/* Integration Checklist Card */}
        <Link
          href="/tools/checklist"
          style={{ textDecoration: "none" }}
        >
          <article
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: spacing["2xl"],
              background: colors.bgCard,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.15s, border-color 0.15s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = colors.warning;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: `${colors.warning}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing.lg,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.warning}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 11l2 2 4-4" />
                <path d="M9 17h6" />
              </svg>
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: colors.textPrimary,
                marginBottom: spacing.sm,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              Integration Checklist
            </h2>
            <p
              style={{
                fontSize: 14,
                color: colors.textMuted,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Step-by-step checklist for software and mechanical setup when integrating a new AMR into production.
            </p>
          </article>
        </Link>

        {/* Thomas's Pain Killer Card - Under Construction */}
        <article
          style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 10,
            padding: spacing["2xl"],
            background: colors.bgCard,
            opacity: 0.7,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: spacing.lg,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: `${colors.purple}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.purple}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <g transform="rotate(45 12 12)">
                  <rect x="4" y="8" width="16" height="8" rx="4" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                </g>
              </svg>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: `${colors.warning}20`,
                color: colors.warning,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              Under Construction - In Beta
            </span>
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            Thomas&apos;s Pain Killer
          </h2>
          <p
            style={{
              fontSize: 14,
              color: colors.textMuted,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Detect and identify incompatible nodes and segments for Synoas applications.
          </p>
        </article>

        {/* AMR Tracker Card - Coming Eventually */}
        <article
          style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 10,
            padding: spacing["2xl"],
            background: colors.bgCard,
            opacity: 0.7,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: spacing.lg,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: `${colors.blue}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.blue}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: colors.borderLight,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              Coming Eventually
            </span>
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            AMR Tracker
          </h2>
          <p
            style={{
              fontSize: 14,
              color: colors.textMuted,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Monitor and document AMR status and software versions across projects.
          </p>
        </article>

        {/* Segment-Node Rotation Card - Coming Soon */}
        <article
          style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 10,
            padding: spacing["2xl"],
            background: colors.bgCard,
            opacity: 0.7,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: spacing.lg,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: `${colors.success}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.success}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-9-9" />
                <path d="M12 3v9l6 3" />
                <path d="M21 3v6h-6" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: colors.borderLight,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              Coming Soon
            </span>
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            Segment-Node Rotation
          </h2>
          <p
            style={{
              fontSize: 14,
              color: colors.textMuted,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Rotate a segment of nodes around an anchor point with precise angular transformations.
          </p>
        </article>

        {/* PDI Check Sheet Generator Card - Funding Cancelled */}
        <article
          style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 10,
            padding: spacing["2xl"],
            background: colors.bgCard,
            opacity: 0.7,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: spacing.lg,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#ea580c15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ea580c"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8" />
                <path d="M8 17h8" />
                <path d="M8 9h2" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                background: `${colors.warning}20`,
                color: colors.warning,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              Under Construction - Beta
            </span>
          </div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            PDI Check Sheet Generator
          </h2>
          <p
            style={{
              fontSize: 14,
              color: colors.textMuted,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Upload an Excel template and generate filled check sheets through a guided UI.
          </p>
        </article>
      </section>

      {/* View All Tools Link */}
      <div
        style={{
          textAlign: "center",
          marginTop: 40,
        }}
      >
        <Link href="/tools" style={{ ...buttonStyle("secondary") }}>
          View All Tools
        </Link>
      </div>
    </div>
  );
}
