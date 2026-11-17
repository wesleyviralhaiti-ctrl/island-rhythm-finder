import { Headphones } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-neon-gradient text-primary-foreground shadow-neon">
        <Headphones className="size-5" strokeWidth={2.5} />
      </div>
      <div className="leading-none">
        <div className="font-display text-sm font-black tracking-tight text-foreground">
          WESLEY <span className="neon-text">MUSIC</span>
        </div>
        {!compact && (
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Download
          </div>
        )}
      </div>
    </div>
  );
}
