import { useState } from "react";
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
