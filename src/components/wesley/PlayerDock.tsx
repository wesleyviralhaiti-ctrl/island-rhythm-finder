import { useEffect, useState } from "react";
import { getAudio } from "@/lib/audio-vault";
import { ChevronDown, ChevronUp, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { cn } from "@/lib/utils";
import { EqBars } from "./SongRow";

export function PlayerDock() {
  const { current, next, prev, stop, queue } = useApp();
  const [expanded, setExpanded] = useState(true);
  if (!current) return null;

  return (
    <div className="fixed inset-x-0 bottom-[68px] z-30 px-3">
      <div className="glass mx-auto max-w-md overflow-hidden rounded-2xl border border-primary/30 shadow-neon">
        <div className={cn("flex gap-3 p-2", expanded ? "flex-col" : "items-center")}>
          {current.offline ? (
            <OfflineAudio id={current.id} thumbnail={current.thumbnail} expanded={expanded} onEnded={next} />
          ) : (
          <div
            className={cn(
              "overflow-hidden rounded-xl bg-background",
              expanded ? "aspect-video w-full" : "h-[68px] w-[120px] shrink-0",
            )}
          >
            <iframe
              key={current.id}
              src={`https://www.youtube.com/embed/${current.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
              title={current.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          </div>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <EqBars />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{current.title}</div>
              <div className="truncate text-xs text-muted-foreground">{current.channel}</div>
            </div>
            {queue.length > 1 && (
              <>
                <Button variant="ghost" size="icon" onClick={prev} aria-label="Anvan">
                  <SkipBack />
                </Button>
                <Button variant="ghost" size="icon" onClick={next} aria-label="Apre">
                  <SkipForward />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Redwi" : "Agrandi"}
            >
              {expanded ? <ChevronDown /> : <ChevronUp />}
            </Button>
            <Button variant="ghost" size="icon" onClick={stop} aria-label="Fèmen">
              <X />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfflineAudio({
  id,
  thumbnail,
  expanded,
  onEnded,
}: {
  id: string;
  thumbnail: string;
  expanded: boolean;
  onEnded: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    setSrc(null);
    setMissing(false);
    getAudio(id)
      .then((blob) => {
        if (!blob) return setMissing(true);
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => setMissing(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  return (
    <div className={cn("flex gap-3", expanded ? "flex-col" : "w-[200px] shrink-0 items-center")}>
      {expanded && thumbnail && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <img src={thumbnail} alt="" className="size-full object-cover" />
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">
            OFFLINE • MP3
          </span>
        </div>
      )}
      {missing ? (
        <p className="text-xs text-destructive">Fichye MP3 a pa jwenn sou aparèy la.</p>
      ) : src ? (
        <audio key={src} src={src} autoPlay controls onEnded={onEnded} className="h-10 w-full [color-scheme:dark]" />
      ) : (
        <div className="h-10 w-full animate-pulse rounded-full bg-surface-2" />
      )}
    </div>
  );
}
