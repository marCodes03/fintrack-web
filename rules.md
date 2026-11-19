# rules.md — Working rules for agents

Linked from [AGENTS.md](AGENTS.md). These rules apply to every task.

## Rule 1: Clarify vague prompts. Never assume.

If a request is vague, ambiguous, or can be read more than one way, **stop and ask before doing any work**.

A prompt is vague when any of these is true:

- It does not say which feature, file, screen, or endpoint it is about.
- It does not say what the result should look like or how it should behave.
- It allows two or more reasonable readings (for example "fix the budget page", "make it better", "update the accounts").
- It depends on a choice the user has not made (library, behavior, data shape, scope).
- It could change or delete data, and the target or scope is unclear.

How to ask:

1. **Ask with options.** Use the `AskUserQuestion` tool when available. Give 2–4 concrete, distinct options, put your recommended option first and mark it "(Recommended)", and let the user answer with their own text.
2. **Ask only what blocks you.** Keep to the few questions whose answers change what you do. Do not ask about things the code, the docs in `docs/`, or `AGENTS.md` already answer.
3. **Make each question stand alone.** Name the items you are asking about. Do not rely on earlier text the user may not see.
4. **Do not start work on a guess.** No partial edits, and no "I assumed X, so I did it". Wait for the answer.
5. **Log the outcome.** If the answer is a project decision, record it in `docs/decision.md` (see AGENTS.md, Rule 1).

When not to ask: the request is specific, has one obvious reading, and the action is easy to undo.
