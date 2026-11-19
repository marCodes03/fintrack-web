# UI quality checks

How to re-check the interface after a UI change. Design context lives in `PRODUCT.md` (product truth) and `design.md` (visual system); decisions are logged in `decision.md`.

## Impeccable commands

Run from the repo root (on Windows use `impeccable.cmd`):

```
.agents/skills/impeccable/scripts/impeccable detect --json --changed
.agents/skills/impeccable/scripts/impeccable doctor --json
```

In the agent: `$impeccable audit <page>`, `critique`, `polish`, `harden`, `adapt`. The design hook (`.codex/hooks.json`) runs the detector after UI edits. A `design-system-color` finding reading `rgb(0,0,0)` is a false positive: the detector cannot resolve CSS variables, so every token colour reads as black. Text sizes: 13px (`text-xs`) is the floor; do not write `text-[13px]`. Use token classes (`text-text-muted`), not `text-[var(--text-muted)]`.

## House rules the checks enforce

- Colors come from the tokens in `src/styles.css` (`accent-*`, `text-*`, `on-accent`, `chart-*`). No raw palette classes such as `text-emerald-500`, no `dark:` color overrides.
- Light-mode accent text must hold 4.5:1 on `surface-card` and `surface-subtle`.
- Text is 13px or larger (`text-xs` is set to 13px).
- Icons come from `<app-icon name="...">`. No emoji or text glyphs. Add new icons to the registry in `components/icon/icon.component.ts`.
- Overlays use `appDialog`. Icon-only buttons need `aria-label`; table headers need `scope`.
- Motion respects `prefers-reduced-motion`; entrance classes (`animate-in`, `fade-in`, `slide-in-from-right`, `zoom-in-95`) are defined in `styles.css`.

## Rendered check (headless Chrome)

No test runner covers rendering. For a contrast or layout check, build with `ng build`, serve `dist/fintrack-web/browser` with an SPA fallback on a `localhost` port, mock the `/api` calls through the Chrome DevTools Protocol (`Fetch.enable`), seed `fintrack_token` and `fintrack_user` in localStorage, and compute text/background contrast for each page in light and dark. Never point this at a real database.

## Manual checks (not covered by the rendered check)

Run before a release, or after changes to dialogs, forms, tables or navigation. Use a test account on a local or staging build, never real data. Note the browser, device and result for each failure.

### Screen reader (NVDA + Firefox or Chrome on Windows; VoiceOver + Safari on iOS)

- [ ] Each page announces one page title (h1) and a sensible heading outline (`H` key).
- [ ] The skip link ("Skip to main content") is the first Tab stop and moves focus to the content.
- [ ] Landmarks are reachable (`D` key): navigation, main.
- [ ] Icon-only buttons read a name (Close, Show password, Hide password, star ratings read "3 stars" and pressed state).
- [ ] Decorative icons are silent (no "graphic" or stray announcements next to labels).
- [ ] Opening any slider or modal announces its name and role ("dialog"); focus lands inside.
- [ ] Escape closes it and focus returns to the button that opened it.
- [ ] Form errors are announced per field, and each field is linked to its message.
- [ ] Success and error messages are announced without moving focus (live regions).
- [ ] Tables read column headers when moving between cells (`Ctrl+Alt+Arrows`).
- [ ] Hidden amounts read "Amount hidden", not bullets.
- [ ] Dashboard loading state announces busy, then the result. The donut chart has a text alternative.

### Keyboard only (no mouse)

- [ ] Every control is reachable with Tab and operable with Enter or Space.
- [ ] Focus ring is visible on every control, in light and dark.
- [ ] Tab order matches reading order; no keyboard trap outside dialogs.
- [ ] Inside a dialog Tab and Shift+Tab stay within it.
- [ ] Scrollable tables and the references tab strip can be scrolled with the keyboard.

### Real touch device (a phone around 360px wide, plus a tablet)

- [ ] No horizontal page scroll on any page, in portrait and landscape.
- [ ] Buttons and links are easy to hit; row checkboxes are usable by thumb (known small: 20px).
- [ ] Sliders and drawers open, scroll and close; the page behind does not scroll.
- [ ] On-screen keyboard does not hide the focused field or the submit button.
- [ ] Number fields open a numeric keypad; email fields open an email keypad.
- [ ] Pinch-zoom works (no `user-scalable=no`) and text reflows at 200% zoom.
- [ ] Press feedback shows on tap.

### Browsers (latest Chrome, Firefox, Edge, Safari, and Safari on iOS)

- [ ] Layout, theme colors and the dark/light toggle match across browsers.
- [ ] Favicon shows in the tab (check the 16px and 32px variants) and the address-bar color follows the theme.
- [ ] Entrance animations play; with OS "Reduce motion" on, they stop but state changes still show.
- [ ] Session cookie login, logout and the idle timeout work.

### Visual and settings

- [ ] OS dark mode on first load picks the right theme.
- [ ] Browser text size set to large (or 200% zoom) breaks no layout.
- [ ] Windows High Contrast / forced colors keeps borders, focus rings and icons visible.
- [ ] Offline fallback (stop the API) shows the expected state and messages.
