/**
 * JB Tools - Tool Registry
 * Central registry of all tools available in the portal.
 * Future: This can be moved to a database or API.
 */

export interface Tool {
  /** Unique identifier for the tool */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Route path (relative to /tools) */
  path: string;
  /** Icon name or component identifier */
  icon: "finetune" | "painkiller" | "tracker" | "rotation" | "checklist" | "pdi" | "default";
  /** Tool category for grouping */
  category: "amr" | "utility" | "other";
  /** Whether the tool is ready for use */
  status: "active" | "coming-soon" | "coming-eventually" | "beta" | "funding-cancelled";
  /** Optional tags for search/filtering */
  tags?: string[];
}

/**
 * Registry of all tools in the portal.
 * Add new tools here to have them appear in the catalog.
 */
export const toolsRegistry: Tool[] = [
  {
    id: "finetune",
    name: "AMR Fine-Tuning",
    description:
      "Fine-tune points during the creation of layouts with AMRs. Calculate mean positions, angles, and visualize sequences.",
    path: "/tools/finetune",
    icon: "finetune",
    category: "amr",
    status: "active",
    tags: ["amr", "layout", "points", "visualization"],
  },
  {
    id: "painkiller",
    name: "Thomas's Pain Killer",
    description:
      "Detect and identify incompatible nodes and segments for Synoas applications. Quickly diagnose configuration issues before deployment.",
    path: "/tools/painkiller",
    icon: "painkiller",
    category: "utility",
    status: "coming-soon",
    tags: ["synoas", "nodes", "segments", "compatibility", "validation"],
  },
  {
    id: "tracker",
    name: "AMR Tracker",
    description:
      "Monitor and document AMR status and software versions across projects. Keep track of fleet configurations and updates.",
    path: "/tools/tracker",
    icon: "tracker",
    category: "amr",
    status: "coming-eventually",
    tags: ["amr", "tracking", "status", "software", "documentation"],
  },
  {
    id: "rotation",
    name: "Segment-Node Rotation",
    description:
      "Rotate a segment of nodes around an anchor point. Input a series of nodes, select an anchor, and apply precise angular transformations.",
    path: "/tools/rotation",
    icon: "rotation",
    category: "amr",
    status: "coming-soon",
    tags: ["amr", "nodes", "segments", "rotation", "transform"],
  },
  {
    id: "checklist",
    name: "Integration Checklist",
    description:
      "Step-by-step checklist for software configuration and mechanical setup when integrating a new AMR into production.",
    path: "/tools/checklist",
    icon: "checklist",
    category: "amr",
    status: "active",
    tags: ["amr", "integration", "checklist", "production", "configuration"],
  },
  {
    id: "pdi",
    name: "PDI Check Sheet Generator",
    description:
      "Upload an Excel template, answer extracted questions through a guided UI, and generate a correctly named and filled check sheet.",
    path: "/tools/pdi",
    icon: "pdi",
    category: "utility",
    status: "funding-cancelled",
    tags: ["pdi", "excel", "inspection", "generator", "check sheet"],
  },
];

/**
 * Get a tool by its ID
 */
export function getToolById(id: string): Tool | undefined {
  return toolsRegistry.find((tool) => tool.id === id);
}

/**
 * Get all active tools
 */
export function getActiveTools(): Tool[] {
  return toolsRegistry.filter((tool) => tool.status === "active");
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: Tool["category"]): Tool[] {
  return toolsRegistry.filter((tool) => tool.category === category);
}

/**
 * Get all tool categories with their tools
 */
export function getToolsGroupedByCategory(): Record<string, Tool[]> {
  return toolsRegistry.reduce(
    (acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    },
    {} as Record<string, Tool[]>
  );
}

/**
 * Category display names
 */
export const categoryNames: Record<Tool["category"], string> = {
  amr: "AMR Tools",
  utility: "Utility Tools",
  other: "Other",
};
