import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';
import { youtubeSearchUrl } from '../core/links';

@Component({
  selector: 'app-speaker-detail',
  imports: [RouterLink],
  template: `
    <a routerLink="/speakers" class="back">← All speakers</a>
    @if (speaker(); as sp) {
      <article class="detail">
        <div class="speaker-head">
          @if (sp.profilePicture) {
            <img [src]="sp.profilePicture" alt="" width="128" height="128" />
          }
          <div>
            <h1>{{ sp.fullName }}</h1>
            <p class="muted">{{ sp.tagLine }}</p>
          </div>
        </div>
        <p class="prose">{{ sp.bio }}</p>

        @if (sp.links.length) {
          <ul class="links">
            @for (link of sp.links; track link.url) {
              <li><a [href]="link.url" target="_blank" rel="noopener">{{ link.title }}</a></li>
            }
          </ul>
        }

        <h2>Sessions</h2>
        <ul class="cards">
          @for (s of sp.sessions; track s.id) {
            <li><a class="card" [routerLink]="['/sessions', s.id]"><h3>{{ s.title }}</h3></a></li>
          }
        </ul>

        <p class="actions">
          <a class="button secondary" [href]="youtube()" target="_blank" rel="noopener">
            Search YouTube for {{ sp.firstName }}'s talks
          </a>
        </p>
      </article>
    } @else {
      <p class="muted">Speaker not found.</p>
    }
  `,
})
export class SpeakerDetail {
  private readonly data = inject(DataService);
  readonly id = input.required<string>();

  protected readonly speaker = computed(() => this.data.speakerById().get(this.id()));
  protected readonly youtube = computed(() => youtubeSearchUrl(`${this.speaker()?.fullName ?? ''} talk`));
}
