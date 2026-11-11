# keagan-claude-mods

Small Claude Code mods (function-hook plugins) that remove repeated manual work. Each installs on its own, so take only the ones you want. They are early-access: the plugin API they use can change between Claude Code releases.

## Install

At the prompt of a terminal session:

```
/plugin install git-guard --marketplace Keagan-Herman/keagan-claude-mods
```

From a shell:

```
claude plugin install git-guard --marketplace Keagan-Herman/keagan-claude-mods
```

Answer `y` to add the marketplace, then pick a scope. Swap `git-guard` for any mod below. In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `Keagan-Herman/keagan-claude-mods`, then Add plugin.

## The mods

| Mod | What it does |
| --- | --- |
| `git-guard` | Blocks `git push` unless that turn's prompt asked for one (say "push", or press **Allow push**; "dont push" counts as no). A dropdown above the prompt switches the active `gh` account, and a push is blocked if the repo was last used with a different one. The status line shows branch, uncommitted and unpushed counts. Stops the model adding its own author line to commits and PRs. Needs `git` and the GitHub CLI (`gh`) signed in. |
| `db-pin` | `/dbpin <project-ref> [label]` pins a repo and branch to one Supabase project. Supabase writes through the Supabase MCP server aimed at any other project are blocked. A band shows the pin and the last migration applied. `/dbpin off` removes it. |
| `deploy-diff` | After a `git commit`, a card under the commit row lists what needs deploying: the `firebase deploy --only ...` command for the changed targets, new Supabase migrations to apply by hand, and new scripts to run. Knows Firebase and Supabase projects only. |
| `phase-stepper` | After a turn that finishes a phase or batch, suggests the next prompt in the empty box (Tab to take it), with a local-commit step when files are uncommitted. |
| `downloads-lookup` | When a prompt mentions your Downloads folder, finds files and folders whose names match the prompt and gives the model their paths so it does not search. It attaches paths only and never reads file contents. |

None of them uses model tokens of its own.

## Checks

Each mod has a small test file. Run `claude plugin test <mod>` and `claude plugin validate <mod>` inside the folder.
