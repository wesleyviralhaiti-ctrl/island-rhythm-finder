import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { sampleTracksFor } from "./sample-tracks";
import { decodeEntities, isIndividualSong } from "./song-filter";
import type { Song } from "./types";

const TIMEOUT_MS = 8000;
type Result = { songs: Song[]; error: null; source: "live" | "saved" | "sample" };

const EXTRA_CATALOG: Array<Song & { tag: string }> = [
  { id: "r25G2N15fD0", title: "Kreyol La - Vagabon", channel: "Kreyol La", thumbnail: "https://ytimg.com", durationSec: 268, tag: "konpa" },
  { id: "v4P7F8yM1sA", title: "Harmonik - Incroyable", channel: "Harmonik", thumbnail: "https://ytimg.com", durationSec: 312, tag: "konpa" },
  { id: "0K4-5K6w9bE", title: "Rutshelle Guillaume - Rete La", channel: "Rutshelle Guillaume", thumbnail: "https://ytimg.com", durationSec: 245, tag: "konpa" },
  { id: "8J4kP5yL2mQ", title: "Enposib - Kamasutra", channel: "Enposib", thumbnail: "https://ytimg.com", durationSec: 295, tag: "konpa" },
  { id: "q7W9eR2tY4u", title: "Klass - Map Marye", channel: "Klass", thumbnail: "https://ytimg.com", durationSec: 340, tag: "konpa" },
  { id: "z3X5cV7bN9m", title: "Kai - Malad", channel: "Kai", thumbnail: "https://ytimg.com", durationSec: 280, tag: "konpa" },
  { id: "a1S2dF3gH4j", title: "Nu Look - Wasn't Meant To Be", channel: "Nu Look", thumbnail: "https://ytimg.com", durationSec: 355, tag: "konpa" },
  { id: "k5L6pO7iU8y", title: "T-Vice - Ma Cherie Je T'aime", channel: "T-Vice", thumbnail: "https://ytimg.com", durationSec: 274, tag: "konpa" },
  { id: "t9R8eW7qA6s", title: "TonyMix - Raboday 2026", channel: "DJ TonyMix", thumbnail: "https://ytimg.com", durationSec: 195, tag: "raboday" },
  { id: "d5F4gH3jK2l", title: "Bedjine & K-Dilak - Pouki", channel: "K-Dilak", thumbnail: "https://ytimg.com", durationSec: 230, tag: "konpa" },
  { id: "z9X8cV7bN6m", title: "Kanis - Raboday Fever", channel: "Kanis", thumbnail: "https://ytimg.com", durationSec: 188, tag: "raboday" },
  { id: "m1N2bV3cX4z", title: "Tyla - Water", channel: "Tyla", thumbnail: "https://ytimg.com", durationSec: 200, tag: "amapiano" },
  { id: "p0O9iU8yT7r", title: "Kabza De Small - Imithandazo", channel: "Kabza De Small", thumbnail: "https://ytimg.com", durationSec: 310, tag: "amapiano" },
  { id: "e6W5qA4sD3f", title: "Uncle Waffles - Tanzania", channel: "Uncle Waffles", thumbnail: "https://ytimg.com", durationSec: 260, tag: "amapiano" },
  { id: "g2H3jK4lZ5x", title: "Central Cee - Doja", channel: "Central Cee", thumbnail: "https://ytimg.com", durationSec: 105, tag: "drill" },
  { id: "c6V7bN8mQ9w", title: "Pop Smoke - Dior", channel: "Pop Smoke", thumbnail: "https://ytimg.com", durationSec: 216, tag: "drill" },
  { id: "e1R2tY3uI4o", title: "Burna Boy - Last Last", channel: "Burna Boy", thumbnail: "https://ytimg.com", durationSec: 172, tag: "afrobeat" },
  { id: "p5A6sD7fG8h", title: "Rema - Calm Down", channel: "Rema", thumbnail: "https://ytimg.com", durationSec: 239, tag: "afrobeat" },
  { id: "j9K0lZ1xC2v", title: "Asake - Lonely At The Top", channel: "Asake", thumbnail: "https://ytimg.com", durationSec: 157, tag: "afrobeat" },
  { id: "b3N4mQ5wE6r", title: "Wendy - King Rete King", channel: "Wendy Traka", thumbnail: "https://ytimg.com", durationSec: 225, tag: "rap" },
  { id: "t7Y8uI9oP0a", title: "Fantom - Rap Kreyol", channel: "Fantom", thumbnail: "https://ytimg.com", durationSec: 240, tag: "rap" },
  { id: "s1D2fG3hJ4k", title: "Izolan - Barikad Crew", channel: "Izolan", thumbnail: "https://ytimg.com", durationSec: 252, tag: "rap" },
];

function parseDurationText(txt: string): number {
  const parts = txt.split(":").map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 210;
  if (parts.length === 2) return (parts.at(0) ?? 0) * 60 + (parts.at(1) ?? 0);
  if (parts.length === 3) return (parts.at(0) ?? 0) * 3600 + (parts.at(1) ?? 0) * 60 + (parts.at(2) ?? 0);
  return 210;
}

async function searchYouTubeInnerTube(q: string): Promise<Song[]> {
  const res = await fetch("https://youtube.com", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: "2.20241126.01.00" } },
      query: q,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("yt_api_" + res.status);
  const json = await res.json();
  const sections =
    json?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  const songs: Song[] = [];
  const seen = new Set<string>();

  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents ?? [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v || !v.videoId || seen.has(v.videoId)) continue;
      if (!/^[A-Za-z0-9_-]{11}$/.test(v.videoId)) continue;
      const titleRuns = Array.isArray(v?.title?.runs) ? v.title.runs : [];
      const title = decodeEntities(titleRuns.at(0)?.text ?? v?.title?.simpleText ?? "");
      const ownerRuns = Array.isArray(v?.ownerText?.runs) ? v.ownerText.runs : [];
      const bylineRuns = Array.isArray(v?.longBylineText?.runs) ? v.longBylineText.runs : [];
      const channel = decodeEntities(ownerRuns.at(0)?.text ?? bylineRuns.at(0)?.text ?? "YouTube");
      const durText = v?.lengthText?.simpleText ?? "";
      if (!durText) continue;
      const durationSec = parseDurationText(durText);
      if (!isIndividualSong(title, durationSec)) continue;
      seen.add(v.videoId);
      songs.push({
        id: v.videoId,
        title,
        channel,
        thumbnail: `https://ytimg.com{v.videoId}/mqdefault.jpg`,
        durationSec,
      });
      if (songs.length >= 25) break;
    }
    if (songs.length >= 25) break;
  }

  if (!songs.length) throw new Error("yt_empty");
  return songs;
}

export const searchSongs = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ q: z.string().max(120).default(""), genre: z.string().max(30).default("tout") }).parse(d),
  )
  .handler(async ({ data }): Promise<Result> => {
    const genre = genreById(data.genre);
    const userQ = data.q.trim().toLowerCase().replace(/\s+/g, " ");
    const q = userQ ? (genre.id === "tout" ? userQ : `${userQ} ${genre.label}`) : genre.query;

    try {
      const live = await searchYouTubeInnerTube(q);
      if (live.length >= 3) {
        return { songs: live, error: null, source: "live" };
      }
    } catch {}

    const baseSamples = sampleTracksFor(genre.id, userQ);
    const matchingExtra = EXTRA_CATALOG.filter((item) => {
      if (userQ) {
        return item.title.toLowerCase().includes(userQ) || item.channel.toLowerCase().includes(userQ);
      }
      if (genre.id === "tout") return true;
      return genre.id.toLowerCase().includes(item.tag);
    }).map(({ tag: _t, ...song }) => song);

    const seen = new Set(baseSamples.map((s) => s.id));
    const combined = [...baseSamples, ...matchingExtra.filter((s) => !seen.has(s.id))];
    return { songs: combined.length ? combined : baseSamples, error: null, source: "sample" };
  });
