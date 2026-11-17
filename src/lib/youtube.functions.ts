import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { genreById } from "./genres";
import { sampleTracksFor } from "./sample-tracks";
import { decodeEntities, isIndividualSong } from "./song-filter";
import type { Song } from "./types";

const YT_KEY = "AIzaSyCucl4Ir00AEJI_m5Twwq7rMQCX6unEv48";
const TIMEOUT_MS = 6000;
type Result = { songs: Song[]; error: null; source: "live" | "saved" | "sample" };

const PIPED_MIRRORS = [
  "https://private.coffee",
  "https://kavin.rocks",
  "https://adminforge.de",
  "https://r4fo.com",
];

const INVIDIOUS_MIRRORS = [
  "https://nadeko.net",
  "https://nerdvpn.de",
  "https://yewtu.be",
  "https://f5.si",
];

function toSong(id: string, title: string, channel: string, durationSec: number): Song | null {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const t = decodeEntities(title);
  if (!isIndividualSong(t, durationSec)) return null;
  return {
    id,
    title: t,
    channel: decodeEntities(channel) || "YouTube",
    thumbnail: `https://ytimg.com{id}/mqdefault.jpg`,
    durationSec,
  };
}

async function searchOfficialYouTube(q: string): Promise<Song[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "35",
    q,
    key: YT_KEY,
  });
  const res = await fetch(`https://googleapis.com{params.toString()}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("yt_api_" + res.status);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const songs = items
    .map((item: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }) =>
      toSong(item?.id?.videoId ?? "", item?.snippet?.title ?? "", item?.snippet?.channelTitle ?? "YouTube", 210),
    )
    .filter((s: Song | null): s is Song => !!s);
  if (!songs.length) throw new Error("empty");
  return songs;
}

async function searchPiped(base: string, q: string): Promise<Song[]> {
  const r = await fetch(`${base}/search?${new URLSearchParams({ q, filter: "videos" })}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error("piped");
  const d = await r.json();
  const songs = (Array.isArray(d?.items) ? d.items : [])
    .filter((i: { type?: string; url?: string }) => i.type === "stream" && i.url)
    .map((i: { url: string; title?: string; uploaderName?: string; duration?: number }) =>
      toSong(i.url.split("v=")[1]?.slice(0, 11) ?? "", i.title ?? "", i.uploaderName ?? "", i.duration ?? 210),
    )
    .filter((s: Song | null): s is Song => !!s);
  if (!songs.length) throw new Error("empty");
  return songs;
}

async function searchInvidious(base: string, q: string): Promise<Song[]> {
  const r = await fetch(`${base}/api/v1/search?${new URLSearchParams({ q, type: "video" })}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error("inv");
  const d = await r.json();
  const songs = (Array.isArray(d) ? d : [])
    .filter((i: { type?: string; videoId?: string }) => i.type === "video" && i.videoId)
    .map((i: { videoId: string; title?: string; author?: string; lengthSeconds?: number }) =>
      toSong(i.videoId, i.title ?? "", i.author ?? "", i.lengthSeconds ?? 210),
    )
    .filter((s: Song | null): s is Song => !!s);
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

    try {
      const live = await Promise.any([
        searchOfficialYouTube(q),
        ...PIPED_MIRRORS.map((m) => searchPiped(m, q)),
        ...INVIDIOUS_MIRRORS.map((m) => searchInvidious(m, q)),
      ]);
      if (live.length) return { songs: live, error: null, source: "live" };
    } catch {}

    return { songs: sampleTracksFor(genre.id, userQ), error: null, source: "sample" };
  });
