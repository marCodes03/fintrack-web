# Required agent skills

External skills this project uses (7). Deliberately not installed: `web-design-guidelines` (overlaps with ui-ux-pro-max and frontend-design) and `react-best-practices` (FinTrack is Angular). They are installed locally under `.agents/skills/<name>/` and are **not committed** (see `.gitignore`). Each one must end up with `.agents/skills/<name>/SKILL.md`.

Project-owned skills (committed, already present): `db-safeguard`, `humanizer`.

## Skills

| # | Skill | Source | Path in repo | Use for |
|---|-------|--------|--------------|---------|
| 1 | `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | `skills/frontend-design` | Distinctive, production-grade UI for pages and components |
| 2 | `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | `.claude/skills/ui-ux-pro-max` | UI/UX design intelligence: styles, palettes, typography, layout |
| 3 | `code-review` | [mattpocock/skills](https://github.com/mattpocock/skills) | `skills/engineering/code-review` | Reviewing diffs before commit |
| 4 | `backend-patterns` | [affaan-m/ECC](https://github.com/affaan-m/ECC) | `.agents/skills/backend-patterns` | Express/Prisma API, service and data-access patterns |
| 5 | `ui-animation` | [mblode/agent-skills](https://github.com/mblode/agent-skills) | `skills/ui-animation` | Motion and transitions (sliders, dashboard) |
| 6 | `taste-skill` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | `skills/taste-skill` | Design taste and anti-generic UI polish |
| 7 | `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | `.agents/skills/impeccable` | Frontend design quality and critique commands |

Paths above were checked against each repo's file tree on 2026-11-19.

## Install

Run from the repo root. Replace `<repo>`, `<path>` and `<name>` with the values in the table.

```bash
tmp=$(mktemp -d)
git clone --depth 1 --filter=blob:none --sparse https://github.com/<repo>.git "$tmp"
git -C "$tmp" sparse-checkout set <path>
mkdir -p .agents/skills
cp -r "$tmp/<path>" .agents/skills/<name>
rm -rf "$tmp"
test -f .agents/skills/<name>/SKILL.md && echo "ok: <name>"
```

Example (`frontend-design`):

```bash
tmp=$(mktemp -d)
git clone --depth 1 --filter=blob:none --sparse https://github.com/anthropics/skills.git "$tmp"
git -C "$tmp" sparse-checkout set skills/frontend-design
mkdir -p .agents/skills
cp -r "$tmp/skills/frontend-design" .agents/skills/frontend-design
rm -rf "$tmp"
```

## Skip oversized folders

Do not pull these unless explicitly needed:

- `taste-skill`: the `assets/` folder
- `ui-ux-pro-max`: the `canvas-fonts/` folder

After copying, delete them if present:

```bash
rm -rf .agents/skills/taste-skill/assets .agents/skills/ui-ux-pro-max/canvas-fonts
```

## Notes

- These are third-party skills. Read each `SKILL.md` before first use.
- If a skill conflicts with `AGENTS.md` or `rules.md`, those win.
