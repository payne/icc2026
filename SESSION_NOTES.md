# Iowa Code Camp Data Scrape — Session Notes

_Session date: 2026-10-05_

## Requests

1. Download all talk descriptions from <https://iowacodecamp.com/schedule> to a JSON file, create a `speakers.json`, and suggest other JSON datasets the site could support.
2. Add the suggested additional datasets.
3. Put everything from the session into a markdown file (this document).

## How the site works

- iowacodecamp.com is a prerendered Angular 16 app ("Website by We Write Code").
- Each page embeds its data as JSON in a `<script id="ng-state" type="application/json">` block, so no HTML parsing is needed for the main data.
- Sessions and speakers come from a **Sessionize** "all data" export (`sessions`, `speakers`, `rooms`, `categories`, `questions`) embedded in `/schedule`, `/sessions` and `/speakers`.
- `/sponsors` embeds sponsor levels and sponsors; `/about` embeds the organizers.
- Event details (date, venue, links) appear only as rendered HTML on `/` and `/contact`, so they're parsed from the page text.
- The app bundle (`main.js`) only references localhost API URLs, so there's no public API to call.

## What was produced

Run `python3 fetch_data.py` from the project root to regenerate everything into `data/`. The script uses only the Python standard library.

| File | Records | Contents |
|---|---|---|
| `data/sessions.json` | 37 | id, title, full description, speakers (id and name), inferred `tags`, startsAt/endsAt, room, service/plenum flags, live/recording URLs |
| `data/speakers.json` | 37 | id, full/first/last name, tagline, bio, profile picture URL, top-speaker flag, links, sessions (id and title) |
| `data/schedule.json` | — | `published` flag, `timeSlots` (sessions grouped by start/end time and sorted by room), `unscheduled` list |
| `data/topics.json` | 16 | each topic with its session count and sessions, most common first |
| `data/event.json` | — | name, date, city, description, venue and address, map URL, hotel note, contact email, registration and mailing-list URLs |
| `data/sponsors.json` | 8 | name, URL, absolute logo URL, sponsor level |
| `data/organizers.json` | 6 | name, title, absolute photo URL |
| `data/sessionize_raw.json` | — | unmodified Sessionize export, for fields not carried into the cleaned files |

Cleaning applied:
- `\r\n` is converted to `\n` in descriptions and bios.
- Sessions are sorted by title; speakers by last name, then first name.
- Relative image paths are made absolute.

## Findings

### Sessions and speakers
- 37 accepted, confirmed sessions and 37 speakers.
- Multi-speaker talks:
  - *Do you actually own your code? Navigating IP, Open Source, and AI*
  - *More Documentation is Not the Answer*
  - *Sandboxing the Machines: Practical Host Security for AI Coding Agents*
- Speakers with two talks: Mike Clancy, Grey Lovelace, Whitney Lovelace.
- Every speaker's `links` list is empty on the site.
- **The schedule isn't published yet.** Every session has null `startsAt`, `endsAt` and `roomId`, and the export has no rooms, categories or questions. `schedule.json` currently shows `"published": false` with all 37 talks under `unscheduled`. Rerun the script after the agenda is posted.

### Event
- **Date:** November 7, 2026
- **Venue:** FFA Enrichment Center, 1055 SW Prairie Trail Parkway, Ankeny, Iowa 50023 ([map](https://goo.gl/maps/rjdq3G6sKLZWrNbE7))
- **Hotels:** "There are many hotels that are good selections at the intersection of I-35 and SE Oralabor Rd."
- **Contact:** leaders@iowacodecamp.com
- **Registration:** <https://www.tickettailor.com/events/iowacodecamp/2402912>
- **Mailing list:** <https://madmimi.com/signups/4917cbfde53f46fdaf2efe03b33cb2d3/join>
- The site has no social media links.

### Sponsors
| Level | Sponsors |
|---|---|
| Event Sponsor | We Write Code |
| Speaker Dinner Sponsor | VGM |
| Lunch Sponsor | Source Allies |
| Table Sponsors | Lean TECHniques, Shazam |
| Room Sponsors | Cole Consulting, Delta3 Consulting |
| Supporters | DiscountASP.NET |
| After Party, Registration Desk, Breakfast, Keynote | _(unfilled)_ |

### Organizers
Greg Sohl (President), Nick Parker, Mike Cole, Levi Rosol, Scott Sauber, Dustin Thostenson.

## Topic tags

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

## Decisions and caveats

- An early version gave each session a `url` deep link (`/sessions#<id>`). The site has no per-session anchors, so the field was removed.
- **Event details depend on page wording.** They're found by locating text such as "There's a map for that." and "Hotels" on the contact page. If that wording changes, `event.json` may come out wrong or the script may raise an error.
- **Tags are heuristics.** New or edited talks may need the `TOPICS` keyword table updated.
- The script fetches `/schedule`, `/sponsors`, `/about`, `/` and `/contact`. The `/sessions` and `/speakers` pages embed the same Sessionize data as `/schedule`, so the script doesn't fetch them.

## Project files

```
fetch_data.py          # scraper; writes everything under data/
SESSION_NOTES.md       # this document
data/
  event.json
  organizers.json
  schedule.json
  sessionize_raw.json
  sessions.json
  speakers.json
  sponsors.json
  topics.json
```
