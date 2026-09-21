# Skill Registry — elinain

> Generated: 2026-09-20. Index only — `SKILL.md` remains the source of truth.
> Delegators: match by trigger/description + scope, then pass the exact `SKILL.md` path to the subagent. Do not inject compact rules or summaries.

## Scanned sources (scan order)

1. `/home/mquintana/.config/opencode/skills` (user-level, primary) — 20 × `*/SKILL.md` found
2. `/home/mquintana/.claude/skills` (user-level, secondary) — 19 × `*/SKILL.md` found, all duplicates of #1, skipped
3. `/home/mquintana/Documentos/workspace/programacion/proyectos/Elinain` (project-level) — 0 × `**/SKILL.md` found

## Registry contract

- Deduplicate by skill name, preferring project-level over user-level; first source in scan order wins on ties.
- Skipped per skill policy: `sdd-*`, `_shared`, `skill-registry` (not indexed here).
- `SKILL.md` is authoritative; this file carries names, triggers, scopes, and exact paths only.

## Skills

| Skill | Trigger / Description | Scope | Path |
|-------|------------------------|-------|------|
| chained-pr | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | user (opencode) | /home/mquintana/.config/opencode/skills/chained-pr/SKILL.md |
| cognitive-doc-design | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | user (opencode) | /home/mquintana/.config/opencode/skills/cognitive-doc-design/SKILL.md |
| go-testing | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | user (opencode) | /home/mquintana/.config/opencode/skills/go-testing/SKILL.md |
| judgment-day | Trigger: judgment day, dual review, adversarial review, juzgar. Run explicit blind dual review with at most two scoped fix/re-judgment rounds. | user (opencode) | /home/mquintana/.config/opencode/skills/judgment-day/SKILL.md |
| skill-creator | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | user (opencode) | /home/mquintana/.config/opencode/skills/skill-creator/SKILL.md |
| skill-improver | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | user (opencode) | /home/mquintana/.config/opencode/skills/skill-improver/SKILL.md |
| work-unit-commits | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | user (opencode) | /home/mquintana/.config/opencode/skills/work-unit-commits/SKILL.md |

## Skipped / duplicates

- Skipped by policy (13 unique names, both user locations): sdd-apply, sdd-archive, sdd-design, sdd-explore, sdd-init, sdd-onboard, sdd-propose, sdd-research, sdd-spec, sdd-tasks, sdd-verify, skill-registry (+ sdd-_shared rule, none found).
- Duplicates (kept opencode copy, skipped claude copy): chained-pr, cognitive-doc-design, go-testing, judgment-day, sdd-apply, sdd-archive, sdd-design, sdd-explore, sdd-init, sdd-onboard, sdd-propose, sdd-research, sdd-spec, sdd-tasks, sdd-verify, skill-creator, skill-improver, skill-registry, work-unit-commits.
- Project-level skills: none found, so nothing preferred over user-level.
- `.gitignore`: repo has no `.gitignore` and is not a git repo — `.atl/` ignore entry not applied.
