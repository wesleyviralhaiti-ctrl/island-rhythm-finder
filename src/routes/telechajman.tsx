import { createFileRoute } from "@tanstack/react-router";
import { Crown, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/wesley/PageHeader";
import { SongRow } from "@/components/wesley/SongRow";
import { useApp } from "@/lib/app-store";

export const Route = createFileRoute("/telechajman")({
  head: () => ({
    meta: [
      { title: "Telechajman — WESLEY MUSIC DOWNLOAD" },
      { name: "description", content: "Tout mizik ou sove nan WESLEY MUSIC DOWNLOAD." },
      { property: "og:title", content: "Telechajman — WESLEY MUSIC DOWNLOAD" },
      { property: "og:description", content: "Tout mizik ou sove nan WESLEY MUSIC DOWNLOAD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Downloads,
});

function Downloads() {
  const { downloads, removeDownload, play, isPremium, status, setPaymentOpen } = useApp();

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-md px-4 pt-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black">Telechajman</h1>
            <p className="text-sm text-muted-foreground">{downloads.length} mizik sove</p>
          </div>
          {downloads.length > 0 && (
            <Button variant="neon" className="rounded-full" onClick={() => play(downloads[0]!, downloads)}>
              <Play className="fill-current" /> Jwe tout
            </Button>
          )}
        </div>

        {!isPremium && (
          <div className="mt-5 overflow-hidden rounded-3xl border border-primary/40 bg-neon-soft p-5">
            <Crown className="size-7 text-primary" />
            <h2 className="mt-2 text-lg font-extrabold">Debloke Telechajman</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status?.pending
                ? "Peman ou an ap tann verifikasyon. N ap aktive kont ou byento."
                : "Vin Premium pou $20/mwa oswa $150 pou tout lavi, epi sove tout mizik ou renmen."}
            </p>
            <Button variant="neon" className="mt-4 rounded-full" onClick={() => setPaymentOpen(true)}>
              {status?.pending ? "Wè estati" : "Vin Premium"}
            </Button>
          </div>
        )}

        <div className="mt-6 space-y-1">
          {downloads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Download className="mx-auto mb-2 size-8 text-primary" />
              Peze bouton telechaje a sou yon mizik pou w sove l isit la.
            </div>
          ) : (
            downloads.map((s) => (
              <SongRow key={s.id} song={s} queue={downloads} hideDownload onRemove={() => removeDownload(s.id)} />
            ))
          )}
        </div>
      </main>
    </>
  );
}
