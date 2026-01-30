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
          paddingTop: 60,
          paddingBottom: 60,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: spacing.lg,
            color: colors.textPrimary,
          }}
        >
          JB Tools Portal
        </h1>
        <p
          style={{
            fontSize: 16,
            color: colors.textMuted,
            maxWidth: 500,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          A collection of utility tools for AMR layout creation and fine-tuning workflows.
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
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
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

        {/* More Tools Coming Soon Card */}
        <article
          style={{
            border: `1px dashed ${colors.border}`,
            borderRadius: 10,
            padding: spacing["2xl"],
            background: colors.bgPage,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 180,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: colors.textLight,
              textAlign: "center",
            }}
          >
            More tools coming soon...
          </div>
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
