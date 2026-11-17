
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { sampleTracksFor } from "./sample-tracks";
import { decodeEntities, isIndividualSong } from "./song-filter";
import type { Song } from "./types";

const CACHE_HOURS = 6;
const TIMEOUT_MS = 8000;

type Result = { songs: Song[]; error: null; source: "live" | "saved" | "sample" };

function toSong(id: string, title: string, channel: string, durationSec: number): Song | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const t = decodeEntities(title);
  if (!isIndividualSong(t, durationSec)) return null;
  return {
    id,
    title: t,
    channel: decodeEntities(channel) || "YouTube Music",
    thumbnail: `https://ytimg.com{id}/mqdefault.jpg`,
    durationSec,
  };
}

function parseDurationText(txt: string): number {
  const parts = txt.split(":").map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 210;
  if (parts.length === 2) return (parts.at(0) ?? 0) * 60 + (parts.at(1) ?? 0);
  if (parts.length === 3) return (parts.at(0) ?? 0) * 3600 + (parts.at(1) ?? 0) * 60 + (parts.at(2) ?? 0);
  return 210;
}

async function searchYouTubeDirect(q: string): Promise<Song[]> {
  const url = "https://youtube.com" + encodeURIComponent(q);
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("yt_http_" + res.status);
  const html = await res.text();
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start === -1) throw new Error("yt_no_data");
  const end = html.indexOf(";</script>", start);
  if (end === -1) throw new Error("yt_no_end");
  const json = JSON.parse(html.slice(start + marker.length, end));

  const sections =
    json?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
  const songs: Song[] = [];
  const seen = new Set<string>();

  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents ?? [];
    for (const item of items) {
      const v = item?.videoRenderer;
      if (!v || !v.videoId || seen.has(v.videoId)) continue;
      const titleRuns = Array.isArray(v?.title?.runs) ? v.title.runs : [];
      const title = titleRuns.at(0)?.text ?? v?.title?.simpleText ?? "";
      const ownerRuns = Array.isArray(v?.ownerText?.runs) ? v.ownerText.runs : [];
      const bylineRuns = Array.isArray(v?.longBylineText?.runs) ? v.longBylineText.runs : [];
      const channel = ownerRuns.at(0)?.text ?? bylineRuns.at(0)?.text ?? "YouTube";
      const durText = v?.lengthText?.simpleText ?? "";
      if (!durText) continue;
      const durationSec = parseDurationText(durText);
      const song = toSong(v.videoId, title, channel, durationSec);
      if (song) {
        seen.add(v.videoId);
        songs.push(song);
      }
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
    const cacheKey = `yt_v3|${genre.id}|${userQ}`;

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
      const live = await searchYouTubeDirect(q);
      if (live.length) {
        if (supabaseAdmin) {
          await supabaseAdmin
            .from("search_cache")
            .upsert({ cache_key: cacheKey, songs: live, fetched_at: new Date().toISOString() })
            .then(() => {});
        }
        return { songs: live, error: null, source: "live" };
      }
    } catch (err) {
      console.warn("YouTube direct search fallback:", err);
    }

    if (cached) return { songs: cached.songs, error: null, source: "saved" };
    return { songs: sampleTracksFor(genre.id, userQ), error: null, source: "sample" };
  });
