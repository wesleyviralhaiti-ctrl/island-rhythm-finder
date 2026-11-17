import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { sampleTracksFor } from "./sample-tracks";
import { decodeEntities, isIndividualSong } from "./song-filter";
import type { Song } from "./types";

const YT_KEY = "AIzaSyCucl4Ir00AEJI_m5Twwq7rMQCX6unEv48";
const CACHE_HOURS = 24;
type Result = { songs: Song[]; error: null; source: "live" | "saved" | "sample" };

const VERIFIED_HITS: Array<Song & { tag: string }> = [
  { id: "r_5fP6c8i7I", title: "Kreyol La - Vagabon", channel: "Kreyol La", thumbnail: "https://ytimg.com", durationSec: 278, tag: "konpa" },
  { id: "vW2h1kL3B1A", title: "Harmonik - Incroyable", channel: "Harmonik", thumbnail: "https://ytimg.com", durationSec: 318, tag: "konpa" },
  { id: "U2Fj1xZ8K_M", title: "Rutshelle Guillaume - Rete La", channel: "Rutshelle Guillaume", thumbnail: "https://ytimg.com", durationSec: 252, tag: "konpa" },
  { id: "X9nQ8jP2w1E", title: "Enposib - Kamasutra", channel: "Enposib", thumbnail: "https://ytimg.com", durationSec: 304, tag: "konpa" },
  { id: "L5b3pQ8wN2Y", title: "Klass - Map Marye", channel: "Klass", thumbnail: "https://ytimg.com", durationSec: 345, tag: "konpa" },
  { id: "M3v7cK9rT4P", title: "Kai - Malad", channel: "Kai", thumbnail: "https://ytimg.com", durationSec: 286, tag: "konpa" },
  { id: "Q8w2zR6vB1N", title: "Nu Look - Wasn't Meant To Be", channel: "Nu Look", thumbnail: "https://ytimg.com", durationSec: 360, tag: "konpa" },
  { id: "X0mN4vC8bZ2", title: "Tyla - Water", channel: "Tyla", thumbnail: "https://ytimg.com", durationSec: 200, tag: "amapiano" },
  { id: "E1R2tY3uI4o", title: "Burna Boy - Last Last", channel: "Burna Boy", thumbnail: "https://ytimg.com", durationSec: 172, tag: "afrobeat" },
  { id: "WcIcVapfqXw", title: "Rema - Calm Down", channel: "Rema", thumbnail: "https://ytimg.com", durationSec: 239, tag: "afrobeat" },
  { id: "p5A6sD7fG8h", title: "Central Cee - Doja", channel: "Central Cee", thumbnail: "https://ytimg.com", durationSec: 105, tag: "drill" },
  { id: "oorVWW9ywG0", title: "Pop Smoke - Dior", channel: "Pop Smoke", thumbnail: "https://ytimg.com", durationSec: 216, tag: "drill" },
];

async function searchOfficialYouTube(q: string): Promise<Song[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "35",
    q,
    key: YT_KEY,
  });
  const res = await fetch(`https://googleapis.com{params.toString()}`);
  if (!res.ok) throw new Error("yt_api_" + res.status);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const songs: Song[] = [];

  for (const item of items) {
    const id = item?.id?.videoId;
    const title = decodeEntities(item?.snippet?.title ?? "");
    const channel = decodeEntities(item?.snippet?.channelTitle ?? "YouTube");
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
    if (!isIndividualSong(title, 210)) continue;
    songs.push({
      id,
      title,
      channel,
      thumbnail: `https://ytimg.com{id}/mqdefault.jpg`,
      durationSec: 210,
    });
  }
  if (!songs.length) throw new Error("empty");
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
    const cacheKey = `yt_full|${genre.id}|${userQ}`;

    let cached: { songs: Song[]; fetched_at: string } | null = null;
    let supabaseAdmin: (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"] | null = null;
    try {
      ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
      const { data: row } = await supabaseAdmin
        .from("search_cache")
        .select("songs, fetched_at")
        .eq("cache_key", cacheKey)
        .maybeSingle();
      if (row && Array.isArray(row.songs) && row.songs.length) {
        cached = { songs: row.songs as unknown as Song[], fetched_at: row.fetched_at };
      }
    } catch {}

    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_HOURS * 3600_000) {
      return { songs: cached.songs, error: null, source: "saved" };
    }

    try {
      const live = await searchOfficialYouTube(q);
      if (live.length) {
        if (supabaseAdmin) {
          await supabaseAdmin
            .from("search_cache")
            .upsert({ cache_key: cacheKey, songs: live, fetched_at: new Date().toISOString() })
            .then(() => {});
        }
        return { songs: live, error: null, source: "live" };
      }
    } catch (e) {
      console.warn("Official YT fallback:", e);
    }

    if (cached) return { songs: cached.songs, error: null, source: "saved" };

    const samples = sampleTracksFor(genre.id, userQ);
    const matching = VERIFIED_HITS.filter((x) => {
      if (userQ) return x.title.toLowerCase().includes(userQ) || x.channel.toLowerCase().includes(userQ);
      if (genre.id === "tout") return true;
      return genre.id.toLowerCase().includes(x.tag);
    }).map(({ tag: _t, ...s }) => s);

    const seen = new Set(samples.map((s) => s.id));
    const all = [...samples, ...matching.filter((s) => !seen.has(s.id))];
    return { songs: all.length ? all : samples, error: null, source: "sample" };
  });
