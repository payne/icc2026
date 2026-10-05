import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the five menu items', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.nav-link span')].map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toEqual(['Sessions', 'Speakers', 'Videos', 'Explore DB', 'About']);
  });

  it('should open Explore DB in a new tab pointing at Datasette Lite', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a[target="_blank"]');
    expect(link?.href).toContain('https://lite.datasette.io/?url=');
    expect(decodeURIComponent(link!.href)).toContain('data/icc2026.db');
  });
});
