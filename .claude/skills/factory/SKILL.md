---
name: factory
description: Run a feature through the software factory loop (spec, build, 4 parallel reviews, approve, merge). Commands: /factory <feature>, next, approve <job-id>, rework <job-id> <note>.
---

You are the orchestrator. You run the loop, spawn every agent, and are the only writer of `factory/board.json`. Agents get context from files and write only their own file. Give them absolute paths.

Repo facts (keep in the spec): this repo is a set of Claude Code mods (TypeScript hooks, one folder per mod). Test command per touched mod: `claude plugin validate <mod>` and `claude plugin test <mod>`. Read `CLAUDE.md` for conventions. Never push.

## Setup for a job

1. Id: next free number plus slug, e.g. `003-rate-limiting` (look at `factory/jobs/`).
2. `mkdir factory/jobs/<id>`; add `{ "id", "branch": "factory/<id>", "stage": "spec", "round": 0, "rounds": [] }` to board.json.
3. Worktree so the builder never disturbs main: `git worktree add ../factory-wt/<id> -b factory/<id>`.

Update board.json at every transition (stage, round, and each verdict as its file lands). Stages: `spec`, `build`, `review`, `approve`, `merged`, `needs-human`. `rounds` is a list, one object per round: `{ "security": "pending|PASS|CHANGES", "ux": ..., "ui": ..., "code": ... }`.

## The loop

1. **spec**: spawn `spec-writer` with the feature text and the job folder. It writes `spec.md` (with acceptance criteria).
2. **build**: spawn `builder` with `name: builder-<id>`, pointing at `spec.md` and the worktree. It commits on `factory/<id>` and writes `build.md`.
3. **review**: round N = `round-N/`. Spawn `review-security`, `review-ux`, `review-ui`, `review-code` in ONE message so they run in parallel, each told the round folder and worktree. WAIT FOR ALL: the round is done only when all four files exist. Read the first line of each (`VERDICT: PASS` or `VERDICT: CHANGES`) and record it.
4. Any CHANGES and round < 2: `SendMessage` to `builder-<id>` pointing at the round folder (never spawn a new builder, never resume mid-round), then review round N+1 with fresh reviewers. Any CHANGES after round 2: go to approve anyway, the approver will usually escalate.
5. All PASS: spawn `approver` with the job folder. It writes `decision.md`, first line `APPROVE` or `ESCALATE`.
6. APPROVE: merge, `git merge --no-ff factory/<id>` on main, remove the worktree, stage `merged`. ESCALATE: stage `needs-human`, tell the user why in two lines.

## Commands

- `/factory <feature>`: new job through the loop.
- `/factory next`: take the first unchecked `- [ ]` item in `factory/backlog.md`, run it, tick it.
- `/factory approve <job-id>`: merge a needs-human job into main as in step 6.
- `/factory rework <job-id> <note>`: write the note to `factory/jobs/<id>/rework.md`, resume `builder-<id>` (spawn a new builder with that name if it is gone) pointing at it, then run another review round.

No em dashes or en dashes anywhere. Finish by printing the job id, final stage, and the dashboard hint: `cd factory && python3 -m http.server`.
