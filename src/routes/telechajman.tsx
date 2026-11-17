import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Download, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/wesley/PageHeader";
import { MusicFolderDialog } from "@/components/wesley/MusicFolderDialog";
import { VaultCard } from "@/components/wesley/VaultCard";
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
  const { downloads, removeDownload, play, isPremium, status, setPaymentOpen, jobs, current } = useApp();
  const [folderFor, setFolderFor] = useState<string | null | undefined>(undefined);
  const offlineQueue = downloads.map((d) => ({ ...d, offline: true }));
  const activeJobs = Object.entries(jobs);

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-md px-4 pt-5">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black">Telechajman</h1>
            <p className="text-sm text-muted-foreground">{downloads.length} MP3 sou aparèy la</p>
          </div>
          {downloads.length > 0 && (
            <Button variant="neon" className="rounded-full" onClick={() => play(offlineQueue[0]!, offlineQueue)}>
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

        {activeJobs.length > 0 && (
          <div className="mt-6 space-y-2">
            {activeJobs.map(([id, job]) => (
              <div key={id} className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  {job.stage === "prepare" ? "Ap prepare MP3 a…" : `Ap telechaje… ${job.progress ?? 0}%`}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-neon-gradient transition-all"
                    style={{ width: `${job.stage === "prepare" ? 8 : (job.progress ?? 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {downloads.length === 0 && activeJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Download className="mx-auto mb-2 size-8 text-primary" />
              Peze bouton telechaje a sou yon mizik pou w sove MP3 a sou telefòn ou.
            </div>
          ) : (
            offlineQueue.map((t) => (
              <VaultCard
                key={t.id}
                track={t}
                playing={current?.id === t.id && !!current.offline}
                onPlay={() => play(t, offlineQueue)}
                onFolder={() => setFolderFor(t.id)}
                onDelete={() => removeDownload(t.id)}
              />
            ))
          )}
        </div>
        <MusicFolderDialog
          open={folderFor !== undefined}
          onOpenChange={(o) => !o && setFolderFor(undefined)}
          tracks={downloads}
          highlightId={folderFor ?? null}
        />
      </main>
    </>
  );
}
