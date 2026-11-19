# AGENTS.md — Rules for AI agents working on FinTrack

## Rule 1: Record every decision in `docs/decision.md` (mandatory)

`docs/decision.md` is the append-only log of every decision made in this project.

Before you finish any task, add an entry to `docs/decision.md` if you or the user did any of the following:

- Chose a library, framework, service, or tool, or rejected one.
- Changed or added to the data model, API contract, or business rule.
- Picked one approach over another (architecture, UX behavior, fallback, security, deployment).
- Reversed or replaced an earlier decision. Do not delete the old entry. Mark it `Superseded by D-xxx` and add a new one.

Entry rules:

- Append at the bottom with the next ID (`D-001`, `D-002`, ...). Never renumber or rewrite history.
- Use the template at the top of `docs/decision.md` (Date, Status, Context, Decision, Alternatives, Consequences, Affected features).
- Keep each entry short. Record the *why*, not a code walkthrough.
- If you cannot tell whether something counts as a decision, log it.

## Rule 2: Keep feature specs in sync

Each feature has a spec in `docs/features/<feature>.md`. When you change a feature's behavior, endpoints, data, or rules, update its spec in the same change. If a change comes from a decision, link the `D-xxx` ID in the spec.

## Rule 3: Database safety

Follow `.agents/skills/db-safeguard/SKILL.md`. Never run `prisma db push` against production or staging, and never wipe the database.

## Rule 4: Follow `rules.md`

Read and follow [rules.md](rules.md). It holds the working rules for every task. Most important: if a prompt is vague, ask the user with options and never assume.

## Rule 5: Use the required skills

External skills live in `.agents/skills/` (install steps in [docs/required-skills.md](docs/required-skills.md)). Read a skill's `SKILL.md` before using it, and use the matching skill for the task:

| Task | Skill |
|------|-------|
| Build or restyle UI (components, pages, sliders) | `frontend-design`, `ui-ux-pro-max`, `taste-skill`, `impeccable` |
| Animations and transitions | `ui-animation` |
| Backend routes, services, data access | `backend-patterns` |
| Review a diff before commit | `code-review` |
| Database changes | `db-safeguard` (see Rule 3) |
| Rewriting text so it reads naturally | `humanizer` |

If a skill is missing, install it per `docs/required-skills.md`. If a skill conflicts with `AGENTS.md` or `rules.md`, those win.

## Reference docs

- `rules.md` — working rules (clarify vague prompts)
- `docs/required-skills.md` — external agent skills and install steps
- `docs/decision.md` — decision log
- `docs/features/README.md` — feature spec index
- `technical_design.md` — user stories and API design
- `PRODUCT.md` — product users, purpose, and constraints
- `design.md` — visual design system (tokens, components)
- `docs/architecture.md` — stack, data model, API routes, security
- `DEPLOYMENT.md` — deployment guide
