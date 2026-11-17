import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerListener } from "@/lib/listeners.functions";
import { useApp } from "@/lib/app-store";
import heroImg from "@/assets/welcome-headphones.jpg";
import { Logo } from "./Logo";

export function WelcomeScreen() {
  const { setListener } = useApp();
  const register = useServerFn(registerListener);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Tanpri mete non ou.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Imèl la pa bon.");
    setBusy(true);
    try {
      const row = await register({ data: { name: name.trim(), email: email.trim() } });
      setListener(row);
    } catch {
      setError("Nou pa rive anrejistre ou. Eseye ankò.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden">
      <img
        src={heroImg}
        alt=""
        width={1024}
        height={1280}
        className="absolute inset-0 h-[62%] w-full object-cover"
      />
      <div className="absolute inset-x-0 top-[30%] h-[34%] bg-fade-up" />
      <div className="relative z-10 p-6">
        <Logo />
      </div>
      <div className="relative z-10 mt-auto space-y-6 bg-background px-6 pb-10 pt-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Byenveni</p>
          <h1 className="mt-2 text-3xl font-black leading-tight">
            Tout mizik ou renmen, <span className="neon-text">yon sèl kote.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Mete non ak imèl ou pou kòmanse koute Konpa, Rabòday, Amapiano ak plis ankò.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Non</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Egz: Wesley"
              className="h-12 rounded-xl bg-surface"
              maxLength={60}
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Imèl</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ou@egzanp.com"
              className="h-12 rounded-xl bg-surface"
              maxLength={120}
              autoComplete="email"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="neon" size="xl" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Antre
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}
