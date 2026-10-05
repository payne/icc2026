#!/usr/bin/env python3
"""Scrape iowacodecamp.com into JSON datasets.

The site is a prerendered Angular app; each page embeds its data (a Sessionize
export for sessions/speakers) in a <script id="ng-state"> JSON block. Event
details (date, venue, links) only exist as rendered HTML, so they're parsed
from page text.
"""
import html as htmllib
import json
import os
import re
import urllib.request
from collections import defaultdict
from datetime import datetime

BASE = "https://iowacodecamp.com"
OUT = "data"

# Topic tags inferred from session title + description. The site publishes no
# categories, so these are keyword heuristics -- review when the talk list changes.
TOPICS = {
    "AI & LLMs": r"\bAI\b|\bLLMs?\b|\bGPT\b|\bClaude\b|language models?|machine learning",
    "AI Agents": r"\bagent(s|ic)?\b|sub-agents?",
    "AI-Assisted Coding": r"claude code|codex|copilot|coding (assistant|agent|tool)s?|agentic coding|AI coding|AI-generated code|AI-assisted",
    "MCP": r"\bMCP\b|model context protocol",
    "Testing & Quality": r"\btest(s|ing)?\b|code quality|mutation|quality",
    "Security": r"\bsecur(e|ity|ing)\b|sandbox|authoriz|authenticat|vulnerab",
    "Cloud & DevOps": r"\bAWS\b|\bAzure\b|kubernetes|\bcloud\b|devops|\bGHA\b|github actions|containers?\b|\bCI\b",
    "Infrastructure as Code": r"terraform|cloudformation|infrastructure as code|\bnixos\b",
    "Architecture & Modernization": r"architect|moderniz|monolith|scal(e|able|ing)|distributed|legacy",
    "Languages & Tooling": r"\bC#|\.NET\b|\bpython\b|\bjava\b|linters?|dev containers?|\bnix\b|functional programming",
    "Data": r"\bdata (platform|pipeline)s?\b|\bdatabases?\b|\bpostgres|\bSQL\b|embedding",
    "Teams & Process": r"\bteams?\b|documentation|chartering|collaborat|stakeholder|leaders",
    "Career & Wellbeing": r"career|family|sanity|ritual|routine|burnout|\bwell-?being\b|our relationship",
    "Product & Startups": r"physical product|startup|customers?|\bMVP\b|product-market|founder|pivot|assumptions",
    "Ethics, Law & Accessibility": r"\bbias\b|disabilit|accessib|\blicens|intellectual property|\bIP\b|open source",
    "XR": r"\bXR\b|\bVR\b|\bAR\b|meta quest|mixed reality|colocation",
}
TOPIC_RES = {name: re.compile(rx, re.I) for name, rx in TOPICS.items()}
AI_SUBTOPICS = {"AI Agents", "AI-Assisted Coding", "MCP"}


def fetch(path):
    req = urllib.request.Request(f"{BASE}/{path}", headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req).read().decode("utf-8")


def page_state(path):
    m = re.search(r'<script id="ng-state" type="application/json">(.*?)</script>', fetch(path), re.S)
    return json.loads(m.group(1))


def page_lines(page_html):
    text = re.sub(r"<(script|style|svg)[^>]*>.*?</\1>", "", page_html, flags=re.S)
    text = htmllib.unescape(re.sub(r"<[^>]+>", "\n", text))
    return [line.strip() for line in text.splitlines() if line.strip()]


def clean(text):
    return text.replace("\r\n", "\n").strip() if text else text


def tag_session(s):
    # A passing mention in a long description is noise: require the topic in the
    # title, or at least two mentions in the description.
    tags = {
        name for name, rx in TOPIC_RES.items()
        if rx.search(s["title"]) or len(rx.findall(s["description"] or "")) >= 2
    }
    if tags & AI_SUBTOPICS:
        tags.add("AI & LLMs")
    return [name for name in TOPICS if name in tags]


def write(name, data):
    with open(f"{OUT}/{name}", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {OUT}/{name} ({len(data)} records)")


def build_event():
    home = fetch("")
    contact = fetch("contact")
    home_lines = page_lines(home)
    contact_lines = page_lines(contact)

    date_line = next(l for l in home_lines if re.match(r"[A-Z][a-z]+ \d{1,2}, \d{4}$", l))
    venue_i = contact_lines.index("There's a map for that.") + 1
    hotels_i = contact_lines.index("Hotels") + 1

    def link(pattern, page_html):
        m = re.search(rf'href="({pattern}[^"]*)"', page_html)
        return m.group(1) if m else None

    return {
        "name": "Iowa Code Camp",
        "date": datetime.strptime(date_line, "%B %d, %Y").date().isoformat(),
        "dateDisplay": date_line,
        "city": home_lines[home_lines.index(date_line) + 1],
        "description": next(l for l in home_lines if l.startswith("For software developers")),
        "venue": {
            "name": contact_lines[venue_i],
            "address": contact_lines[venue_i + 1],
            "cityStateZip": contact_lines[venue_i + 2],
            "mapUrl": link(r"https://(goo\.gl/maps|maps\.app|www\.google\.com/maps)", contact),
        },
        "hotels": contact_lines[hotels_i],
        "contactEmail": (link("mailto:", contact) or "").removeprefix("mailto:") or None,
        "registrationUrl": link(r"https://www\.tickettailor\.com", home),
        "mailingListUrl": link(r"https://madmimi\.com", contact),
        "website": BASE,
        "websiteBy": {"name": "We Write Code", "url": "https://wewritecode.com/"},
    }


def build_schedule(sessions):
    slots = defaultdict(list)
    unscheduled = []
    for s in sessions:
        entry = {"id": s["id"], "title": s["title"], "room": s["room"],
                 "speakers": [sp["name"] for sp in s["speakers"]]}
        if s["startsAt"]:
            slots[(s["startsAt"], s["endsAt"])].append(entry)
        else:
            unscheduled.append(entry)
    return {
        "published": bool(slots),
        "timeSlots": [
            {"startsAt": start, "endsAt": end,
             "sessions": sorted(items, key=lambda e: e["room"] or "")}
            for (start, end), items in sorted(slots.items())
        ],
        "unscheduled": unscheduled,
    }


def main():
    os.makedirs(OUT, exist_ok=True)

    sched = page_state("schedule")["schedule"]
    speakers_by_id = {s["id"]: s for s in sched["speakers"]}
    rooms_by_id = {r["id"]: r["name"] for r in sched.get("rooms", [])}

    sessions = [
        {
            "id": s["id"],
            "title": s["title"],
            "description": clean(s["description"]),
            "speakers": [
                {"id": sid, "name": speakers_by_id[sid]["fullName"]}
                for sid in s["speakers"] if sid in speakers_by_id
            ],
            "tags": tag_session(s),
            "startsAt": s["startsAt"],
            "endsAt": s["endsAt"],
            "room": rooms_by_id.get(s["roomId"]),
            "isServiceSession": s["isServiceSession"],
            "isPlenumSession": s["isPlenumSession"],
            "liveUrl": s["liveUrl"],
            "recordingUrl": s["recordingUrl"],
        }
        for s in sorted(sched["sessions"], key=lambda s: s["title"].lower())
    ]
    titles_by_id = {s["id"]: s["title"] for s in sessions}

    speakers = [
        {
            "id": sp["id"],
            "fullName": sp["fullName"],
            "firstName": sp["firstName"],
            "lastName": sp["lastName"],
            "tagLine": sp["tagLine"],
            "bio": clean(sp["bio"]),
            "profilePicture": sp["profilePicture"],
            "isTopSpeaker": sp["isTopSpeaker"],
            "links": sp["links"],
            "sessions": [
                {"id": str(sid), "title": titles_by_id.get(str(sid))} for sid in sp["sessions"]
            ],
        }
        for sp in sorted(sched["speakers"], key=lambda s: (s["lastName"].lower(), s["firstName"].lower()))
    ]

    topics = [
        {
            "topic": name,
            "sessionCount": len(matched := [s for s in sessions if name in s["tags"]]),
            "sessions": [{"id": s["id"], "title": s["title"]} for s in matched],
        }
        for name in TOPICS
    ]
    topics.sort(key=lambda t: -t["sessionCount"])

    sponsors = [
        {**sp, "level": level["name"], "logoURL": BASE + sp["logoURL"]}
        for level in page_state("sponsors")["sponsors"]
        for sp in level["sponsors"]
    ]

    organizers = [
        {**o, "profilePicture": BASE + o["profilePicture"]}
        for o in page_state("about")["about"]
    ]

    write("event.json", build_event())
    write("sessions.json", sessions)
    write("speakers.json", speakers)
    write("schedule.json", build_schedule(sessions))
    write("topics.json", topics)
    write("sponsors.json", sponsors)
    write("organizers.json", organizers)
    write("sessionize_raw.json", sched)


if __name__ == "__main__":
    main()
