import { FolderOpen, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSize, getAudio, type VaultTrack } from "@/lib/audio-vault";
import { MUSIC_FOLDER } from "@/lib/mp3-retry";
import { cn } from "@/lib/utils";

async function exportToDevice(track: VaultTrack) {
  const blob = await getAudio(track.id);
  if (!blob) {
    toast.error("Fichye a pa jwenn.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = track.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast.success("MP3 a ap sove sou telefòn ou", { description: track.fileName });
}

export function MusicFolderDialog({
  open,
  onOpenChange,
  tracks,
  highlightId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tracks: VaultTrack[];
  highlightId: string | null;
}) {
  const total = tracks.reduce((a, t) => a + t.size, 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto overflow-x-hidden rounded-3xl bg-card sm:max-w-md [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FolderOpen className="text-primary" /> Katab Music
          </DialogTitle>
          <DialogDescription className="truncate font-mono text-xs">📁 {MUSIC_FOLDER}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {tracks.length} fichye • {formatSize(total)}. Peze sove pou mete yon MP3 nan fichye telefòn ou.
        </p>
        <div className="space-y-2">
          {tracks.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-surface p-2.5",
                t.id === highlightId ? "border-primary" : "border-border",
              )}
            >
              <span className="text-lg">🎵</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.fileName}</div>
                <div className="text-[11px] text-muted-foreground">audio (MP3) • {formatSize(t.size)}</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void exportToDevice(t)}>
                <Save /> Sove
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
