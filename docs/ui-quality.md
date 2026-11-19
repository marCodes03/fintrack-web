# UI quality checks

How to re-check the interface after a UI change. Design context lives in `PRODUCT.md` (product truth) and `design.md` (visual system); decisions are logged in `decision.md`.

## Impeccable commands

Run from the repo root (on Windows use `impeccable.cmd`):

```
.agents/skills/impeccable/scripts/impeccable detect --json --changed
.agents/skills/impeccable/scripts/impeccable doctor --json
```

In the agent: `$impeccable audit <page>`, `critique`, `polish`, `harden`, `adapt`. The design hook (`.codex/hooks.json`) runs the detector after UI edits. A finding on an `sr-only` element reading `rgb(0,0,0)` is a false positive.

## House rules the checks enforce

- Colors come from the tokens in `src/styles.css` (`accent-*`, `text-*`, `on-accent`, `chart-*`). No raw palette classes such as `text-emerald-500`, no `dark:` color overrides.
- Light-mode accent text must hold 4.5:1 on `surface-card` and `surface-subtle`.
- Text is 13px or larger (`text-xs` is set to 13px).
- Icons come from `<app-icon name="...">`. No emoji or text glyphs. Add new icons to the registry in `components/icon/icon.component.ts`.
- Overlays use `appDialog`. Icon-only buttons need `aria-label`; table headers need `scope`.
- Motion respects `prefers-reduced-motion`; entrance classes (`animate-in`, `fade-in`, `slide-in-from-right`, `zoom-in-95`) are defined in `styles.css`.

## Rendered check (headless Chrome)

No test runner covers rendering. For a contrast or layout check, build with `ng build`, serve `dist/fintrack-web/browser` with an SPA fallback on a `localhost` port, mock the `/api` calls through the Chrome DevTools Protocol (`Fetch.enable`), seed `fintrack_token` and `fintrack_user` in localStorage, and compute text/background contrast for each page in light and dark. Never point this at a real database.
