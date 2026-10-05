import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../core/data.service';

@Component({
  selector: 'app-speakers',
  imports: [RouterLink],
  template: `
    <h1>Speakers</h1>
    <input
      class="search"
      type="search"
      placeholder="Search names, taglines, bios"
      aria-label="Search speakers"
      [value]="query()"
      (input)="query.set($any($event.target).value)"
    />
    <p class="muted">{{ filtered().length }} of {{ data.speakers().length }} speakers</p>
    <ul class="speaker-grid">
      @for (sp of filtered(); track sp.id) {
        <li>
          <a class="card speaker-card" [routerLink]="['/speakers', sp.id]">
            @if (sp.profilePicture) {
              <img [src]="sp.profilePicture" alt="" width="96" height="96" loading="lazy" />
            } @else {
              <span class="avatar-fallback" aria-hidden="true">{{ sp.firstName[0] }}{{ sp.lastName[0] }}</span>
            }
            <h2>{{ sp.fullName }}</h2>
            <p class="muted small">{{ sp.tagLine }}</p>
          </a>
        </li>
      } @empty {
        <li class="muted">No speakers match.</li>
      }
    </ul>
  `,
})
export class Speakers {
  protected readonly data = inject(DataService);
  protected readonly query = signal('');

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.data
      .speakers()
      .filter(
        (sp) =>
          !q ||
          sp.fullName.toLowerCase().includes(q) ||
          (sp.tagLine ?? '').toLowerCase().includes(q) ||
          (sp.bio ?? '').toLowerCase().includes(q),
      );
  });
}
