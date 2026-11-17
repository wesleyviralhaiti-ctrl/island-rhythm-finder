import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSize, type VaultTrack } from "@/lib/audio-vault";
import { MUSIC_FOLDER } from "@/lib/mp3-retry";
import { cn } from "@/lib/utils";
import { EqBars } from "./SongRow";

export function VaultCard({
  track,
  playing,
  onPlay,
  onFolder,
  onDelete,
}: {
  track: VaultTrack;
  playing: boolean;
  onPlay: () => void;
  onFolder: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface",
        playing ? "border-primary shadow-neon" : "border-primary/30",
      )}
    >
      <div className="flex items-center gap-2 bg-neon-soft px-3 py-2 text-[11px] font-black tracking-wide text-primary">
        <CheckCircle2 className="size-4" />
        DOWNLOAD FINISHED • audio (MP3)
        <span className="ml-auto font-semibold text-muted-foreground">{formatSize(track.size)}</span>
      </div>
      <div className="flex gap-3 p-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {track.thumbnail && <img src={track.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("line-clamp-2 text-sm font-bold leading-snug", playing && "text-primary")}>
            {track.title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {playing && <EqBars />}
            <span className="truncate">{track.channel}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Efase" onClick={onDelete}>
          <Trash2 />
        </Button>
      </div>
      <div className="mx-3 truncate rounded-lg bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground">
        📁 {MUSIC_FOLDER} / <span className="text-foreground">{track.fileName}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <Button variant="neon" onClick={onPlay}>
          ▶️ Jwe (Offline)
        </Button>
        <Button variant="secondary" onClick={onFolder}>
          📁 Katab Music
        </Button>
      </div>
    </div>
  );
}
