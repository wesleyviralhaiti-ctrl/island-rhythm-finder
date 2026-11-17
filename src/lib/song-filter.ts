// Keeps only individual songs: no mixes, playlists, albums, or long sets.
export const MIN_SONG_SECONDS = 90;
export const MAX_SONG_SECONDS = 15 * 60; // longer than 15 min = mixtape

const NOT_A_SINGLE =
  /\b(mix|mixtape|megamix|playlist|full album|album complet|compilation|compil|nonstop|non-stop|non stop|live set|dj set|top \d+|\d+\s*(hours?|hrs?|h)\b|1 hour|best of|medley)\b/i;

export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

export function isIndividualSong(title: string, durationSec: number): boolean {
  if (durationSec < MIN_SONG_SECONDS || durationSec > MAX_SONG_SECONDS) return false;
  return !NOT_A_SINGLE.test(title);
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function decodeEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
