import Link from "next/link";
import { colors, spacing } from "../../lib/theme";
import {
  toolsRegistry,
  categoryNames,
  getToolsGroupedByCategory,
  type Tool,
} from "../../lib/tools-registry";

function ToolIcon({ icon }: { icon: Tool["icon"] }) {
  if (icon === "finetune") {
    return (
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
    );
  }

  // Default icon
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textMuted}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6M9 15h6" />
    </svg>
  );
}

function StatusBadge({ status }: { status: Tool["status"] }) {
  if (status === "active") return null;

  const styles: Record<string, { bg: string; text: string; label: string }> = {
    "coming-soon": {
      bg: colors.borderLight,
      text: colors.textMuted,
      label: "Coming Soon",
    },
    beta: {
      bg: `${colors.warning}20`,
      text: colors.warning,
      label: "Beta",
    },
  };

  const style = styles[status];

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        background: style.bg,
        color: style.text,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
      }}
    >
      {style.label}
    </span>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isActive = tool.status === "active";

  const card = (
    <article
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: spacing["2xl"],
        background: colors.bgCard,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        cursor: isActive ? "pointer" : "default",
        opacity: isActive ? 1 : 0.7,
        height: "100%",
        display: "flex",
        flexDirection: "column",
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
            background: isActive ? `${colors.primary}15` : colors.borderLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ToolIcon icon={tool.icon} />
        </div>
        <StatusBadge status={tool.status} />
      </div>

      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: spacing.sm,
        }}
      >
        {tool.name}
      </h3>

      <p
        style={{
          fontSize: 13,
          color: colors.textMuted,
          lineHeight: 1.5,
          margin: 0,
          flex: 1,
        }}
      >
        {tool.description}
      </p>

      {tool.tags && tool.tags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: spacing.xs,
            marginTop: spacing.lg,
          }}
        >
          {tool.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: colors.borderLight,
                color: colors.textMuted,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );

  if (!isActive) {
    return card;
  }

  return (
    <Link href={tool.path} style={{ textDecoration: "none", display: "block" }}>
      {card}
    </Link>
  );
}

export default function ToolsCatalogPage() {
  const groupedTools = getToolsGroupedByCategory();
  const categories = Object.keys(groupedTools) as Array<keyof typeof categoryNames>;

  return (
    <div
      style={{
        padding: spacing["2xl"],
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Page Header */}
      <header style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: spacing.md,
            color: colors.textPrimary,
          }}
        >
          Tools Catalog
        </h1>
        <p
          style={{
            fontSize: 15,
            color: colors.textMuted,
            maxWidth: 600,
          }}
        >
          Browse all available tools. Click on any active tool to open it.
        </p>
      </header>

      {/* Tools Grid by Category */}
      {categories.map((category) => (
        <section key={category} style={{ marginBottom: 40 }}>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              marginBottom: spacing.xl,
              paddingBottom: spacing.md,
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            {categoryNames[category]}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: spacing["2xl"],
            }}
          >
            {groupedTools[category].map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      ))}

      {/* Empty State */}
      {toolsRegistry.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: colors.textMuted,
          }}
        >
          <p>No tools available yet.</p>
        </div>
      )}
    </div>
  );
}
