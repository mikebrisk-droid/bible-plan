# Bible Reading Plan Generator Clone

Static mirror of https://biblereadingplangenerator.com/ downloaded on 2026-05-05.

## Run locally

Static-only mode:

```sh
python3 -m http.server 8000
```

Reading modal with YouVersion API proxy:

```sh
VITE_YOUVERSION_APP_KEY="your-key" node server.mjs
```

Then open:

```text
http://localhost:8000/
```

## Notes

- The app is client-side HTML/CSS/JavaScript.
- Script and stylesheet references were normalized to local files.
- Sample plan links were changed from the original domain to local relative URLs.
- The plan engine is by John Dyer; his license and author notes remain in the source files.
- For Vercel, add `VITE_YOUVERSION_APP_KEY` as an environment variable. `YVP_APP_KEY` is also supported as an alias. The deployed app uses `api/youversion/passage.js` so the key is not exposed to the browser.
