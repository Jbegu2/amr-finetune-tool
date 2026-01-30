# JB Tools - UI Design Philosophy

A design system guide to maintain visual consistency across all tools in the JB Tools portal.

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary (Red) | `#ff0000` | Primary buttons, brand accent, logo |
| Focus | `#2563eb` | Focus rings, keyboard navigation |
| Danger | `#dc2626` | Delete buttons, error states, warnings |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success/Pick | `#16a34a` | Success states, positive actions |
| Warning/Custom | `#f59e0b` | Custom elements, attention |
| Purple/Approach | `#9333ea` | Secondary accent |
| Blue/Raw | `#1f77b4` | Input data, informational |

### Neutral Colors
| Name | Hex | Usage |
|------|-----|-------|
| Text Primary | `#111` | Headings, body text |
| Text Secondary | `#374151` | Labels, descriptions |
| Text Muted | `#6b7280` | Helper text, placeholders |
| Text Light | `#9ca3af` | Disabled, subtle text |
| Border | `#e2e8f0` | Card borders, dividers |
| Border Light | `#f1f5f9` | Subtle separators |
| Background Page | `#f8fafc` | Page background |
| Background Card | `#ffffff` | Card/panel background |

## Typography

### Font Stack
```css
font-family: "Inter, system-ui, -apple-system, sans-serif";
```

### Scale
| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Page Title (h1) | 22-26px | 700 | -0.02em |
| Section Title (h2) | 14px | 600 | 0.02em (uppercase) |
| Subsection (h3) | 13px | 600 | - |
| Body | 14px | 400 | - |
| Labels | 12-13px | 500-600 | - |
| Helper Text | 11-12px | 400 | - |
| Small/Muted | 10-11px | 400 | - |

## Spacing

### Base Unit: 4px
- **xs**: 4px
- **sm**: 6px
- **md**: 8px
- **lg**: 10-12px
- **xl**: 16px
- **2xl**: 20px

### Common Patterns
- Card padding: 16-20px
- Section margins: 16-20px
- Gap between elements: 6-10px
- Input padding: 8px 10px

## Components

### Buttons

```typescript
// Button base styles
{
  borderRadius: 6,
  padding: "8px 14px",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  border: "1px solid transparent",
  transition: "background-color 0.15s, opacity 0.15s, transform 0.1s"
}

// Variants
Primary:   { background: "#ff0000", color: "#fff", borderColor: "#ff0000", fontWeight: 600 }
Secondary: { background: "#f8fafc", color: "#374151", borderColor: "#e2e8f0" }
Danger:    { background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }
```

### Inputs

```typescript
{
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
  background: "#fff"
}
```

### Cards/Panels

```typescript
{
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
}
```

### Modals

```typescript
// Overlay
{
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100
}

// Modal Box
{
  background: "#fff",
  borderRadius: 10,
  padding: 20,
  minWidth: 320,
  maxWidth: 400,
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
}
```

### Tables

```typescript
{
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12
}

// Header cell
{
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0",
  padding: "6px 4px",
  fontSize: 11,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.03em"
}

// Data cell
{
  borderTop: "1px solid #f3f4f6",
  padding: "6px 4px"
}
```

### Error/Alert Box

```typescript
{
  color: "#dc2626",
  fontSize: 12,
  padding: "8px 10px",
  background: "#fef2f2",
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #fecaca"
}
```

## Focus & Accessibility

### Focus Ring
```css
input:focus, select:focus, button:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

### Button Active State
```css
button:active {
  transform: scale(0.98);
}
```

### Screen Reader Only
```typescript
{
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0
}
```

## Layout Patterns

### Two-Column Grid
```typescript
{
  display: "grid",
  gridTemplateColumns: "minmax(480px, 1fr) minmax(400px, 1.5fr)",
  gap: 20,
  alignItems: "start"
}
```

### Header
```typescript
{
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: "1px solid #e5e7eb"
}
```

### Collapsible Card Header
- Entire left section (icon + title) clickable
- Arrow indicator: ▶ collapsed, ▼ expanded
- `cursor: pointer`, `userSelect: "none"`
- Keyboard accessible with Enter/Space

## Transitions

Standard timing: `0.15s` for most interactions
- Background color changes
- Border color changes
- Opacity changes
- Transform (scale)

## Design Principles

1. **Density over whitespace** - Tools should be compact and information-dense
2. **Clear hierarchy** - Use size, weight, and color to establish importance
3. **Immediate feedback** - Buttons scale on click, inputs show focus
4. **Accessible by default** - Focus rings, ARIA labels, keyboard navigation
5. **Consistent spacing** - Use the 4px base unit system
6. **Subtle shadows** - Light, barely-there shadows for depth
7. **Rounded corners** - 6px for small elements, 10px for cards/modals

## Logo

JBB logo: Red rectangle with white "JBB" text
- Width: 120px, Height: 40px
- Background: Primary red (#ff0000)
- Font: Arial, 24px, bold, white

```tsx
<svg width="120" height="40" viewBox="0 0 120 40" role="img" aria-label="JBB Logo">
  <rect width="120" height="40" fill="#ff0000" />
  <text x="10" y="28" fontFamily="Arial" fontSize="24" fontWeight="bold" fill="white">JBB</text>
</svg>
```
