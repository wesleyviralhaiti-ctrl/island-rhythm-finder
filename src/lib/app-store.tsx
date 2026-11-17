import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getListenerStatus } from "./listeners.functions";
import { getMp3Link } from "./mp3.functions";
import { safeFileName } from "./mp3-retry";
import { deleteTrack, listTracks, putTrack, type VaultTrack } from "./audio-vault";
import type { Song } from "./types";

export type DownloadJob = { stage: "prepare" | "download"; progress: number | null };

export type Listener = { id: string; name: string; email: string };
export type Playlist = { id: string; name: string; songs: Song[] };

type Status = Awaited<ReturnType<typeof getListenerStatus>>;

type Store = {
  hydrated: boolean;
  listener: Listener | null;
  setListener: (l: Listener | null) => void;
  status: Status | undefined;
  isPremium: boolean;
  refreshStatus: () => void;

  queue: Song[];
  index: number;
  current: Song | null;
  play: (song: Song, queue?: Song[]) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;

  downloads: VaultTrack[];
  jobs: Record<string, DownloadJob>;
  isDownloaded: (id: string) => boolean;
  download: (song: Song) => void;
  removeDownload: (id: string) => void;

  playlists: Playlist[];
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (playlistId: string, song: Song) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;
  playlistTarget: Song | null;
  setPlaylistTarget: (s: Song | null) => void;

  paymentOpen: boolean;
  setPaymentOpen: (v: boolean) => void;

  homeQuery: string;
  setHomeQuery: (q: string) => void;
  homeGenre: string;
  setHomeGenre: (g: string) => void;
};

const Ctx = createContext<Store | null>(null);

const K = { listener: "wmd.listener", playlists: "wmd.playlists" };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [listener, setListenerState] = useState<Listener | null>(null);
  const [downloads, setDownloads] = useState<VaultTrack[]>([]);
  const [jobs, setJobs] = useState<Record<string, DownloadJob>>({});
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [playlistTarget, setPlaylistTarget] = useState<Song | null>(null);
  const [homeQuery, setHomeQuery] = useState("");
  const [homeGenre, setHomeGenre] = useState("tout");

  useEffect(() => {
    setListenerState(readJson<Listener | null>(K.listener, null));
    listTracks()
      .then(setDownloads)
      .catch((e) => console.error("vault", e));
    setPlaylists(readJson<Playlist[]>(K.playlists, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(K.playlists, JSON.stringify(playlists));
  }, [playlists, hydrated]);

  const setListener = useCallback((l: Listener | null) => {
    setListenerState(l);
    if (l) window.localStorage.setItem(K.listener, JSON.stringify(l));
    else window.localStorage.removeItem(K.listener);
  }, []);

  const statusQuery = useQuery({
    queryKey: ["listener-status", listener?.id],
    queryFn: () => getListenerStatus({ data: { listenerId: listener!.id } }),
    enabled: !!listener,
    refetchInterval: (q) => (q.state.data?.pending ? 20_000 : false),
  });
  const status = statusQuery.data;
  const isPremium = !!status?.premium;

  const runDownload = useCallback(
    async (song: Song) => {
      if (!listener) return;
      const setJob = (job: DownloadJob | null) =>
        setJobs((j) => {
          const n = { ...j };
          if (job) n[song.id] = job;
          else delete n[song.id];
          return n;
        });
      setJob({ stage: "prepare", progress: null });
      try {
        const res = await getMp3Link({ data: { listenerId: listener.id, videoId: song.id } });
        if (!res.ok) throw new Error(res.error);
        setJob({ stage: "download", progress: 0 });
        const r = await fetch(res.link);
        if (!r.ok || !r.body) throw new Error("Telechajman MP3 a pa pase.");
        const total = Number(r.headers.get("content-length")) || res.filesize || 0;
        const reader = r.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total) setJob({ stage: "download", progress: Math.min(99, Math.round((received / total) * 100)) });
        }
        const blob = new Blob(chunks, { type: "audio/mpeg" });
        const { offline: _o, ...clean } = song;
        const track: VaultTrack = { ...clean, fileName: safeFileName(song.title), size: blob.size, savedAt: Date.now() };
        await putTrack(track, blob);
        setDownloads((d) => [track, ...d.filter((x) => x.id !== song.id)]);
        toast.success("DOWNLOAD FINISHED • audio (MP3)", { description: track.fileName });
      } catch (e) {
        toast.error("Telechajman an pa pase", {
          description: e instanceof Error ? e.message : "Eseye ankò.",
        });
      } finally {
        setJob(null);
      }
    },
    [listener],
  );

  const play = useCallback((song: Song, q?: Song[]) => {
    const list = q && q.length ? q : [song];
    const i = Math.max(0, list.findIndex((s) => s.id === song.id));
    setQueue(list);
    setIndex(i);
  }, []);

  const value = useMemo<Store>(
    () => ({
      hydrated,
      listener,
      setListener,
      status,
      isPremium,
      refreshStatus: () => void statusQuery.refetch(),
      queue,
      index,
      current: queue[index] ?? null,
      play,
      next: () => setIndex((i) => (queue.length ? (i + 1) % queue.length : 0)),
      prev: () => setIndex((i) => (queue.length ? (i - 1 + queue.length) % queue.length : 0)),
      stop: () => {
        setQueue([]);
        setIndex(0);
      },
      downloads,
      jobs,
      isDownloaded: (id) => downloads.some((d) => d.id === id),
      download: (song) => {
        if (!isPremium) {
          setPaymentOpen(true);
          return;
        }
        if (jobs[song.id]) return;
        if (downloads.some((d) => d.id === song.id)) {
          toast("Mizik sa a deja nan Telechajman ou.");
          return;
        }
        toast("Telechajman kòmanse…", { description: song.title });
        void runDownload(song);
      },
      removeDownload: (id) => {
        setDownloads((d) => d.filter((s) => s.id !== id));
        void deleteTrack(id).catch((e) => console.error("vault", e));
      },
      playlists,
      createPlaylist: (name) => {
        const id = crypto.randomUUID();
        setPlaylists((p) => [{ id, name, songs: [] }, ...p]);
        return id;
      },
      deletePlaylist: (id) => setPlaylists((p) => p.filter((x) => x.id !== id)),
      addToPlaylist: (pid, song) =>
        setPlaylists((p) =>
          p.map((x) =>
            x.id === pid && !x.songs.some((s) => s.id === song.id) ? { ...x, songs: [...x.songs, song] } : x,
          ),
        ),
      removeFromPlaylist: (pid, sid) =>
        setPlaylists((p) => p.map((x) => (x.id === pid ? { ...x, songs: x.songs.filter((s) => s.id !== sid) } : x))),
      playlistTarget,
      setPlaylistTarget,
      paymentOpen,
      setPaymentOpen,
      homeQuery,
      setHomeQuery,
      homeGenre,
      setHomeGenre,
    }),
    [hydrated, listener, setListener, status, isPremium, statusQuery, queue, index, play, downloads, jobs, runDownload, playlists, playlistTarget, paymentOpen, homeQuery, homeGenre],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
