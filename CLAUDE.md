# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no build step, package.json, linter or test suite. The site is plain HTML/CSS/JS served as static files.

```sh
node server.mjs                          # static server on http://localhost:8000/ (PORT overrides)
YVP_APP_KEY="your-key" node server.mjs   # same, plus the in-app passage reader
python3 -m http.server 8000              # static only; the passage reader shows an error
vercel --prod --scope briskstudios       # deploy (live: https://bible-plan-eta.vercel.app)
```

On this machine `/usr/bin/git` is blocked until the Xcode license is accepted; prefix git with `DEVELOPER_DIR=/Library/Developer/CommandLineTools` to use the Command Line Tools git instead.

## Architecture

The app has two layers: a legacy **plan engine** (John Dyer's Bible reading plan generator, jQuery, global functions) and a newer **app shell** (`shell.js`, an IIFE) wrapped around it. The shell never builds a plan itself; it drives the engine through a hidden form.

### Engine (global scripts, load order in `index.html` matters)

`helpers.js` → `bible.data*.js` / `bible.reference.js` / `bible.plans.js` / `bible.pericopes.js` → `plans.js` → `renderers.js` → `layouts.js` → `app.js`

- **Hidden form `#engine`** in `index.html` holds every plan setting (start date, length, order, books, days of week, logic, layout format, display options). `app.js` binds `change` on its inputs to `updateDisplay()`.
- **`updateDisplay()`** (`app.js`) → `updateUrlAndTitle()` builds `window.currentQuery` and `currentKey`, then `generate()` calls `getPlanData(...)` (`plans.js`) and renders with `window['build' + format]`, writing HTML into `#output`.
- **Layouts are `build<format>` functions** looked up by name from the `formatstyle` radio value: `buildlist`, `buildweeks`, `buildcalendar`, `buildbooks`, `buildcircle` (Wheel), `buildcirclecal` (Year wheel), `buildics`, `buildcsv` in `renderers.js`; `buildmatrix`, `buildsections`, `buildprogress`, `buildboard`, `buildweekrows`, `buildhabit` in `layouts.js`. A new layout needs both the function and a `formatstyle` radio in `#engine`.
- **Plan `order`** values: `traditional`, `alternate`, `tanakh`, `chronological`, `mcheyne`, `list`. `chronological`, `mcheyne` and the named `list` plans (e.g. `david`, `paul`, `easter`) read fixed chapter sequences from `bible.plans` in `bible.plans.js`. A named list found in `bible.plans.days` instead (`christmas`) is a **day list**, with a title and exact passages for each day (`["The Word Made Flesh", "JHN 1:1-18"]`). `getPlanData` hands it to `getDayListData`, which skips the `logic` split and adds `dayInfo.title`, `.passages` and `.refs`. `formatPassages` keeps gaps such as "Genesis 2:7–9, 15–17", which `formatPericopeRange` would merge into one span. A day-list segment with a book and no `chapter:` is whole chapters (`"GEN 1-2; PSA 56, 57, 142"`, used by `fiveday`, the Five Day Bible Reading Program: 260 untitled readings, Monday to Friday for 52 weeks; and `psalmsezekiel`, 365 daily readings, which mixes in verse segments for Psalm 119 on Dec 26–30; `psalmaday`, Crossway's Psalm 1–150, one a day; and `redemptive`, Greg Lanier's Redemptive-Historical plan, 161 titled readings in 16 sections, self-paced, one a day). All four are `locked`. An `art` named with an extension (`'name.svg'`) is used as the file name by `coverUrl` instead of adding `.webp`; these four covers are all `.webp`, from images trimmed of edge lines and upscaled 2x with Upscayl. **`logic`** (`words`, `chapters`, `pericopes`) decides how readings are split across days; pericope data is in `bible.pericopes.js`.
- Book IDs are USFM codes (`GEN`, `MAT`, `1CO`); chapters are `BOOK_N` strings.

### Shell (`shell.js`)

- Owns the four views (`home`, `plans`, `create`, `plan`), routed by `location.hash`, plus sheets, menus and GSAP motion.
- **Ready-made plans** are the `PLANS` array near the top of `shell.js` (id, title, blurb, `art` cover name from `assets/plans-paper/`, `params`). `locked: true` publishes a plan as-is: no Customize on its sheet, no Edit in the My plan menu or the Create tab (`isLockedQuery`, judged from the query so a shared link stays locked).
- Talks to the engine only through these globals:
  - `window.loadFromParams(URLSearchParams)` (`app.js`) fills `#engine` and triggers a render.
  - `window.onPlanQuery(query)` is called by the engine after each render; the shell saves the query and rewrites the address bar.
  - `window.onPlanRendered()` runs after `#output` is updated.
  - `window.lastPlanDays` / `window.currentKey` expose the rendered days and the progress-key prefix.
- For plans other than the active one (Home cards, stats), `ctxFor()` calls `getPlanData` directly with the same arguments rather than rendering.

### State and URLs

- A plan is fully described by its query string (`start`, `total`, `order`, `books`, `logic`, `daysofweek`, ... plus display options), so links are shareable. On boot, a URL carrying plan params is matched against saved plans by `keyOf()` (`KEY_FIELDS`) or added as a new one.
- `localStorage` keys: `rtb-plans` (`{ list, current }` of followed plans), `rtb-settings`, `lamp-theme`, `rtb-activity` (streaks & badges), and per-day progress at `currentKey + '-' + dayIndex`. Because progress is keyed on plan settings, changing a key field (start, total, order, logic, days, books, daily psalm/proverb) starts a fresh progress history.

### Streaks & badges

Three layers, loaded between `gsap.min.js` and `shell.js`:

- **`streaks.js`** (no DOM, also `require()`-able in Node): the activity log in `localStorage['rtb-activity']`, streak math and badge rules. A reading's progress key maps to the local date it was first checked (`marks`); unchecking deletes it, so Undo takes back streak credit. Best streaks are recomputed from history, never stored. `sync(plans)` takes a snapshot of the followed plans (`{ id, planId, name, done, total, weekdays }`), records plans started/finished, and returns newly earned badge ids (`readings:10`, `plan:year`, `advent:2026`). Earned badges are never revoked.
- **`stickers.js`**: draws each badge as a holographic die-cut sticker. Shapes are `assets/badges/*.svg`, used as CSS masks (`.sticker[data-shape]` in `style.css`); the type is an SVG in the shape's own viewBox, with one layout per shape (`LAYOUT`) and the words per badge in `design()` / `PLAN_STICKERS`. Display fonts (Anton, Archivo Black, Unbounded, Yellowtail) load lazily on first use.
- **`shell.js`** "Streaks & badges" section: feeds `sync()` via `streakPlans()` and `syncStreaks()` after every check-off, share-link copy and plan start. It also draws the Home streak chip, the streak sheet, the first-time intro (`rtb-streaks-intro`), the `#badges` view (a route with no tab) and the badge sheet. Ding shows one toast at a time, so badge toasts are delayed until the action's own toast has been seen.

**`transfer.js`** ("Move to another device", in the ☰ menu and the Save sheet; no DOM, Node-testable) packs `rtb-plans`, every checked progress key and `rtb-activity` into one payload. It travels as a link (`#import=z…`, deflate-raw plus base64url, so the data never reaches the server) or as a `.json` backup. Importing always merges and never deletes: a plan already present (same `keyOf`) stays one plan, checkmarks are combined, and `streaks.mergeActivity` keeps the earliest date for everything. `shell.js` removes `#import=` from the address bar at boot (or on hashchange), asks before merging, then reloads so the app starts again from what's stored. Device preferences (theme, text size, sounds) stay on each device.

**Home plan cards** (`todayCard`) fade the plan's cover in behind them. `planCoverUrl` returns a ready-made plan's own cover, the Single book cover for a one-book custom plan, or nothing, in which case the card keeps an abstract `hero-*.webp` art (`data-art`). The cover is passed in as `--cover`, and `.today-card.has-cover` handles the fade and tone.

**Home rows below the plan cards** (all in `shell.js`):
- **Recommended for you:** rules in **`recommend.js`** (no DOM, Node-testable). It takes the catalog, followed and finished plans, and `planStart`, and returns up to five plans, each with a reason. Signals, roughly in this order: calendar plans in their run-up, the `NEXT` map after a finished or mostly-read plan, year-long plans around New Year, balancing a one-testament diet, then first plans for a new reader.
- **Challenges & milestones** (`goalItems`): active or soon challenges, at most two levels earned in the last three days, then the milestones closest to their next level. Reading counts more than visits, starts or shares.

The **Single book** card leads the Plans grid; it isn't in `PLANS`. Its sheet (`renderBookSheet`) works in two steps: pick any of the 66 books, then a pace from `bookPaces`. The paces are a chapter a day, section by section (`logic=pericopes`, counted from `bible.pericopes`), or a fixed 14, 30 or 90 days for longer books. Starting it makes a custom plan named after the book. Its cover is `assets/plans-paper/fish.jpg`, from the same cover set as the others, with 12px trimmed from each edge to remove white edge lines.

Calendar plans set `startOn` in `PLANS` (`'12-01'`, or `'easter'` to end on Easter Sunday), and `planStart` gives the date for Start, Customize and the plan sheet.

A reading streak counts days with at least one reading marked; weekdays that none of the followed plans read on are days off and don't break it. Readings checked before this existed are counted for totals but carry no date.

### Passage reader

`app.js` (`initReadingModal`) fetches `/api/youversion/passage?ref=...&version=...`. Two copies of the proxy exist and must be kept in sync: `api/youversion/passage.js` (Vercel function) and the handler in `server.mjs` (local). Both read `YVP_APP_KEY` or `VITE_YOUVERSION_APP_KEY`.

### Vendored files

`jquery.min.js`, `gsap.min.js` and `ding.js` (spring toasts, used via `toasts.js` as the ES module that sets `window.ding`) are vendored; don't edit them. The engine source keeps John Dyer's license and author notes, which must stay.

## Conventions

- Commit subjects are written as `Area: what changed`, e.g. `Stats: show the next 7 readings and soften "behind"`.
- Engine and shell are classic scripts written with `var` and named functions sharing globals; there is no module system except `toasts.js`, `ding.js` and `server.mjs`.
