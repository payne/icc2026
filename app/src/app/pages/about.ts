import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DataService } from '../core/data.service';
import { GITHUB_URL, datasetteLiteUrl } from '../core/links';
import { UpdateService } from '../core/update.service';

@Component({
  selector: 'app-about',
  imports: [DatePipe],
  template: `
    <a class="fork-ribbon" [href]="githubUrl" target="_blank" rel="noopener">Fork me on GitHub</a>

    <h1>About</h1>

    @if (data.event(); as ev) {
      <section class="panel">
        <h2>{{ ev.name }} 2026</h2>
        <p>
          <strong>{{ ev.dateDisplay }}</strong><br />
          {{ ev.venue.name }}<br />
          {{ ev.venue.address }}<br />
          {{ ev.venue.cityStateZip }}
        </p>
        <p class="muted">{{ ev.description }}</p>
        <p class="actions">
          @if (ev.registrationUrl) {
            <a class="button" [href]="ev.registrationUrl" target="_blank" rel="noopener">Register</a>
          }
          @if (ev.venue.mapUrl) {
            <a class="button secondary" [href]="ev.venue.mapUrl" target="_blank" rel="noopener">Map</a>
          }
          <a class="button secondary" [href]="ev.website" target="_blank" rel="noopener">Official site</a>
        </p>
      </section>
    }

    <section class="panel">
      <h2>This app</h2>
      <dl class="facts">
        <dt>Last updated</dt>
        <dd>
          @if (lastUpdated(); as ts) {
            {{ ts | date: 'medium' }}
          } @else {
            Unknown
          }
          @if (updates.lastCheckFailed()) {
            <span class="muted small">(offline: showing the version on this device)</span>
          }
        </dd>
        <dt>Connection</dt>
        <dd>{{ online() ? 'Online' : 'Offline' }}</dd>
        <dt>Source</dt>
        <dd><a [href]="githubUrl" target="_blank" rel="noopener">{{ githubUrl }}</a></dd>
        <dt>Data</dt>
        <dd>
          Sessions and speakers from iowacodecamp.com.
          <a [href]="dbUrl" target="_blank" rel="noopener">Explore the database</a> in Datasette Lite.
        </dd>
      </dl>
      <p class="actions">
        <button type="button" class="button" (click)="reload()" [disabled]="!online() || updates.reloading()">
          {{ updates.reloading() ? 'Reloading…' : 'Reload app' }}
        </button>
      </p>
      <p class="muted small">
        Reload clears this app's offline cache and fetches the latest version. The app also does this on its own
        when a newer version is published.
        @if (!online()) {
          Connect to the internet to reload.
        }
      </p>
    </section>
  `,
})
export class About {
  protected readonly data = inject(DataService);
  protected readonly updates = inject(UpdateService);
  protected readonly githubUrl = GITHUB_URL;
  protected readonly dbUrl = datasetteLiteUrl();
  protected readonly online = signal(navigator.onLine);

  protected readonly lastUpdated = computed(() => this.updates.serverUpdated() ?? this.updates.storedUpdated());

  constructor() {
    const sync = () => this.online.set(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    });
    this.updates.check();
  }

  protected reload() {
    this.updates.hardReload();
  }
}
