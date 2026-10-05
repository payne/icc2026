import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService, Session } from '../core/data.service';
import { youtubeSearchUrl } from '../core/links';

interface VideoRow {
  session: Session;
  talkSearch: string;
  speakerSearches: { name: string; url: string }[];
}

@Component({
  selector: 'app-videos',
  imports: [RouterLink],
  template: `
    <h1>Videos</h1>
    <p class="muted">
      @if (recorded() === 0) {
        No recordings have been published yet.
      } @else {
        {{ recorded() }} sessions have recordings.
      }
      Each session links to a YouTube search for the talk and for other talks by its speakers,
      which often turns up an earlier version of the same talk.
    </p>
    <p class="actions">
      <a class="button secondary" [href]="iccSearch" target="_blank" rel="noopener">Iowa Code Camp on YouTube</a>
    </p>
    <input
      class="search"
      type="search"
      placeholder="Filter sessions"
      aria-label="Filter sessions"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />
    <ul class="cards">
      @for (row of rows(); track row.session.id) {
        <li class="card video-row">
          <a [routerLink]="['/sessions', row.session.id]"><h2>{{ row.session.title }}</h2></a>
          <div class="video-links">
            @if (row.session.recordingUrl) {
              <a class="button" [href]="row.session.recordingUrl" target="_blank" rel="noopener">▶ Recording</a>
            }
            @if (row.session.liveUrl) {
              <a class="button" [href]="row.session.liveUrl" target="_blank" rel="noopener">● Live</a>
            }
            <a class="button secondary" [href]="row.talkSearch" target="_blank" rel="noopener">This talk</a>
            @for (sp of row.speakerSearches; track sp.name) {
              <a class="button secondary" [href]="sp.url" target="_blank" rel="noopener">{{ sp.name }}</a>
            }
          </div>
        </li>
      } @empty {
        <li class="muted">No sessions match.</li>
      }
    </ul>
  `,
})
export class Videos {
  private readonly data = inject(DataService);
  protected readonly query = signal('');
  protected readonly iccSearch = youtubeSearchUrl('"Iowa Code Camp"');

  protected readonly recorded = computed(() => this.data.sessions().filter((s) => s.recordingUrl).length);

  protected readonly rows = computed<VideoRow[]>(() => {
    const q = this.query().trim().toLowerCase();
    return this.data
      .sessions()
      .filter(
        (s) =>
          !q || s.title.toLowerCase().includes(q) || s.speakers.some((sp) => sp.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => Number(!!b.recordingUrl) - Number(!!a.recordingUrl) || a.title.localeCompare(b.title))
      .map((s) => ({
        session: s,
        talkSearch: youtubeSearchUrl(`${s.title} ${s.speakers.map((sp) => sp.name).join(' ')}`),
        speakerSearches: s.speakers.map((sp) => ({ name: sp.name, url: youtubeSearchUrl(`${sp.name} talk`) })),
      }));
  });
}
