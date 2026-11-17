import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { decodeEntities, isIndividualSong, parseIsoDuration } from "./song-filter";
import type { Song } from "./types";

// Results are shared between all listeners so the YouTube daily search limit lasts longer.
const CACHE_HOURS = 6;
const GENERIC_ERROR = "Nou pa rive chèche mizik yo. Eseye ankò.";
const QUOTA_ERROR = "Limit rechèch jodi a fini. Eseye ankò demen oswa chwazi yon jan mizik.";

type Result = { songs: Song[]; error: string | null };

async function fetchFromYouTube(q: string, key: string): Promise<{ songs: Song[] } | { error: string }> {
  const sp = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    maxResults: "30",
    safeSearch: "moderate",
    q,
    key,
  });
  const sr = await fetch(`https://www.googleapis.com/youtube/v3/search?${sp}`);
  if (!sr.ok) {
    const body = await sr.text();
    console.error("YouTube search failed", sr.status, body.slice(0, 300));
    return { error: sr.status === 429 || body.includes("quota") ? QUOTA_ERROR : GENERIC_ERROR };
  }
  const sj = (await sr.json()) as { items?: { id?: { videoId?: string } }[] };
  const ids = (sj.items ?? []).map((i) => i.id?.videoId).filter(Boolean) as string[];
  if (!ids.length) return { songs: [] };

  const vp = new URLSearchParams({ part: "snippet,contentDetails", id: ids.join(","), key });
  const vr = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vp}`);
  if (!vr.ok) {
    console.error("YouTube videos failed", vr.status, (await vr.text()).slice(0, 300));
    return { error: GENERIC_ERROR };
  }
  const vj = (await vr.json()) as {
    items?: {
      id: string;
      snippet: { title: string; channelTitle: string; thumbnails: Record<string, { url: string }> };
      contentDetails: { duration: string };
    }[];
  };
  const songs: Song[] = [];
  for (const v of vj.items ?? []) {
    const durationSec = parseIsoDuration(v.contentDetails.duration);
    const title = decodeEntities(v.snippet.title);
    if (!isIndividualSong(title, durationSec)) continue;
    const t = v.snippet.thumbnails;
    songs.push({
      id: v.id,
      title,
      channel: decodeEntities(v.snippet.channelTitle),
      thumbnail: (t["medium"] ?? t["high"] ?? t["default"])?.url ?? "",
      durationSec,
    });
  }
  return { songs };
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cached } = await supabaseAdmin
      .from("search_cache")
      .select("songs, fetched_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    const fresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_HOURS * 3600_000;
    if (cached && fresh) return { songs: cached.songs as Song[], error: null };

    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) return { songs: (cached?.songs as Song[]) ?? [], error: cached ? null : GENERIC_ERROR };

    try {
      const res = await fetchFromYouTube(q, key);
      if ("error" in res) {
        // Serve older saved results rather than nothing.
        if (cached) return { songs: cached.songs as Song[], error: null };
        return { songs: [], error: res.error };
      }
      await supabaseAdmin
        .from("search_cache")
        .upsert({ cache_key: cacheKey, songs: res.songs, fetched_at: new Date().toISOString() });
      return { songs: res.songs, error: null };
    } catch (e) {
      console.error("YouTube search error", e);
      if (cached) return { songs: cached.songs as Song[], error: null };
      return { songs: [], error: GENERIC_ERROR };
    }
  });
