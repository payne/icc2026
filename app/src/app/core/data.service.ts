import { Injectable, computed, signal } from '@angular/core';

export interface SpeakerRef {
  id: string;
  name: string;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  speakers: SpeakerRef[];
  tags: string[];
  startsAt: string | null;
  endsAt: string | null;
  room: string | null;
  liveUrl: string | null;
  recordingUrl: string | null;
}

export interface Speaker {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  tagLine: string;
  bio: string;
  profilePicture: string | null;
  links: { title: string; url: string; linkType: string }[];
  sessions: { id: string; title: string }[];
}

export interface Topic {
  topic: string;
  sessionCount: number;
}

export interface EventInfo {
  name: string;
  date: string;
  dateDisplay: string;
  city: string;
  description: string;
  venue: { name: string; address: string; cityStateZip: string; mapUrl: string | null };
  hotels: string;
  contactEmail: string | null;
  registrationUrl: string | null;
  mailingListUrl: string | null;
  website: string;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/** Conference data from the JSON files in /data (precached by the service worker). */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly sessions = signal<Session[]>([]);
  readonly speakers = signal<Speaker[]>([]);
  readonly topics = signal<Topic[]>([]);
  readonly event = signal<EventInfo | null>(null);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  readonly sessionById = computed(() => new Map(this.sessions().map((s) => [s.id, s])));
  readonly speakerById = computed(() => new Map(this.speakers().map((s) => [s.id, s])));

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const [sessions, speakers, topics, event] = await Promise.all([
        getJson<Session[]>('data/sessions.json'),
        getJson<Speaker[]>('data/speakers.json'),
        getJson<Topic[]>('data/topics.json'),
        getJson<EventInfo>('data/event.json'),
      ]);
      this.sessions.set(sessions);
      this.speakers.set(speakers);
      this.topics.set(topics.filter((t) => t.sessionCount > 0));
      this.event.set(event);
      this.loaded.set(true);
      this.warmPhotoCache(speakers);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Speaker photos live on Sessionize's CDN. Requesting them all once while
   * online lets the service worker cache them, so the Speakers page works offline
   * even for photos the user never scrolled to.
   */
  private warmPhotoCache(speakers: Speaker[]) {
    if (!navigator.onLine || !navigator.serviceWorker?.controller) return;
    const urls = speakers.map((s) => s.profilePicture).filter((u): u is string => !!u);
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
    idle(() => urls.forEach((u) => fetch(u, { mode: 'cors' }).catch(() => {})));
  }
}
