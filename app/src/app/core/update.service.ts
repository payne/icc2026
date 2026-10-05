import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'icc2026.updated';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode etc.): auto-update just won't persist.
  }
}

/**
 * Watches updated.json on the server. When its timestamp is newer than the one
 * stored in localStorage, the app is completely reloaded: this app's service
 * worker is unregistered, its caches are deleted, and the page reloads from the
 * network.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  /** Timestamp from the server's updated.json (null until fetched). */
  readonly serverUpdated = signal<string | null>(null);
  /** Timestamp of the version this browser last loaded. */
  readonly storedUpdated = signal<string | null>(readStored());
  readonly lastCheckFailed = signal(false);
  readonly reloading = signal(false);

  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    this.check();
    setInterval(() => this.check(), CHECK_INTERVAL_MS);
    window.addEventListener('online', () => this.check());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.check();
    });
  }

  async check() {
    let updated: string;
    try {
      // ngsw-bypass keeps the service worker out of it; the timestamp busts
      // the browser and GitHub Pages CDN caches.
      const res = await fetch(`updated.json?ngsw-bypass=true&t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      updated = (await res.json()).updated;
      if (!updated || isNaN(Date.parse(updated))) throw new Error('bad updated.json');
    } catch {
      this.lastCheckFailed.set(true);
      return;
    }
    this.lastCheckFailed.set(false);
    this.serverUpdated.set(updated);

    const stored = this.storedUpdated();
    if (!stored || isNaN(Date.parse(stored))) {
      // First run: what we just loaded is current.
      this.remember(updated);
    } else if (Date.parse(updated) > Date.parse(stored)) {
      // Store before reloading so a stale response can't cause a reload loop.
      this.remember(updated);
      await this.hardReload();
    }
  }

  async hardReload() {
    this.reloading.set(true);
    const scope = new URL('./', document.baseURI);
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      // Only this app's worker: other apps on the same github.io origin keep theirs.
      await Promise.all(regs.filter((r) => r.scope === scope.href).map((r) => r.unregister()));
    } catch {
      // Ignore; reload anyway.
    }
    try {
      const prefix = `ngsw:${scope.pathname}:`;
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith(prefix)).map((n) => caches.delete(n)));
    } catch {
      // Ignore; reload anyway.
    }
    location.reload();
  }

  private remember(value: string) {
    writeStored(value);
    this.storedUpdated.set(value);
  }
}
