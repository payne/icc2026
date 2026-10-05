export const GITHUB_URL = 'https://github.com/payne/icc2026';

/** Datasette Lite loads the SQLite file straight from this site (GitHub Pages sends CORS headers). */
export function datasetteLiteUrl(): string {
  const db = new URL('data/icc2026.db', document.baseURI).href;
  return `https://lite.datasette.io/?url=${encodeURIComponent(db)}`;
}

export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
