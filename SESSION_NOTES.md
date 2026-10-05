# Iowa Code Camp 2026: Session Notes

_Session date: 2026-10-05_

This document covers the whole session: scraping the conference website into JSON, inferring topic tags, building a SQLite database, and building an offline-capable Angular PWA for GitHub Pages.

## Requests

1. Download all talk descriptions from <https://iowacodecamp.com/schedule> to a JSON file, create a `speakers.json`, and suggest other JSON datasets the site could support.
2. Add the suggested additional datasets (event details, schedule, topic tags).
3. Put everything from the session into a markdown file (the first version of this document).
4. Build an Angular PWA:
   - Responsive on phones and desktops, and works offline.
   - Menu items: Sessions, Speakers, Videos, Explore DB, About.
   - About page:
     - A button that completely reloads the app.
     - When the app was last updated, read from `updated.json` on the server.
     - The GitHub URL <https://github.com/payne/icc2026>.
     - A "Fork me on GitHub" ribbon.
   - The app automatically does a complete reload when `updated.json` has a newer timestamp than the one stored in `localStorage`.
   - Served by GitHub Pages.
   - Videos lists sessions that might have related YouTube videos.
   - Explore DB opens a new tab with a SQLite database of the JSON data, loaded into Datasette Lite.
   - A Python program that builds the SQLite database.
5. Make sure everything from the session is in a markdown file (this update).

---

## Part 1: Scraping the website

### How the site works

- iowacodecamp.com is a prerendered Angular 16 app ("Website by We Write Code").
- Each page embeds its data as JSON in a `<script id="ng-state" type="application/json">` block, so the main data needs no HTML parsing.
- Sessions and speakers come from a **Sessionize** "all data" export (`sessions`, `speakers`, `rooms`, `categories`, `questions`) embedded in `/schedule`, `/sessions` and `/speakers`. All three pages carry the same data, so the scraper only fetches `/schedule`.
- `/sponsors` embeds sponsor levels and sponsors; `/about` embeds the organizers.
- Event details (date, venue, links) appear only as rendered HTML on `/` and `/contact`, so they're parsed from the page text.
- The site's code bundle (`main.js`) only references localhost API URLs, so there's no public API to call.

### `fetch_data.py`

Run `python3 fetch_data.py` from the project root. It uses only the Python standard library and writes these files to `data/`:

| File | Records | Contents |
|---|---|---|
| `sessions.json` | 37 | id, title, full description, speakers (id and name), inferred `tags`, startsAt/endsAt, room, service/plenum flags, live/recording URLs |
| `speakers.json` | 37 | id, full/first/last name, tagline, bio, profile picture URL, top-speaker flag, links, sessions (id and title) |
| `schedule.json` | — | `published` flag, `timeSlots` (sessions grouped by start/end time and sorted by room), `unscheduled` list |
| `topics.json` | 16 | each topic with its session count and sessions, most common first |
| `event.json` | — | name, date, city, description, venue and address, map URL, hotel note, contact email, registration and mailing-list URLs |
| `sponsors.json` | 8 | name, URL, absolute logo URL, sponsor level |
| `organizers.json` | 6 | name, title, absolute photo URL |
| `sessionize_raw.json` | — | unmodified Sessionize export, for fields not carried into the cleaned files |

Cleaning applied:
- `\r\n` is converted to `\n` in descriptions and bios.
- Sessions are sorted by title; speakers by last name, then first name.
- Relative image paths are made absolute.

### Findings

**Sessions and speakers**
- 37 accepted, confirmed sessions and 37 speakers.
- Multi-speaker talks:
  - *Do you actually own your code? Navigating IP, Open Source, and AI*
  - *More Documentation is Not the Answer*
  - *Sandboxing the Machines: Practical Host Security for AI Coding Agents*
- Speakers with two talks: Mike Clancy, Grey Lovelace, Whitney Lovelace.
- Every speaker's `links` list is empty on the site. One speaker has no profile photo.
- **The schedule isn't published yet.** Every session has null `startsAt`, `endsAt` and `roomId`, and the export has no rooms, categories or questions. `schedule.json` currently shows `"published": false` with all 37 talks under `unscheduled`. Rerun the scraper after the agenda is posted.

**Event**
- **Date:** November 7, 2026
- **Venue:** FFA Enrichment Center, 1055 SW Prairie Trail Parkway, Ankeny, Iowa 50023 ([map](https://goo.gl/maps/rjdq3G6sKLZWrNbE7))
- **Hotels:** "There are many hotels that are good selections at the intersection of I-35 and SE Oralabor Rd."
- **Contact:** leaders@iowacodecamp.com
- **Registration:** <https://www.tickettailor.com/events/iowacodecamp/2402912>
- **Mailing list:** <https://madmimi.com/signups/4917cbfde53f46fdaf2efe03b33cb2d3/join>
- The site has no social media links.

**Sponsors**

| Level | Sponsors |
|---|---|
| Event Sponsor | We Write Code |
| Speaker Dinner Sponsor | VGM |
| Lunch Sponsor | Source Allies |
| Table Sponsors | Lean TECHniques, Shazam |
| Room Sponsors | Cole Consulting, Delta3 Consulting |
| Supporters | DiscountASP.NET |
| After Party, Registration Desk, Breakfast, Keynote | _(unfilled)_ |

**Organizers:** Greg Sohl (President), Nick Parker, Mike Cole, Levi Rosol, Scott Sauber, Dustin Thostenson.

### Topic tags

The site assigns no categories, so tags are inferred from keyword regexes in the `TOPICS` table at the top of `fetch_data.py`.

Rules:
- A talk gets a topic if a keyword matches its **title**, or matches **at least twice in its description**. The first version matched any single mention and over-tagged badly.
- Any talk tagged AI Agents, AI-Assisted Coding or MCP also gets "AI & LLMs".
- Tuning added "Claude" to the AI keywords and "pivot"/"assumptions" to Product & Startups so that every talk has at least one tag.

Every talk's tags were checked by hand.

| Topic | Talks |
|---|---|
| AI & LLMs | 23 |
| AI Agents | 12 |
| AI-Assisted Coding | 11 |
| Cloud & DevOps | 8 |
| Architecture & Modernization | 6 |
| Languages & Tooling | 6 |
| Teams & Process | 5 |
| Testing & Quality | 4 |
| Security | 4 |
| MCP | 3 |
| Infrastructure as Code | 3 |
| Career & Wellbeing | 3 |
| Product & Startups | 2 |
| Ethics, Law & Accessibility | 2 |
| Data | 1 |
| XR | 1 |

### Scraper decisions and caveats

- An early version gave each session a `url` deep link (`/sessions#<id>`). The site has no per-session anchors, so the field was removed.
- **Event details depend on page wording.** They're found by locating text such as "There's a map for that." and "Hotels" on the contact page. If that wording changes, `event.json` may come out wrong or the script may raise an error.
- **Tags are heuristics.** New or edited talks may need the `TOPICS` keyword table updated.

---

## Part 2: SQLite database (`build_db.py`)

Run `python3 build_db.py`. It uses only the standard library, reads `data/*.json`, and writes `data/icc2026.db` (about 250 KB). Options: `--data DIR` and `--out PATH`.

| Object | Kind | Notes |
|---|---|---|
| `event` | table | one row, venue fields flattened |
| `sessions` | table | primary key `id` |
| `speakers` | table | primary key `id` |
| `session_speakers` | table | links sessions and speakers (foreign keys to both) |
| `speaker_links` | table | empty today; ready for Sessionize links |
| `topics`, `session_topics` | tables | inferred topic tags |
| `sponsors`, `organizers` | tables | |
| `sessions_fts`, `speakers_fts` | FTS5 | content tables named so Datasette auto-detects search |
| `session_details` | view | each session with its speakers and topics joined in |
| `speaker_details` | view | each speaker with session count and titles |
| `topic_counts` | view | sessions per topic |

Foreign keys make Datasette show linked rows as clickable links.

Verified with queries:
- `session_details` returns joined speakers and topics.
- A full-text search for `kubernetes` finds the Kubernetes talk.
- `speaker_details` shows the three speakers with two talks.

---

## Part 3: The PWA (`app/`)

### Stack and structure

- **Framework:** Angular 22.2 (CLI 22.2.1) with standalone components and signals, no zone.js. The `@angular/pwa` package provides the service worker and manifest.
- **Tooling:** Node 26.7 and npm 11.19 locally; CI uses Node 24.
- **Dependencies:** no UI library. All styles are in `src/styles.css`, and icons are inline SVG.

| File | Purpose |
|---|---|
| `src/app/app.ts` | Header and navigation; starts the update watcher |
| `src/app/app.routes.ts` | Routes: `sessions`, `sessions/:id`, `speakers`, `speakers/:id`, `videos`, `about` |
| `src/app/app.config.ts` | Hash routing, component input binding, scroll restoration, service worker registration |
| `src/app/core/data.service.ts` | Loads `data/*.json` into signals; pre-loads speaker photos for offline use |
| `src/app/core/update.service.ts` | Polls `updated.json`; does the full reload |
| `src/app/core/links.ts` | GitHub URL, Datasette Lite URL, YouTube search URLs |
| `src/app/pages/*.ts` | Sessions, SessionDetail, SessionTime, Speakers, SpeakerDetail, Videos, About |
| `src/app/app.spec.ts` | Tests: app creates, five menu items, Explore DB link |
| `scripts/prepare.mjs` | Copies `../data` into `public/data/` and stamps `public/updated.json` |
| `ngsw-config.json` | Service worker caching rules |
| `public/manifest.webmanifest` | Name "Iowa Code Camp 2026" (short name "ICC 2026"), theme `#d93a5e` |

### Menu items

- **Sessions:**
  - Searches titles, descriptions and speaker names.
  - Topic filter chips with counts.
  - Cards show speakers, time and room (once published), a three-line excerpt and tags.
  - The detail page has the full description, speakers with photos, and a "Search YouTube" button (plus "Watch recording" once one exists).
- **Speakers:** searchable photo grid (two columns on phones). The detail page has the bio, links, sessions, and a YouTube search for the speaker's talks.
- **Videos:**
  - No recordings are published, so each session gets a YouTube search for the talk and one for each speaker.
  - Sessions with a `recordingUrl` or `liveUrl` get direct buttons and are sorted first.
  - There's also an "Iowa Code Camp on YouTube" search.
- **Explore DB:** a menu link that opens `https://lite.datasette.io/?url=<site>/data/icc2026.db` in a new tab. GitHub Pages sends the CORS headers Datasette Lite needs.
- **About:**
  - Event details with Register, Map and Official site buttons.
  - Last updated time: the server's `updated.json` value, falling back to the stored value when offline.
  - Online/offline status, the GitHub URL, and a link to the database.
  - The **Reload app** button, disabled while offline.
  - A pure-CSS "Fork me on GitHub" ribbon, so no image is needed offline.

### Responsive design

- **Desktop:** a sticky top bar with the brand on the left and pill-shaped menu links on the right.
- **Phones (≤ 720px):** the menu becomes a fixed bottom tab bar with icons and labels, and leaves room for the iPhone notch and home-indicator areas.
- **Colors:** light and dark themes follow the system setting, with the accent color taken from the Iowa Code Camp logo pink.

### Offline support

- **Precached on install (`prefetch`):**
  - App shell: `index.html`, JS, CSS, manifest, favicon, header logo.
  - `data/event.json`, `sessions.json`, `speakers.json`, `topics.json`.
- **Speaker photos** come from Sessionize's servers, which allow cross-site requests. A `speaker-photos` cache group covers `https://cdn.sessionize.com/**`, and on first load `DataService` requests every photo once so all of them are cached, not just the ones the user scrolled past.
- **Not cached:** `updated.json` (deliberately) and `icc2026.db` (only Datasette Lite uses it, and that requires a connection anyway).

### Update mechanism

- **Version stamp:** `scripts/prepare.mjs` writes `public/updated.json` (`{"updated": "<ISO time>"}`) on every build and every `npm start`.
- **When the app checks** (`UpdateService.check()`):
  - on startup
  - every 5 minutes
  - when the tab becomes visible
  - when the device comes back online
  - when the About page opens
- **How it fetches:** `updated.json?ngsw-bypass=true&t=<now>` with `cache: 'no-store'`. That skips the service worker, the browser cache and GitHub Pages' CDN cache.
- **First run:** the timestamp is stored without reloading.
- **Newer timestamp:** the app stores it *before* reloading, which prevents reload loops, then calls `hardReload()`:
  1. Unregisters only the service worker whose scope matches this app. Other apps on the same `payne.github.io` origin are left alone.
  2. Deletes only this app's caches. Angular names them `ngsw:<scope path>:…`; confirmed in `ngsw-worker.js`.
  3. Calls `location.reload()`.
- **Reload button:** the About page button calls the same `hardReload()`.

### Hosting decisions

- **Hash routing** (`/icc2026/#/sessions`) because GitHub Pages has no fallback for single-page apps; deep links never reach the server.
- **Base path:** `npm run build:pages` builds with `--base-href /icc2026/` for `https://payne.github.io/icc2026/`.
- **Data copying:** Angular refuses asset paths outside the app folder, so `prepare.mjs` copies the data into `public/data/` (gitignored) instead of `angular.json` pointing at `../data`.

### Commands

```sh
cd app
npm install
npm start               # dev server (service worker off in dev mode)
npm run build:pages     # production build for GitHub Pages
npm test                # Vitest unit tests
```

### Deployment

`.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch:
1. Sets up Python and runs `build_db.py`.
2. Sets up Node 24, then runs `npm ci` and `npm run build:pages` in `app/`.
3. Uploads `app/dist/icc2026/browser` and deploys with `actions/deploy-pages`.

One-time setup: in the GitHub repo, set Settings → Pages → Source to **GitHub Actions**.

The workflow doesn't scrape the live site. To refresh the data, run `fetch_data.py` locally, commit, and push.

---

## Testing

- **Unit tests:** 3 Vitest tests pass.
- **End-to-end tests:** the Chrome extension wasn't connected, so `puppeteer-core` drove the system Chromium in headless mode. The production build was served under `/icc2026/` by a local Python server, the same way GitHub Pages will serve it.

| Check | Result |
|---|---|
| Sessions page | 37 cards render |
| Topic filter | "AI & LLMs" chip shows 23 of 37 |
| Search | "kubernetes" finds the Kubernetes talk (detail page opens with speaker Jeremy Darling) |
| Speakers page | 37 cards, no broken images |
| Videos page | 37 rows with YouTube search links |
| About page | Last updated, Online status, GitHub URL, ribbon linking to the repo |
| Explore DB link | `https://lite.datasette.io/?url=…/icc2026/data/icc2026.db`, opens in a new tab |
| Service worker | Controls the page after the first load |
| Mobile (390×844) | Bottom tab bar fixed at the bottom; no horizontal scrolling on Sessions or About |
| Offline (server stopped) | Speakers and session detail pages still render |
| Offline (all network cut, including the service worker) | 36 of 36 speaker photos render from cache |
| Auto-update | Newer `updated.json` → stored timestamp updated, page fully reloaded |
| No reload loop | Re-checking the same timestamp doesn't reload |
| Reload button | Fully reloads and stays on `#/about` |
| Console errors | Only the expected connection-refused error while the server was down |

Two failures during testing were bugs in the test script, not the app:
- The first run read the page before Angular re-rendered, so I added short waits.
- `pkill -f` matched the test's own shell command line and killed the run, so the script now stops the server by its process id.

Screenshots of desktop Sessions, mobile About and mobile Speakers were checked by eye.

---

## Known limitations and follow-ups

- **Explore DB needs a connection.** Datasette Lite is a separate website, so it can't work offline. It may also fail against a local `http://` server; it's meant for the deployed site.
- **Schedule:** times and rooms will appear automatically once Sessionize publishes them and the data is re-scraped and redeployed.
- **App icons:** the PWA still uses Angular's default icons. Replace the files in `app/public/icons/` if you want your own.
- **Fragile scraper parts:** event details depend on contact-page wording, and the topic tags are keyword heuristics.

## Repository

- The repo is at `git@github.com:payne/icc2026.git`, branch `main`. You created it during the session, and its first commit ("Claude fetched the data") holds the scraper output from Parts 1 and 2.
- Everything from Part 3 is **uncommitted**: `app/`, `build_db.py`, `.github/`, `.gitignore`, `README.md` and this updated notes file.

```
.github/workflows/deploy.yml   # GitHub Pages build and deploy
.gitignore                     # ignores data/icc2026.db (CI rebuilds it)
README.md                      # project overview and commands
SESSION_NOTES.md               # this document
fetch_data.py                  # scraper → data/*.json
build_db.py                    # JSON → data/icc2026.db
data/                          # JSON datasets (+ icc2026.db, gitignored)
app/                           # Angular PWA
  ngsw-config.json
  package.json                 # start / build / build:pages / test scripts
  scripts/prepare.mjs
  public/manifest.webmanifest
  public/icons/
  src/index.html
  src/styles.css
  src/app/{app.ts,app.routes.ts,app.config.ts,app.spec.ts}
  src/app/core/{data.service.ts,update.service.ts,links.ts}
  src/app/pages/{sessions,session-detail,session-time,speakers,speaker-detail,videos,about}.ts
```

The app's `.gitignore` covers `node_modules/`, `dist/`, `.angular/`, `public/data/` and `public/updated.json`.
