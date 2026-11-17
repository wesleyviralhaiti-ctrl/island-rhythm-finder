import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { sampleTracksFor } from "./sample-tracks";
import { decodeEntities, isIndividualSong } from "./song-filter";
import type { Song } from "./types";

const YT_KEY = "AIzaSyCucl4Ir00AEJI_m5Twwq7rMQCX6unEv48";
const CACHE_HOURS = 12;
type Result = { songs: Song[]; error: null; source: "live" | "saved" | "sample" };

async function searchOfficialYouTube(q: string): Promise<Song[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
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
    const cacheKey = `yt_official|${genre.id}|${userQ}`;

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
    return { songs: sampleTracksFor(genre.id, userQ), error: null, source: "sample" };
  });
