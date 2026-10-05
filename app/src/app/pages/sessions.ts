import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { SessionTime } from './session-time';

@Component({
  selector: 'app-sessions',
  imports: [RouterLink, SessionTime],
  template: `
    <h1>Sessions</h1>
    <input
      class="search"
      type="search"
      placeholder="Search titles, descriptions, speakers"
      aria-label="Search sessions"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />
    <div class="chips" role="group" aria-label="Filter by topic">
      @for (t of data.topics(); track t.topic) {
        <button
          type="button"
          class="chip"
          [class.selected]="topic() === t.topic"
          [attr.aria-pressed]="topic() === t.topic"
          (click)="topic.set(topic() === t.topic ? null : t.topic)"
        >
          {{ t.topic }} <span class="count">{{ t.sessionCount }}</span>
        </button>
      }
    </div>
    <p class="muted">{{ filtered().length }} of {{ data.sessions().length }} sessions</p>
    <ul class="cards">
      @for (s of filtered(); track s.id) {
        <li>
          <a class="card" [routerLink]="['/sessions', s.id]">
            <h2>{{ s.title }}</h2>
            <p class="speakers">{{ speakerNames(s.speakers) }}</p>
            <app-session-time [session]="s" />
            <p class="excerpt">{{ s.description }}</p>
            <div class="tags">
              @for (tag of s.tags; track tag) {
                <span class="tag">{{ tag }}</span>
              }
            </div>
          </a>
        </li>
      } @empty {
        <li class="muted">No sessions match.</li>
      }
    </ul>
  `,
})
export class Sessions {
  protected readonly data = inject(DataService);
  protected readonly query = signal('');
  protected readonly topic = signal<string | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const topic = this.topic();
    return this.data
      .sessions()
      .filter((s) => !topic || s.tags.includes(topic))
      .filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.speakers.some((sp) => sp.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '') || a.title.localeCompare(b.title));
  });

  protected speakerNames(speakers: { name: string }[]) {
    return speakers.map((s) => s.name).join(', ');
  }
}
