import { Check, Download, ListPlus, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { formatDuration } from "@/lib/song-filter";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EqBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="animate-eq h-full w-1 rounded-full bg-primary" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

export function SongRow({
  song,
  queue,
  onRemove,
  hideDownload,
}: {
  song: Song;
  queue: Song[];
  onRemove?: () => void;
  hideDownload?: boolean;
}) {
  const { current, play, download, isDownloaded, setPlaylistTarget, jobs } = useApp();
  const job = jobs[song.id];
  const active = current?.id === song.id;
  const downloaded = isDownloaded(song.id);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:bg-surface",
        active && "border-primary/40 bg-surface",
      )}
    >
      <button
        type="button"
        onClick={() => play(song, queue)}
        className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted"
        aria-label={`Jwe ${song.title}`}
      >
        {song.thumbnail && (
          <img src={song.thumbnail} alt="" loading="lazy" className="size-full object-cover" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-background/40 opacity-0 transition-opacity group-hover:opacity-100">
          {active ? <Pause className="size-6 text-primary" /> : <Play className="size-6 fill-primary text-primary" />}
        </span>
      </button>
      <button type="button" onClick={() => play(song, queue)} className="min-w-0 flex-1 text-left">
        <div className={cn("line-clamp-2 text-sm font-semibold leading-snug", active && "text-primary")}>
          {song.title}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {active && <EqBars />}
          <span className="truncate">{song.channel}</span>
          <span>•</span>
          <span>{formatDuration(song.durationSec)}</span>
        </div>
      </button>
      <div className="flex shrink-0 items-center">
        <Button variant="ghost" size="icon" aria-label="Mete nan playlist" onClick={() => setPlaylistTarget(song)}>
          <ListPlus />
        </Button>
        {!hideDownload && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Telechaje"
            onClick={() => download(song)}
            disabled={!!job}
            className={cn("relative", (downloaded || job) && "text-primary")}
          >
            {job ? (
              job.progress != null ? (
                <span className="text-[10px] font-black">{job.progress}%</span>
              ) : (
                <Loader2 className="animate-spin" />
              )
            ) : downloaded ? (
              <Check />
            ) : (
              <Download />
            )}
          </Button>
        )}
        {onRemove && (
          <Button variant="ghost" size="icon" aria-label="Retire" onClick={onRemove}>
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
