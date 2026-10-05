#!/usr/bin/env python3
"""Build a SQLite database from the JSON files written by fetch_data.py.

The result is meant for Datasette / Datasette Lite: tables have primary and
foreign keys (so Datasette links rows together), sessions and speakers get
full-text search tables, and a few views join things up for browsing.

Usage: python3 build_db.py [--data DIR] [--out PATH]
"""
import argparse
import json
import os
import sqlite3

SCHEMA = """
CREATE TABLE event (
    name TEXT PRIMARY KEY,
    date TEXT,
    date_display TEXT,
    city TEXT,
    description TEXT,
    venue_name TEXT,
    venue_address TEXT,
    venue_city_state_zip TEXT,
    map_url TEXT,
    hotels TEXT,
    contact_email TEXT,
    registration_url TEXT,
    mailing_list_url TEXT,
    website TEXT
);
CREATE TABLE speakers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    tagline TEXT,
    bio TEXT,
    profile_picture TEXT,
    is_top_speaker INTEGER
);
CREATE TABLE speaker_links (
    speaker_id TEXT NOT NULL REFERENCES speakers(id),
    title TEXT,
    url TEXT,
    link_type TEXT
);
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TEXT,
    ends_at TEXT,
    room TEXT,
    is_service_session INTEGER,
    is_plenum_session INTEGER,
    live_url TEXT,
    recording_url TEXT
);
CREATE TABLE session_speakers (
    session_id TEXT NOT NULL REFERENCES sessions(id),
    speaker_id TEXT NOT NULL REFERENCES speakers(id),
    PRIMARY KEY (session_id, speaker_id)
);
CREATE TABLE topics (
    name TEXT PRIMARY KEY
);
CREATE TABLE session_topics (
    session_id TEXT NOT NULL REFERENCES sessions(id),
    topic TEXT NOT NULL REFERENCES topics(name),
    PRIMARY KEY (session_id, topic)
);
CREATE TABLE sponsors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT,
    url TEXT,
    logo_url TEXT
);
CREATE TABLE organizers (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    title TEXT,
    profile_picture TEXT
);

-- Full-text search, using the content-table naming Datasette auto-detects.
CREATE VIRTUAL TABLE sessions_fts USING fts5(title, description, content="sessions");
CREATE VIRTUAL TABLE speakers_fts USING fts5(full_name, tagline, bio, content="speakers");

CREATE VIEW session_details AS
SELECT
    s.id,
    s.title,
    (SELECT group_concat(sp.full_name, ', ')
       FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
      WHERE ss.session_id = s.id) AS speakers,
    (SELECT group_concat(st.topic, ', ')
       FROM session_topics st WHERE st.session_id = s.id) AS topics,
    s.starts_at,
    s.ends_at,
    s.room,
    s.description
FROM sessions s
ORDER BY s.starts_at, s.title;

CREATE VIEW speaker_details AS
SELECT
    sp.id,
    sp.full_name,
    sp.tagline,
    count(ss.session_id) AS session_count,
    group_concat(s.title, ' | ') AS sessions
FROM speakers sp
LEFT JOIN session_speakers ss ON ss.speaker_id = sp.id
LEFT JOIN sessions s ON s.id = ss.session_id
GROUP BY sp.id
ORDER BY sp.last_name, sp.first_name;

CREATE VIEW topic_counts AS
SELECT topic, count(*) AS session_count
FROM session_topics
GROUP BY topic
ORDER BY session_count DESC, topic;
"""


def load(data_dir, name):
    with open(os.path.join(data_dir, name), encoding="utf-8") as f:
        return json.load(f)


def build(data_dir, out):
    event = load(data_dir, "event.json")
    sessions = load(data_dir, "sessions.json")
    speakers = load(data_dir, "speakers.json")
    topics = load(data_dir, "topics.json")
    sponsors = load(data_dir, "sponsors.json")
    organizers = load(data_dir, "organizers.json")

    if os.path.exists(out):
        os.remove(out)
    db = sqlite3.connect(out)
    db.executescript(SCHEMA)

    venue = event.get("venue", {})
    db.execute(
        "INSERT INTO event VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (event["name"], event["date"], event["dateDisplay"], event["city"],
         event["description"], venue.get("name"), venue.get("address"),
         venue.get("cityStateZip"), venue.get("mapUrl"), event.get("hotels"),
         event.get("contactEmail"), event.get("registrationUrl"),
         event.get("mailingListUrl"), event.get("website")),
    )

    db.executemany(
        "INSERT INTO speakers VALUES (?,?,?,?,?,?,?,?)",
        [(sp["id"], sp["fullName"], sp["firstName"], sp["lastName"], sp["tagLine"],
          sp["bio"], sp["profilePicture"], int(sp["isTopSpeaker"])) for sp in speakers],
    )
    db.executemany(
        "INSERT INTO speaker_links VALUES (?,?,?,?)",
        [(sp["id"], link.get("title"), link.get("url"), link.get("linkType"))
         for sp in speakers for link in sp["links"]],
    )

    db.executemany(
        "INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?)",
        [(s["id"], s["title"], s["description"], s["startsAt"], s["endsAt"], s["room"],
          int(s["isServiceSession"]), int(s["isPlenumSession"]), s["liveUrl"],
          s["recordingUrl"]) for s in sessions],
    )
    db.executemany(
        "INSERT INTO session_speakers VALUES (?,?)",
        [(s["id"], sp["id"]) for s in sessions for sp in s["speakers"]],
    )

    db.executemany("INSERT INTO topics VALUES (?)", [(t["topic"],) for t in topics])
    db.executemany(
        "INSERT INTO session_topics VALUES (?,?)",
        [(s["id"], tag) for s in sessions for tag in s.get("tags", [])],
    )

    db.executemany(
        "INSERT INTO sponsors (name, level, url, logo_url) VALUES (?,?,?,?)",
        [(sp["name"], sp["level"], sp["url"], sp["logoURL"]) for sp in sponsors],
    )
    db.executemany(
        "INSERT INTO organizers (first_name, last_name, title, profile_picture) VALUES (?,?,?,?)",
        [(o["firstName"], o["lastName"], o["title"] or None, o["profilePicture"]) for o in organizers],
    )

    db.execute("INSERT INTO sessions_fts(sessions_fts) VALUES ('rebuild')")
    db.execute("INSERT INTO speakers_fts(speakers_fts) VALUES ('rebuild')")
    db.commit()
    db.execute("VACUUM")
    db.close()

    print(f"wrote {out}: {len(sessions)} sessions, {len(speakers)} speakers, "
          f"{len(topics)} topics, {len(sponsors)} sponsors, {len(organizers)} organizers")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data", default=os.path.join(here, "data"), help="directory of JSON files")
    parser.add_argument("--out", default=os.path.join(here, "data", "icc2026.db"), help="SQLite file to write")
    args = parser.parse_args()
    build(args.data, args.out)


if __name__ == "__main__":
    main()
