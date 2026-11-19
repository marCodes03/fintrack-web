---
name: FinTrack
description: A plan-first personal budgeting app on calm slate surfaces, where emerald, amber and rose carry money meaning.
colors:
  bg-main: "#f8fafc"
  surface-card: "#ffffff"
  surface-subtle: "#f1f5f9"
  border-subtle: "#e2e8f0"
  text-heading: "#0f172a"
  text-body: "#334155"
  text-muted: "#586579"
  accent-emerald: "#046c4e"
  accent-amber: "#9a4506"
  accent-rose: "#be123c"
  accent-teal: "#0369a1"
  accent-indigo: "#4338ca"
  chart-1: "#4f46e5"
  chart-2: "#0284c7"
  chart-3: "#7c3aed"
  chart-4: "#c026d3"
  chart-5: "#64748b"
  input-border: "#cbd5e1"
  dark-bg-main: "#020617"
  dark-surface-card: "#0f172a"
  dark-surface-subtle: "#1e293b"
  dark-text-heading: "#ffffff"
  dark-text-body: "#cbd5e1"
  dark-text-muted: "#94a3b8"
  dark-accent-emerald: "#10b981"
  dark-accent-amber: "#fbbf24"
  dark-accent-rose: "#fb7185"
  dark-accent-teal: "#38bdf8"
  dark-accent-indigo: "#818cf8"
typography:
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "{colors.surface-card}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: FinTrack

## Overview

**Creative North Star: "The Calm Ledger"**

FinTrack reads like a well-kept ledger: quiet slate surfaces, dense but legible numbers, and three accents that always mean the same thing. It borrows the focus of a dark-first night desk (dark mode is a full peer of light) and the friendliness of a pocket planner (plain labels, one clear next action per screen).

Cards feel solid and confident, with clear borders and firm buttons. Glass is reserved for overlays that sit above content, such as the fixed header and slider drawers, where a soft blur and lift show layering. Everything else stays flat.

**Key Characteristics:**
- Slate neutrals in light and dark, switched by a `.dark` class on CSS variables.
- Emerald, amber and rose are semantic money colors, never decoration.
- Bold small uppercase labels over medium-weight body text.
- Generous rounded corners (12-16px) on every interactive surface.

## Colors

Cool slate neutrals with three semantic accents. Values below are light mode; dark counterparts are the `dark-*` tokens above.

### Primary
- **Ledger Emerald** (#046c4e light, #10b981 dark): primary actions, interactive items, income and success, focus rings (`ring-emerald-500`), scrollbar thumb.

### Secondary
- **Caution Amber** (#9a4506 light, #fbbf24 dark): warnings, configuration states, partial progress.
- **Spend Rose** (#be123c light, #fb7185 dark): expenses and destructive actions.

### Neutral
- **Mist Page** (#f8fafc light, #020617 dark): page background.
- **Paper Card** (#ffffff light, #0f172a dark): cards, header (90% opacity), inputs.
- **Slate Wash** (#f1f5f9 light, #1e293b dark): subtle fills, hover rows, table headers.
- **Hairline** (#e2e8f0 light, #1e293b dark): borders and dividers.
- **Ink / Body / Muted** (#0f172a, #334155, #64748b light; #ffffff, #cbd5e1, #94a3b8 dark): heading, body, label text.

### Named Rules
**The Money Meaning Rule.** Emerald means in or good, rose means out or destructive, amber means attention. Never use them for decoration or swap their roles.
**The Dual Theme Rule.** Every color is consumed through the CSS variables, never a hard-coded slate class, so both themes stay in step.

## Typography

**Display / Body / Label Font:** system UI stack (`system-ui`, Segoe UI, Roboto, with sans-serif fallback). No web fonts load.

**Character:** Native and neutral, so the numbers and the semantic colors do the talking.

### Hierarchy
- **Headline** (700, 1.875rem): page and key-figure headings.
- **Title** (700, 1.25rem, -0.025em): brand and card titles.
- **Body** (500, 0.875rem): form text and table content.
- **Label** (700, 0.8125rem, 0.05em, uppercase): column heads, field labels, inline actions (13px is the floor, no smaller text).

### Named Rules
**The Figures First Rule.** Money amounts get the heaviest weight in their container, and always show the ₱ symbol through the currency pipe.

## Layout

Fixed 64px header, content in a centered `max-w-7xl` container with 16/24/32px side padding at base/sm/lg. Mobile-first with `sm:` and `lg:` breakpoints. Spacing rhythm is Tailwind's 4px scale; cards use 24px padding, controls use 10-12px vertical.

## Elevation & Depth

Hybrid: flat tonal layering by default, glass for overlays. Surfaces are separated by tone and a hairline border. The header uses `backdrop-blur` over 90% card color; drawers and modals lift with a soft shadow and a blurred scrim. Hover feedback is a tonal shift, not a shadow.

### Named Rules
**The Flat-Until-Floating Rule.** A surface gets blur or shadow only if it floats above other content.

## Shapes

Soft and consistent: `rounded-xl` (12px) for buttons and inputs, `rounded-2xl` (16px) for cards and panels, `rounded-lg` (8px) for icon buttons, `rounded-full` for pills and avatars. Borders are 1px hairlines.

## Components

### Buttons
- **Shape:** 12px radius.
- **Primary:** Ledger Emerald fill, white text (dark mode: slate-950 text), bold 13px label, 10px 16px padding. Hover darkens in light mode and lightens in dark.
- **Secondary:** card fill, hairline border, muted bold text; hover fills Slate Wash.
- **Inline text actions:** 10px bold uppercase, emerald for edit and rose for delete.
- **Transitions:** `transition-all` / `transition-colors`, 200-300ms.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Paper Card with Hairline border.
- **Padding:** 20-24px.

### Inputs / Fields
- **Style:** card fill, `input-border` stroke, 12px radius.
- **Focus:** 2px emerald ring.

### Navigation
- Fixed top header with logo, `FinTrack` wordmark, icon buttons (hover tint `black/5` light, `white/5` dark) and a slide-in drawer for secondary actions (password reset, review, log out).

### Donut Chart (signature)
A CSS conic-gradient donut for the monthly spent/saved split, paired with progress-to-goal bars. Segments follow the Money Meaning Rule.

## Do's and Don'ts

### Do:
- **Do** use the CSS variables for every color so light and dark both work.
- **Do** keep touch targets at least 40px high and focus rings visible (WCAG 2.1 AA).
- **Do** format all amounts with the currency pipe (PHP, ₱).

### Don't:
- **Don't** use emerald, amber or rose for decoration.
- **Don't** add shadows or blur to resting cards.
- **Don't** convey meaning by color alone; pair it with a sign, label or icon.
