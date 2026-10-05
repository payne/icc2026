import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DataService } from './core/data.service';
import { datasetteLiteUrl } from './core/links';
import { UpdateService } from './core/update.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  template: `
    <header class="topbar">
      <a routerLink="/sessions" class="brand">
        <img src="icons/icon-72x72.png" alt="" width="32" height="32" />
        <span>Iowa Code Camp <span class="year">2026</span></span>
      </a>
      <nav class="nav" aria-label="Main">
        @for (item of nav; track item.label) {
          @if (item.href) {
            <a [href]="item.href" target="_blank" rel="noopener" class="nav-link">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              <span>{{ item.label }}</span>
            </a>
          } @else {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-link">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              <span>{{ item.label }}</span>
            </a>
          }
        }
      </nav>
    </header>

    @if (updates.reloading()) {
      <div class="banner">Updating to the latest version…</div>
    }

    <main class="content">
      @if (data.error(); as err) {
        <p class="error">Couldn't load conference data ({{ err }}). Check your connection and reload.</p>
      } @else if (!data.loaded()) {
        <p class="muted">Loading…</p>
      } @else {
        <router-outlet />
      }
    </main>
  `,
})
export class App {
  protected readonly data = inject(DataService);
  protected readonly updates = inject(UpdateService);

  // Material Symbols-style 24px icon paths.
  protected readonly nav = [
    { label: 'Sessions', path: '/sessions', icon: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z' },
    {
      label: 'Speakers',
      path: '/speakers',
      icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z',
    },
    {
      label: 'Videos',
      path: '/videos',
      icon: 'M21 6.5 17 9V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2l4 2.5z',
    },
    {
      label: 'Explore DB',
      href: datasetteLiteUrl(),
      icon: 'M2 20h20v-4H2zm2-3h2v2H4zM2 4v4h20V4zm4 3H4V5h2zm-4 7h20v-4H2zm2-3h2v2H4z',
    },
    {
      label: 'About',
      path: '/about',
      icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z',
    },
  ];

  constructor() {
    this.updates.start();
  }
}
