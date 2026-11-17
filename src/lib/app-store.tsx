import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getListenerStatus } from "./listeners.functions";
import type { Song } from "./types";

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

  downloads: Song[];
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

const K = { listener: "wmd.listener", downloads: "wmd.downloads", playlists: "wmd.playlists" };

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
  const [downloads, setDownloads] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [playlistTarget, setPlaylistTarget] = useState<Song | null>(null);
  const [homeQuery, setHomeQuery] = useState("");
  const [homeGenre, setHomeGenre] = useState("tout");

  useEffect(() => {
    setListenerState(readJson<Listener | null>(K.listener, null));
    setDownloads(readJson<Song[]>(K.downloads, []));
    setPlaylists(readJson<Playlist[]>(K.playlists, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(K.downloads, JSON.stringify(downloads));
  }, [downloads, hydrated]);
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
      isDownloaded: (id) => downloads.some((d) => d.id === id),
      download: (song) => {
        if (!isPremium) {
          setPaymentOpen(true);
          return;
        }
        if (downloads.some((d) => d.id === song.id)) {
          toast("Mizik sa a deja nan Telechajman ou.");
          return;
        }
        setDownloads((d) => [song, ...d]);
        toast.success("Ajoute nan Telechajman", { description: song.title });
      },
      removeDownload: (id) => setDownloads((d) => d.filter((s) => s.id !== id)),
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
    [hydrated, listener, setListener, status, isPremium, statusQuery, queue, index, play, downloads, playlists, playlistTarget, paymentOpen, homeQuery, homeGenre],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
