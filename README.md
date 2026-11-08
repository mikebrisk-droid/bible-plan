# Read the Bible

Pick a ready-made reading plan, or build your own, and read the Bible one day at a time.

Live: https://bible-plan-eta.vercel.app

## Screens

- **Home**: today's reading from your plan, progress, and quick ways to start.
- **Plans**: ready-made plans (Bible in a Year, Chronological, M'Cheyne, New Testament, Gospels and more).
- **Create**: every generator option in five steps: Time, Format, Bible books, Days of the week, Options.
- **My plan**: progress, layouts (List, Weeks, Calendar, Books, Wheel, Year wheel), display options, and Save (print, iCal, CSV, link).

## Run locally

Static only:

```sh
python3 -m http.server 8000
```

With the in-app passage reader (YouVersion API proxy):

```sh
YVP_APP_KEY="your-key" node server.mjs
```

Then open http://localhost:8000/.

## How it fits together

- `index.html`, `style.css`, `shell.js`: the app shell, screens, sheets and GSAP motion. Plain HTML, CSS and JavaScript, no framework.
- `app.js`, `plans.js`, `renderers.js`, `bible.*.js`: the plan engine. It reads its settings from a hidden form in `index.html`; `shell.js` fills that form through `loadFromParams()`.
- `api/youversion/passage.js`: Vercel function that proxies passage text so the API key stays on the server. Set `YVP_APP_KEY` (or `VITE_YOUVERSION_APP_KEY`) in the Vercel project.
- `assets/logo.svg`: the Read the Bible mark, used as a CSS mask so it takes the theme's text color.

A plan's settings live in the URL, so any plan can be shared as a link. Reading progress is stored in the browser.

## Deploy

```sh
vercel --prod --scope briskstudios
```

The plan engine is by John Dyer (MIT/GPLv2); his license and author notes remain in the source files.
