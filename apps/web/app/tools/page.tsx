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
    // Ruler icon
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
        <rect x="2" y="8" width="20" height="8" rx="1" />
        <line x1="6" y1="8" x2="6" y2="12" />
        <line x1="10" y1="8" x2="10" y2="14" />
        <line x1="14" y1="8" x2="14" y2="12" />
        <line x1="18" y1="8" x2="18" y2="14" />
      </svg>
    );
  }

  if (icon === "painkiller") {
    // Pill/capsule icon rotated 45 degrees
    return (
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
    );
  }

  if (icon === "tracker") {
    // Location/tracking icon
    return (
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
    );
  }

  if (icon === "rotation") {
    // Rotation/transform icon
    return (
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
    );
  }

  if (icon === "checklist") {
    // Checklist/clipboard icon
    return (
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
    );
  }

  if (icon === "pdi") {
    // Spreadsheet/document generator icon
    return (
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
    "coming-eventually": {
      bg: colors.borderLight,
      text: colors.textMuted,
      label: "Coming Eventually",
    },
    "funding-cancelled": {
      bg: colors.borderLight,
      text: colors.textMuted,
      label: "Funding Cancelled - TBD",
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

function getIconBackground(icon: Tool["icon"]): string {
  switch (icon) {
    case "finetune":
      return `${colors.primary}15`;
    case "painkiller":
      return `${colors.purple}15`;
    case "tracker":
      return `${colors.blue}15`;
    case "rotation":
      return `${colors.success}15`;
    case "checklist":
      return `${colors.warning}15`;
    case "pdi":
      return "#ea580c15";
    default:
      return colors.borderLight;
  }
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
            background: getIconBackground(tool.icon),
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
