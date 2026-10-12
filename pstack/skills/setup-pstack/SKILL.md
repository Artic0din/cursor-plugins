---
name: setup-pstack
description: Configure pstack role models and reasoning budgets for Cursor, Codex, Claude Code, or T3 Code. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Read [the runtime reference](../poteto-mode/references/runtime.md) first.
Write portable role settings to `~/.config/pstack/models.json`.
Never edit global AGENTS.md, CLAUDE.md, or provider configuration to configure pstack.

## 1. Detect available choices

Identify the native host and whether T3 orchestration is available.
Use the live catalog and tool schemas described in the runtime reference.
In T3, show provider, model, and supported options separately.
Outside T3, only offer models the native child tool can use.
Always offer `inherit-parent` and `auto`.
If no catalog is exposed, inheritance is the safe choice; do not invent IDs or ask the user to fetch them.

## 2. Load current settings

Read the portable file if present and validate version 1, host keys, role names, choice shapes, and panel sizes before editing.
Stop with a specific error on invalid JSON or invalid fields; retain the original.
Preserve other hosts' entries and every valid role already configured.
On native Cursor with no portable Cursor entry, import the budget and current roles from `~/.cursor/rules/pstack-models.mdc`, leaving that file untouched.
Report retired role lines that will be dropped.

Use these roles, matching the workflows:

- Single choices: `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `judgment and prose`, `hardest tasks`, `how explorer`, `how explainer`, `why investigators`, `why synthesizer`, `reflect tooling`, `reflect judgment, divergent, synthesizer`, `swarm workers`.
- Panels: `arena runners`, `arena cross-judge pool`, `architect runners`, `interrogate reviewers`.

Native Cursor retains the workflows' Grok code / Opus judgment defaults when those choices are confirmed available.
On other hosts, start single choices at inheritance and panels at two inherited seats.
Explicitly say when the panel uses one model family.
In T3, a confirmed multi-provider panel can be configured without changing the parent.

## 3. Budget and confirmation

Ask for a budget through the host's question tool, or one concise chat question when none is available:

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

Map the budget to the highest supported effort at or below its target.
Keep the model ID separate from effort and speed options except for confirmed combined Cursor slugs.
Resolve inheritance through the runtime's host-specific rules; the budget does not change the parent.
When the native tool cannot set effort for a child, name that limit instead of claiming the budget was applied.

Show every role with its provider/model, effective effort or inherited setting, and panel seat count.
Keep existing customized choices on a rerun.
Ask the user to accept or change roles before writing.
Unavailable configured choices need an explicit supported replacement; do not silently persist a fallback.

## 4. Write and verify

Use `t3` as the host key when configuring a T3 session, otherwise `cursor`, `codex`, or `claude`.
Choices are aliases or objects; panels are nonempty arrays.
For example, this sets one inherited worker and two independent reviewers without promising different models:

```json
{
  "version": 1,
  "hosts": {
    "codex": {
      "budget": "large",
      "roles": {
        "swarm workers": "inherit-parent",
        "interrogate reviewers": ["inherit-parent", "inherit-parent"]
      }
    }
  }
}
```

A real choice has `model`, optional `providerInstanceId` for T3, and optional `options` with catalog-confirmed values.
Validate every real choice against the selected transport, including option names and values.
Create the parent directory if needed, write a temporary sibling, parse/read it back, and atomically rename it over the destination.
Preserve unrelated host entries.
Read the final file back and compare it with the confirmed settings.
Tell the user which host was configured and that the next skill invocation reads the settings.

## 5. Offer verification once

Check for a project-local verification skill or an existing runtime harness.
If neither exists, offer once to generate one with [create-verification-skill](../create-verification-skill/SKILL.md).
Use the native host's skill directory from the runtime reference.
On acceptance, invoke the generator; otherwise finish setup.
