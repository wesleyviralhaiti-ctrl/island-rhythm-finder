import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-store";
import { Logo } from "./Logo";

export function PageHeader() {
  const { isPremium, status, setPaymentOpen } = useApp();
  return (
    <header className="glass sticky top-0 z-20 border-b border-border/60">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Logo />
        {isPremium ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-neon-soft px-3 py-1.5 text-xs font-bold text-primary">
            <Crown className="size-3.5" /> PREMIUM
          </span>
        ) : (
          <Button variant="neon" size="sm" className="rounded-full" onClick={() => setPaymentOpen(true)}>
            <Crown /> {status?.pending ? "An atant" : "Vin Premium"}
          </Button>
        )}
      </div>
    </header>
  );
}
