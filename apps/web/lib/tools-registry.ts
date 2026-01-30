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
  icon: "finetune" | "default";
  /** Tool category for grouping */
  category: "amr" | "utility" | "other";
  /** Whether the tool is ready for use */
  status: "active" | "coming-soon" | "beta";
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
  // Add more tools here as they are developed
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
