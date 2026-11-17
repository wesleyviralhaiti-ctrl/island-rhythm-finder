import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Music2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/wesley/PageHeader";
import { SongRow } from "@/components/wesley/SongRow";
import { useApp } from "@/lib/app-store";
import { GENRES, genreById } from "@/lib/genres";
import { searchSongs } from "@/lib/youtube.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Akèy — WESLEY MUSIC DOWNLOAD" },
      { name: "description", content: "Chèche ak koute nouvo mizik Konpa, Rabòday, Amapiano, Drill, Afrobeat ak Rap Kreyòl." },
      { property: "og:title", content: "WESLEY MUSIC DOWNLOAD — Akèy" },
      { property: "og:description", content: "Chèche ak koute nouvo mizik Konpa, Rabòday, Amapiano, Drill, Afrobeat ak Rap Kreyòl." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { listener, homeQuery, setHomeQuery, homeGenre, setHomeGenre } = useApp();
  const [draft, setDraft] = useState(homeQuery);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["songs", homeGenre, homeQuery],
    queryFn: () => searchSongs({ data: { q: homeQuery, genre: homeGenre } }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const songs = data?.songs ?? [];
  const firstName = listener?.name.split(" ")[0];

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-md px-4 pt-5">
        <p className="text-sm text-muted-foreground">Bonjou{firstName ? `, ${firstName}` : ""} 👋</p>
        <h1 className="mt-1 text-2xl font-black">
          Kisa w ap <span className="neon-text">koute</span> jodi a?
        </h1>

        <form
          className="relative mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            setHomeQuery(draft.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Chèche yon mizik sou YouTube..."
            className="h-13 rounded-2xl border-primary/30 bg-surface pl-12 pr-24 text-base focus-visible:shadow-neon"
            maxLength={120}
            enterKeyHint="search"
          />
          {draft && (
            <button
              type="button"
              aria-label="Efase"
              onClick={() => {
                setDraft("");
                setHomeQuery("");
              }}
              className="absolute right-20 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
          <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl font-bold">
            Chèche
          </Button>
        </form>

        <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {GENRES.map((g) => (
            <Button
              key={g.id}
              size="sm"
              variant={homeGenre === g.id ? "chipActive" : "chip"}
              onClick={() => setHomeGenre(g.id)}
              className="shrink-0 px-4"
            >
              {g.label}
            </Button>
          ))}
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold">
              {homeQuery ? `Rezilta pou "${homeQuery}"` : genreById(homeGenre).id === "tout" ? "Nouvo mizik" : genreById(homeGenre).label}
            </h2>
            {isFetching && <Loader2 className="size-4 animate-spin text-primary" />}
          </div>

          {isFetching && !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="size-16 animate-pulse rounded-xl bg-surface" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-surface" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.error || isError ? (
            <EmptyState text={data?.error ?? "Gen yon pwoblèm. Eseye ankò."} />
          ) : songs.length === 0 ? (
            <EmptyState text="Pa gen mizik ki jwenn. Eseye yon lòt rechèch." />
          ) : (
            <div className="space-y-1">
              {songs.map((s) => (
                <SongRow key={s.id} song={s} queue={songs} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <Music2 className="mx-auto mb-2 size-8 text-primary" />
      {text}
    </div>
  );
}
