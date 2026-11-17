import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { sampleTracksFor } from "./sample-tracks";
import { decodeEntities, isIndividualSong } from "./song-filter";
import type { Song } from "./types";

// Keyless search through public Piped / Invidious mirrors. Results are shared between
// listeners for a few hours; when every mirror is down, saved or sample songs are shown.
const CACHE_HOURS = 6;
const TIMEOUT_MS = 7000;

const PIPED = [
  "https://api.piped.private.coffee",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.r4fo.com",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.leptons.xyz",
  "https://piped-api.lunar.icu",
];
const INVIDIOUS = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yewtu.be",
  "https://invidious.f5.si",
  "https://iv.melmac.space",
  "https://inv.tux.pizza",
];

type Result = { songs: Song[]; error: null; source: "live" | "saved" | "sample" };

function toSong(id: string, title: string, channel: string, durationSec: number): Song | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const t = decodeEntities(title);
  if (!isIndividualSong(t, durationSec)) return null;
  return { id, title: t, channel: decodeEntities(channel), thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, durationSec };
}

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0 WesleyMusic" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error(`${url} ${r.status}`);
  return r.json();
}

async function searchPiped(base: string, q: string): Promise<Song[]> {
  const d = (await getJson(`${base}/search?${new URLSearchParams({ q, filter: "videos" })}`)) as {
    items?: { type?: string; url?: string; title?: string; uploaderName?: string; duration?: number }[];
  };
  const songs = (d.items ?? [])
    .filter((i) => i.type === "stream" && i.url)
    .map((i) => toSong(i.url!.split("v=")[1]?.slice(0, 11) ?? "", i.title ?? "", i.uploaderName ?? "", i.duration ?? 0))
    .filter((s): s is Song => !!s);
  if (!songs.length) throw new Error("empty");
  return songs;
}

async function searchInvidious(base: string, q: string): Promise<Song[]> {
  const d = (await getJson(`${base}/api/v1/search?${new URLSearchParams({ q, type: "video" })}`)) as {
    type?: string;
    videoId?: string;
    title?: string;
    author?: string;
    lengthSeconds?: number;
  }[];
  const songs = (Array.isArray(d) ? d : [])
    .filter((i) => i.type === "video" && i.videoId)
    .map((i) => toSong(i.videoId!, i.title ?? "", i.author ?? "", i.lengthSeconds ?? 0))
    .filter((s): s is Song => !!s);
  if (!songs.length) throw new Error("empty");
  return songs;
}

async function searchLive(q: string): Promise<Song[] | null> {
  try {
    return await Promise.any([
      ...PIPED.map((b) => searchPiped(b, q)),
      ...INVIDIOUS.map((b) => searchInvidious(b, q)),
    ]);
  } catch {
    return null;
  }
}

export const searchSongs = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ q: z.string().max(120).default(""), genre: z.string().max(30).default("tout") }).parse(d),
  )
  .handler(async ({ data }): Promise<Result> => {
    const genre = genreById(data.genre);
    const userQ = data.q.trim().toLowerCase().replace(/\s+/g, " ");
    const q = userQ ? (genre.id === "tout" ? userQ : `${userQ} ${genre.label}`) : genre.query;
    const cacheKey = `${genre.id}|${userQ}`;

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
    } catch (e) {
      console.error("search cache read failed", e);
    }

    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_HOURS * 3600_000) {
      return { songs: cached.songs, error: null, source: "saved" };
    }

    let live = await searchLive(q);
    if (live?.length && live.length < 6 && !userQ) {
      // Top up thin genre results with sample songs.
      const ids = new Set(live.map((s) => s.id));
      live = [...live, ...sampleTracksFor(genre.id).filter((s) => !ids.has(s.id))];
    }
    if (live?.length) {
      if (supabaseAdmin) {
        await supabaseAdmin
          .from("search_cache")
          .upsert({ cache_key: cacheKey, songs: live, fetched_at: new Date().toISOString() })
          .then(({ error }) => error && console.error("search cache write failed", error));
      }
      return { songs: live, error: null, source: "live" };
    }

    console.warn("All public search mirrors failed for", q);
    if (cached) return { songs: cached.songs, error: null, source: "saved" };
    return { songs: sampleTracksFor(genre.id, userQ), error: null, source: "sample" };
  });
