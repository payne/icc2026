import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { youtubeSearchUrl } from '../core/links';
import { SessionTime } from './session-time';

@Component({
  selector: 'app-session-detail',
  imports: [RouterLink, SessionTime],
  template: `
    <a routerLink="/sessions" class="back">← All sessions</a>
    @if (session(); as s) {
      <article class="detail">
        <h1>{{ s.title }}</h1>
        <app-session-time [session]="s" />
        <div class="tags">
          @for (tag of s.tags; track tag) {
            <span class="tag">{{ tag }}</span>
          }
        </div>
        <p class="prose">{{ s.description }}</p>

        <h2>Speakers</h2>
        <ul class="people">
          @for (sp of speakers(); track sp.id) {
            <li>
              <a [routerLink]="['/speakers', sp.id]" class="person">
                @if (sp.profilePicture) {
                  <img [src]="sp.profilePicture" alt="" width="56" height="56" loading="lazy" />
                }
                <span>
                  <strong>{{ sp.fullName }}</strong>
                  <span class="muted small">{{ sp.tagLine }}</span>
                </span>
              </a>
            </li>
          }
        </ul>

        <p class="actions">
          @if (s.recordingUrl) {
            <a class="button" [href]="s.recordingUrl" target="_blank" rel="noopener">Watch recording</a>
          }
          <a class="button secondary" [href]="youtube()" target="_blank" rel="noopener">Search YouTube</a>
        </p>
      </article>
    } @else {
      <p class="muted">Session not found.</p>
    }
  `,
})
export class SessionDetail {
  private readonly data = inject(DataService);
  readonly id = input.required<string>();

  protected readonly session = computed(() => this.data.sessionById().get(this.id()));
  protected readonly speakers = computed(() =>
    (this.session()?.speakers ?? []).flatMap((ref) => this.data.speakerById().get(ref.id) ?? []),
  );
  protected readonly youtube = computed(() => {
    const s = this.session();
    return s ? youtubeSearchUrl(`${s.title} ${s.speakers.map((sp) => sp.name).join(' ')}`) : '';
  });
}
