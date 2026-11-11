# keagan-claude-mods

Small Claude Code mods (function-hook plugins). Some remove repeated manual work, and some restyle the terminal, the VS Code extension and the desktop app. Each installs on its own, so take only the ones you want. They are early-access: the plugin API they use can change between Claude Code releases.

## Install

At the prompt of a terminal session:

```
/plugin install git-guard --marketplace Keagan-Herman/keagan-claude-mods
```

From a shell:

```
claude plugin install git-guard --marketplace Keagan-Herman/keagan-claude-mods
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every project). Swap `git-guard` for any mod name below, one install per mod. After installing, start a new session or run `/reload-plugins`.

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `Keagan-Herman/keagan-claude-mods`, then Add plugin.

## Workflow mods

| Mod | What it does |
| --- | --- |
| `git-guard` | Blocks `git push` unless that turn's prompt asked for one (say "push", or press **Allow push**; "dont push" counts as no). A dropdown above the prompt switches the active `gh` account, and a push is blocked if the repo was last used with a different one. The status line shows branch, uncommitted and unpushed counts. Stops the model adding its own author line to commits and PRs. Needs `git` and the GitHub CLI (`gh`) signed in. |
| `db-pin` | `/dbpin <project-ref> [label]` pins a repo and branch to one Supabase project. Supabase writes through the Supabase MCP server aimed at any other project are blocked. A band shows the pin and the last migration applied. `/dbpin off` removes it. |
| `deploy-diff` | After a `git commit`, a card under the commit row lists what needs deploying: the `firebase deploy --only ...` command for the changed targets, new Supabase migrations to apply by hand, and new scripts to run. Knows Firebase and Supabase projects only. |
| `phase-stepper` | After a turn that finishes a phase or batch, suggests the next prompt in the empty box (Tab to take it), with a local-commit step when files are uncommitted. |
| `downloads-lookup` | When a prompt mentions your Downloads folder, finds files and folders whose names match the prompt and gives the model their paths so it does not search. It attaches paths only and never reads file contents. |

## Look-and-feel mods

Each restyles one surface and passes everything else straight through, so installing all three is safe: each changes only the surface it is named for. Each has an on/off button above the prompt, and the choice is remembered. All styling is original: no artwork, logos or text from any game or series.

| Mod | Surface | What it does |
| --- | --- | --- |
| `cosmos-terminal` | Terminal | An animated strip above the prompt (a sun with three orbiting planets, twinkling stars, a black hole with a turning accretion disc, and the occasional comet), a planet colour for each tool in the tool rows (a comet on an error), and orbital spinner words. **Lights off** / **Lights on** toggles it. The strip repaints about ten times a second and gives way on a short window. |
| `cyberpunk-vscode` | VS Code extension | A coloured tag in front of each tool row (yellow, cyan while running, magenta on error), hacker-style spinner words, a hazard-stripe band above the prompt with **Engage** / **Disengage**, and `/netrun`, which tries to open a small readout panel (branch, uncommitted files, turns, last turn). If the extension cannot dock a panel it says so, and the band carries the readout. |
| `anime-desktop` | Desktop app | A frosted-glass backdrop with three original scenes (`burst`, `aura`, `stadium`) or your own image, a marked tool row, a "power level" band (output tokens this session, with a rank), `/dojo` for a panel with the same numbers, and `/anime` to turn the backdrop on or off. The backdrop needs a recent Claude Code; without it the rest still works. |

## Status

Honest notes on how far each has been checked.

- Every mod has tests, type-checks and validates. The tests check that what a mod draws is valid on each surface. They cannot show how it looks.
- **Not yet seen on a real screen:** the three look-and-feel mods. Colours, spacing, the animation's smoothness and whether the VS Code extension can dock the `/netrun` panel are all unconfirmed.
- **`anime-desktop`'s backdrop is untested.** The Claude Code command-line tool used to validate and test mods (2.1.314) predates the backdrop API, so it could not check it. If the backdrop does not appear, update Claude Code first. The rest of the mod does not depend on it.
- Token use: the look-and-feel mods and `deploy-diff` and `phase-stepper` draw on screen only and add no tokens. `downloads-lookup` adds a few lines of file paths to a prompt that mentions Downloads, and a blocked push or database call sends the model one short message.

## After installing: setup and making them yours

These are general versions. Installing is enough for `phase-stepper`, `downloads-lookup` and the three look-and-feel mods. The others need a little setup, and two have places meant to be edited.

### git-guard

1. Install `git` and the [GitHub CLI](https://cli.github.com/), then sign in: `gh auth login`.
2. For more than one account, run `gh auth login` once per account. The dropdown above the prompt lists every account `gh` knows, in `gh`'s own order. Check with `gh auth status`.
3. Picking an account runs `gh auth switch`, which changes the account for the whole machine, not just that session. It does not change your commit name or email. Set those yourself per repo if you need to: `git config user.email "<id>+<login>@users.noreply.github.com"`.
4. A push is blocked unless your prompt says "push" (or you press **Allow push**). A repo remembers the last account you picked there and blocks pushes from a different one.
5. To put your own accounts first, add a `PREFERRED` list to `git-guard/hooks/git.ts` and sort `parseAccounts` by it.

### db-pin

Run `/dbpin <project-ref> [label]` once on each branch you want locked. A project ref is the 20 lowercase letters in your Supabase project URL. It guards writes made through the Supabase MCP server, so that server has to be connected. It does not guard scripts or the Supabase CLI.

### deploy-diff

It recognises Firebase (a `firebase.json` in the repo) and Supabase (a `supabase` folder). For another stack, add a row to the `FIREBASE` list or a branch in `advise()` in `deploy-diff/hooks/deploy.ts`, mapping changed paths to the command or note you want on the card. The test in `deploy.test.ts` shows the shape.

### anime-desktop: your own backdrop image

In Claude Code settings, set the mod's `backdropImage` option to the absolute path of a `.jpg`, `.png` or `.webp` you have the right to use. The backdrop is an SVG that the desktop caps at about 128 KB, so the picture must be at most about 95 KB. Resize it first (for example 1280 pixels wide at moderate quality in WebP). If it is too big, the mod says so and uses the built-in scene. The `scene` option picks `burst`, `aura` or `stadium`. Do not commit images you do not own to this repository.

### Editing a mod

Copy the repo, change the files, then run `claude plugin validate <mod>` and `claude plugin test <mod>`. Load your copy without installing by starting a session with `claude --plugin-dir <path-to-mod>`.

## Checks

Each mod has a small test file. Run `claude plugin test <mod>` and `claude plugin validate <mod>` inside the folder.
