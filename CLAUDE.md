# Working in this repo

This is a public repository of Claude Code mods. Each mod is a folder with its own `hooks/`, `types/` and tests, and `.claude-plugin/marketplace.json` lists them.

## Every change that gets pushed updates the README

Before committing, read the diff and update `README.md` so it matches: the mod's row in its table, the Status section (what has and has not been seen on a real screen), setup steps, and any statement that is no longer true. Do this in the same commit as the change.

## Raise the version

Claude Code caches an installed plugin by its version, so a change under the same version never reaches existing installs. Raise `version` in the mod's `plugin.json` with every change to it.

## Other rules

- Never push unless the user says to. The `git-guard` mod enforces this.
- Run the secrets scan before every commit, and check that no personal details, project or client names, or images are staged. The repo is public.
- Add a new mod to `.claude-plugin/marketplace.json` and to the README tables.
- Run `claude plugin validate <mod>` and `claude plugin test <mod>` for each mod you touched.
- No em dashes or en dashes in any file.
