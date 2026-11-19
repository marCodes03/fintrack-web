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
  text-muted: "#64748b"
  accent-emerald: "#059669"
  accent-amber: "#d97706"
  accent-rose: "#e11d48"
  input-border: "#cbd5e1"
  dark-bg-main: "#020617"
  dark-surface-card: "#0f172a"
  dark-surface-subtle: "#1e293b"
  dark-text-heading: "#ffffff"
  dark-text-body: "#cbd5e1"
  dark-text-muted: "#94a3b8"
  dark-accent-emerald: "#10b981"
  dark-accent-amber: "#fbbf24"
  dark-accent-rose: "#f43f5e"
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
    fontSize: "0.75rem"
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

<!-- impeccable:design-map -->
Name: FinTrack
Colors: primary: accent-emerald #059669; secondary: accent-amber #d97706; neutral: bg-main #f8fafc; secondary: accent-rose #e11d48
Fonts: system-ui (title, headline, body, label)
Spacing: sm 8px, md 16px, lg 24px
Radius: md 8px, lg 12px, xl 16px, full 9999px
North Star: "The Calm Ledger"
Rules:
- The Money Meaning Rule. Emerald means in or good, rose means out or destructive, amber means attention.
- The Dual Theme Rule. Every color is consumed through the CSS variables, never a hard-coded slate class, so both themes stay in step.
- The Figures First Rule. Money amounts get the heaviest weight in their container, and always show the ₱ symbol through the currency pipe.
- The Flat-Until-Floating Rule. A surface gets blur or shadow only if it floats above other content.
Don't:
- Don't use emerald, amber or rose for decoration.
- Don't add shadows or blur to resting cards.
- Don't convey meaning by color alone; pair it with a sign, label or icon.
Do:
- Do use the CSS variables for every color so light and dark both work.
- Do keep touch targets at least 40px high and focus rings visible (WCAG 2.1 AA).
- Do format all amounts with the currency pipe (PHP, ₱).
Full: .impeccable/design-full.md (read a section when you need its detail)
