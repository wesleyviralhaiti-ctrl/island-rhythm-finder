import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ListMusic, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/wesley/PageHeader";
import { SongRow } from "@/components/wesley/SongRow";
import { useApp } from "@/lib/app-store";

export const Route = createFileRoute("/playlist")({
  head: () => ({
    meta: [
      { title: "Playlist — WESLEY MUSIC DOWNLOAD" },
      { name: "description", content: "Kreye ak jwe playlist mizik pa w nan WESLEY MUSIC DOWNLOAD." },
      { property: "og:title", content: "Playlist — WESLEY MUSIC DOWNLOAD" },
      { property: "og:description", content: "Kreye ak jwe playlist mizik pa w nan WESLEY MUSIC DOWNLOAD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Playlists,
});

function Playlists() {
  const { playlists, createPlaylist, deletePlaylist, removeFromPlaylist, play } = useApp();
  const [name, setName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = playlists.find((p) => p.id === openId) ?? null;

  if (open) {
    return (
      <>
        <PageHeader />
        <main className="mx-auto max-w-md px-4 pt-4">
          <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setOpenId(null)}>
            <ChevronLeft /> Playlist yo
          </Button>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black">{open.name}</h1>
              <p className="text-sm text-muted-foreground">{open.songs.length} mizik</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Efase playlist"
                onClick={() => {
                  deletePlaylist(open.id);
                  setOpenId(null);
                }}
              >
                <Trash2 />
              </Button>
              {open.songs.length > 0 && (
                <Button variant="neon" className="rounded-full" onClick={() => play(open.songs[0]!, open.songs)}>
                  <Play className="fill-current" /> Jwe
                </Button>
              )}
            </div>
          </div>
          <div className="mt-5 space-y-1">
            {open.songs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Ajoute mizik ak bouton playlist la sou paj Akèy la.
              </p>
            ) : (
              open.songs.map((s) => (
                <SongRow key={s.id} song={s} queue={open.songs} onRemove={() => removeFromPlaylist(open.id, s.id)} />
              ))
            )}
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-md px-4 pt-5">
        <h1 className="text-2xl font-black">Playlist</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createPlaylist(name.trim());
            setName("");
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Non nouvo playlist la"
            className="h-11 rounded-xl bg-surface"
            maxLength={40}
          />
          <Button type="submit" className="h-11 rounded-xl font-bold">
            <Plus /> Kreye
          </Button>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {playlists.length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <ListMusic className="mx-auto mb-2 size-8 text-primary" />
              Ou poko gen playlist. Kreye youn anlè a.
            </div>
          )}
          {playlists.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenId(p.id)}
              className="group overflow-hidden rounded-2xl border border-border bg-surface text-left transition-all hover:border-primary/50 hover:shadow-neon"
            >
              <div className="grid aspect-square grid-cols-2 bg-muted">
                {p.songs.slice(0, 4).map((s) => (
                  <img key={s.id} src={s.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
                ))}
                {p.songs.length === 0 && (
                  <div className="col-span-2 grid place-items-center">
                    <ListMusic className="size-10 text-primary" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-bold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.songs.length} mizik</div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
