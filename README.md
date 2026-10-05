# Iowa Code Camp 2026

An offline-capable PWA for [Iowa Code Camp 2026](https://iowacodecamp.com) sessions and speakers,
served from GitHub Pages at <https://payne.github.io/icc2026/>.

## Layout

| Path | What it is |
|---|---|
| `fetch_data.py` | Scrapes iowacodecamp.com into `data/*.json` |
| `build_db.py` | Builds `data/icc2026.db` (SQLite) from the JSON, for Datasette Lite |
| `data/` | The scraped JSON datasets |
| `app/` | Angular PWA |
| `.github/workflows/deploy.yml` | Builds the DB and app, deploys to GitHub Pages on push to `main` |
| `SESSION_NOTES.md` | Notes on the data scrape |

## Updating the data

```sh
python3 fetch_data.py   # refresh data/*.json from the live site
python3 build_db.py     # rebuild data/icc2026.db
```

Commit the JSON changes and push; the deploy workflow rebuilds the database and app.

## App

```sh
cd app
npm install
npm start               # dev server at http://localhost:4200 (service worker disabled)
npm run build:pages     # production build for GitHub Pages (base href /icc2026/)
npm test
```

`npm start` and the builds run `scripts/prepare.mjs` first. It copies the data into `public/data/`
and stamps `public/updated.json` with the build time.

### Menu

- **Sessions / Speakers**: searchable lists and detail pages. Sessions can be filtered by topic.
- **Videos**: every session, with YouTube searches for the talk and for its speakers. Real recordings
  are listed first once `recordingUrl` is filled in.
- **Explore DB**: opens `data/icc2026.db` in [Datasette Lite](https://lite.datasette.io/) in a new tab.
  Needs a connection.
- **About**: event details, when the app was last updated, a reload button, and a link to this repo.

### Offline and updates

- **Offline:** the Angular service worker precaches the app shell and the session/speaker/event/topic
  JSON. Speaker photos from Sessionize's CDN are cached as the app fetches them on first load.
- **Updates:** the app polls `updated.json` on start, every 5 minutes, when the tab becomes visible, and
  when the device comes back online. The request bypasses the service worker and caches. If the
  timestamp is newer than the one in `localStorage`, the app stores it and does a full reload:
  1. unregisters this app's service worker
  2. deletes its caches
  3. reloads from the network

  The About page's **Reload app** button does the same thing manually.
- **Routing** uses hash URLs (`#/sessions`), so deep links work on GitHub Pages without a 404 fallback.

### Deploying

In the GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**. Every push to `main` deploys.
