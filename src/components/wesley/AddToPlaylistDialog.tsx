import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApp } from "@/lib/app-store";

export function AddToPlaylistDialog() {
  const { playlistTarget, setPlaylistTarget, playlists, createPlaylist, addToPlaylist } = useApp();
  const [name, setName] = useState("");

  function add(pid: string, pname: string) {
    if (!playlistTarget) return;
    addToPlaylist(pid, playlistTarget);
    toast.success(`Ajoute nan "${pname}"`);
    setPlaylistTarget(null);
  }

  return (
    <Dialog open={!!playlistTarget} onOpenChange={(o) => !o && setPlaylistTarget(null)}>
      <DialogContent className="rounded-3xl bg-card sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Mete nan playlist</DialogTitle>
          <DialogDescription className="line-clamp-1">{playlistTarget?.title}</DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            const id = createPlaylist(n);
            setName("");
            add(id, n);
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nouvo playlist"
            className="rounded-xl bg-surface"
            maxLength={40}
          />
          <Button type="submit" size="icon" aria-label="Kreye">
            <Plus />
          </Button>
        </form>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {playlists.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Ou poko gen playlist.</p>
          )}
          {playlists.map((p) => {
            const has = !!playlistTarget && p.songs.some((s) => s.id === playlistTarget.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={has}
                onClick={() => add(p.id, p.name)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface disabled:opacity-60"
              >
                <span className="font-semibold">{p.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {has && <Check className="size-3.5 text-primary" />}
                  {p.songs.length} mizik
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
