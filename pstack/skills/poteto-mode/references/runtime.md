# pstack runtime

Read this before setup, delegation, transcript access, or writing a skill.
Resolve paths relative to the installed pstack directory, never a guessed plugin-cache path.
For workflow composition, read sibling SKILL.md files by path and follow them; do not call the Skill tool on a skill with `disable-model-invocation: true`.
Those skills remain available through direct user invocation (`/pstack:<skill>` in Claude Code, `$<skill>` in Codex).
These host-specific rules govern the Cursor examples and defaults in the other pstack files.
Repository instructions and the user's authorization still take precedence.

## Detect the host

Identify the native host from the session's tools: Cursor `Task`, Claude Code `Agent` (or `Task` on older versions), or Codex `spawn_agent` and its companion tools.
T3 is an additional orchestration surface, not a native provider.
When T3 tools are available, read `orchestrator_capabilities` for provider instance IDs, models, options, runtime modes, and limits.
If tools are deferred, search for them first; make one bounded direct capability call before declaring T3 absent.
Under ACP, if tools are absent and `T3_ACP_MCP_NODE` is set, use the documented `acp-mcp-call` transport with that executable and the optional `T3_ACP_MCP_ENTRYPOINT`.
Do not guess a host from which model is answering.

Questions use the active host's exposed question tool and actual schema, not an assumed `AskQuestion` name or `allow_multiple` field.
When multiple selection is unsupported or the tool is unavailable in this mode, ask one concise chat question that accepts the user's selections in text.

## Role settings

Read `~/.config/pstack/models.json` on each invocation.
Its shape is `{ "version": 1, "hosts": { "<host>": { "budget": "large", "roles": { "<role>": <choice> } } } }`, with host keys `cursor`, `codex`, `claude`, and `t3`.
Validate version, host keys, budgets, the role list in setup-pstack, choice fields, and nonempty panels before using settings.
Select `t3` settings when present in a T3 session, otherwise the native host's settings.
A choice is `inherit-parent`, `auto`, or an object with `model`, optional `providerInstanceId` (T3 only), and optional `options` containing supported reasoning or speed settings.
Panel roles hold a nonempty array of choices; each entry is one seat, even when entries repeat.
The `arena cross-judge pool` is the exception: select one available entry for its single judge.
Single-agent roles hold one choice.
An absent role uses that workflow's Cursor default only on native Cursor; elsewhere it inherits the parent.
Panels without settings keep their documented seat count, with every seat inheriting the parent outside Cursor.
For native Cursor without a portable Cursor entry, read the existing `~/.cursor/rules/pstack-models.mdc` as before.
Do not delete or rewrite that legacy file during migration.
Malformed settings are an error: name the invalid field and stop setup/delegation until corrected, without overwriting the file.

Discover model choices from the active tool schema or the host's live catalog.
Only offer confirmed choices; when discovery is unavailable, offer inheritance rather than asking the user to retrieve model IDs.
Keep the model ID and reasoning/speed options separate unless the native Cursor catalog explicitly supplies a combined slug.
Never send a Cursor slug to Codex or Claude Code.
`inherit-parent` and `auto` both mean the parent model, not literal model names.
On Claude Code, use `pstack:inherit-worker`, whose agent definition sets `model: inherit`, and omit the invocation model.
Omission on `general-purpose` can select `CLAUDE_CODE_SUBAGENT_MODEL` instead, and current Agent schemas may accept only family aliases, not `inherit` or full IDs.
On Cursor/Codex/T3, use the transport's inheritance semantics without a model override unless an explicit parent selection is needed.
If a host policy forces a different child model, report the effective choice and the blocked inheritance requirement; do not modify that policy.
Do not change the parent session's model or global agent configuration to satisfy a role.
If a configured model or option is unavailable, report it before using a supported same-family equivalent or inheritance, and state the effective choice.
Do not silently claim model diversity: same-model reviewers are independent contexts, not cross-model review.
If the user requires different models and the host cannot supply them, report that requirement as blocked.

## Delegate through the available tool

Give every child the full task, scope, permissions, verification command, and expected report.
Include the path to the relevant pstack skill or agent definition and require the child to read it before acting.
Use a registered `poteto-agent` when compatible with the requested model; otherwise use the runtime's general/inherited worker with `agents/poteto-agent.md` as its instruction source.
For Comment Sicko, use the registered agent or require a general reviewer to read `agents/comment-sicko.md`.
Claude plugin agents are namespaced, for example `pstack:poteto-agent`, `pstack:comment-sicko`, and `pstack:inherit-worker`.
Codex does not load these Markdown files as native agent types; do not send invented `agent_type` values.

- **Cursor:** use its actual `Task` schema, background execution, and cloud isolation when available.
- **Claude Code:** use the exposed `Agent`/`Task` schema and `general-purpose` or a registered plugin agent, not Cursor's `generalPurpose`.
  Pass only supported fields; do not assume `readonly` or `environment` exists.
- **Codex:** use `spawn_agent`, retain agent IDs, and use its message/wait/interrupt/close tools as exposed.
  Do not send Cursor's `subagent_type`, `environment`, or `run_in_background` fields.
- **T3:** prefer native tools for same-provider work only when they support the requested model and options.
  Otherwise use `delegate_task`, including for cross-provider work, with the catalog's `providerInstanceId`, `model`, and `options`.
  Explicitly T3-owned child tasks always use `delegate_task`, even when native tools support their model and options.
  Use asynchronous mode for long tasks and a stable `clientRequestId` per round.
  Retain each `taskId`; use `task_status`/`task_cancel` to manage it.
  A new review round calls `delegate_task` again with the original brief, findings, responses, and unresolved objections.
  `childThreadId` is backing storage, not a continuation target.
  Never substitute `t3_thread_launch` or `create_threads`: those create top-level conversations.

Read-only is a permission and behavior requirement, not a portable tool flag.
Keep needed MCP access using the host's supported permissions, and explicitly forbid edits in investigative/review briefs.
Do not widen permissions or claim enforcement from a flag another host ignores.
Workers that write must have separate worktrees/output directories before starting; local native agents may share the parent's checkout by default.
Cloud VMs, nested delegation, and durable agents are capabilities to check, not universal defaults.
Honor the actual concurrency limit; queue remaining seats and record incomplete coverage.
Do not replace a required independent review with self-review if delegation is unavailable.

## Session history and paths

Use the current session ID, workspace, and transcript path supplied by the host.
T3 can read its current thread through `t3_thread_read`; paginate when the task needs the full trail.
Cursor's `agent-transcripts/` examples apply only to Cursor.
For Codex/Claude, inspect only a known in-scope session file, or filter session metadata for the active workspace before reading message bodies.
Never glob and read all projects' messages or guess that another host uses Cursor's JSONL shape.
Use a digest of the visible conversation when the workflow permits it and history is unavailable; report the gap.
An eval requiring tool-call evidence remains blocked without actual transcripts; a digest cannot prove which files an agent opened.
For worktree audits outside Cursor, set `PSTACK_TRANSCRIPTS_DIR` to a confirmed workspace-only directory, or an empty string to disable Cursor history scanning.
Unknown history must remain a review requirement, not evidence that deletion is safe.

Project/personal skill directories are `.cursor/skills/` and `~/.cursor/skills/` for Cursor, `.claude/skills/` and `~/.claude/skills/` for Claude Code, and `.agents/skills/` and `~/.agents/skills/` for Codex.
In T3, use the native provider's directory, or `.agents/skills/` when the user requests shared Codex/Claude project skills and both hosts discover it.
Preserve an existing skill's location.
Use the host's skill-authoring skill when available; otherwise follow Agent Skills frontmatter, validate links, and test the draft on a scoped task.
For explicit-only Codex skills, create or preserve `agents/openai.yaml` with `policy.allow_implicit_invocation: false`; `disable-model-invocation: true` alone does not set Codex's policy.
Missing `cursor-team-kit` helpers are not installed automatically: perform their required diff cleanup or runtime proof using available tools and report any missing proof capability.

## Waiting and autonomous runs

Use a native watcher/scheduler only when available and authorized; do not assume Cursor's `/loop` exists elsewhere.
In T3, use `watch_pull_request` for PR monitoring, then end the turn so notifications can wake it.
Link any PR being worked on with `link_pull_request`; call `unwatch_pull_request` when handing it back.
Use `schedule_task` only for requested persistent recurring work, with a structured schedule object.
Without a persistent wake mechanism, finish what the active session can do and report that unattended continuation is unavailable.
After a restart, inspect recorded child IDs and live status before deciding which work survived or needs a fresh agent.
