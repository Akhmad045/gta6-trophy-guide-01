# Leonida Ledger — GTA VI Trophy Guide & Tracker

![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)
![rank](https://make.fun/badge/gta6-trophy-guide-01/Akhmad045/gta6-trophy-guide-01/rank.svg)
![reward](https://make.fun/badge/gta6-trophy-guide-01/Akhmad045/gta6-trophy-guide-01/reward.svg)

An offline web app that is both a guide and a tracker for all **55 PlayStation 5 trophies of Grand Theft Auto VI** — 1 platinum, 2 gold, 6 silver and 46 bronze, 28 of them hidden on PlayStation, none of them online.

Open `app/index.html` from any static file server (or run `node serve.ts` and visit http://localhost:8080). It works with the network off: everything it loads is a file under `app/`.

## What it does

- **The full official list.** Every trophy with its official name, description and grade, exactly as PlayStation publishes them, held in `app/data/trophies.json`.
- **A guide to each trophy, in our own words, with its sources.** What to do, where and how, and when it can be missed — and a named, linked source (PowerPyx's launch roadmap, the Exophase official list, KeenGamer, Output Lag, WikiGTAVI) beside every guide. Where launch-day coverage has not confirmed a method yet (five one-off secrets), the guide says so plainly and sticks to the official description instead of inventing steps.
- **Roadmap to the platinum.** Seven stages built from the official descriptions — story chapters and missions first (with the one missable moment called out in Chapter 1), then the 100% checklist, then cleanup — with per-stage progress from your own checklist.
- **Missables flagged.** Exactly one trophy is missable: **Positive Mental Attitude**, whose first meditation at Jason's house in Chapter 1 disappears after that chapter. It is flagged in the list, in its guide pane, and on its own Missables view.
- **A tracker that remembers.** Tick trophies off and progress persists in the browser (localStorage). Export your progress to a JSON file and import it back on any machine.
- **Filters and search.** By kind (story, missable, collectibles, activities & quests, platinum), by grade, by text, and a "still to earn" view.
- **Spoiler setting.** With "Hide story spoilers" on (the default), unearned story trophies show as "Hidden story trophy" — names, descriptions and guides stay masked until you earn them.

## Layout

- `app/` — the guide itself: `index.html`, `style.css`, `app.js`, and `data/trophies.json` (official fields verbatim, plus each trophy's kind, missable flag, roadmap stage, PSN target, guide and sources).
- `screenshots/` — four renders of the running app: the checklist with progress, a guide pane with citations, the roadmap, and spoiler mode.
- `main.ts` — the entry program (Node 22): copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `vendor/makefun-frontend.ts`.
- `serve.ts` — a tiny local static server for trying the guide.
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged.

## Trophy data notes

The official list was cross-checked on launch day: the kit's list, Exophase's PSN list and the launch guides agree on all 55 names, descriptions and grades. Launch estimates (PowerPyx): difficulty 4/10, roughly 200 hours to the platinum, one playthrough, no mission replay, cheats disable trophies and saving.

## License

MIT — see `LICENSE`.

Built for the make.fun bounty [Build the best GTA 6 trophy guide](https://make.fun/bounty/gta6-trophy-guide-01?ref=4g7knchf).
