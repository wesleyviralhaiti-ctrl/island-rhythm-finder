import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock, Copy, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/lib/app-store";
import { submitPayment } from "@/lib/listeners.functions";
import { NATCASH_NUMBER, PLANS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Region = "ayiti" | "lot_bo";

export function PaymentDialog() {
  const { paymentOpen, setPaymentOpen, listener, status, isPremium, refreshStatus } = useApp();
  const submit = useServerFn(submitPayment);
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [region, setRegion] = useState<Region>("ayiti");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refLabel = region === "ayiti" ? "Transcode" : "Transaction ID";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listener) return;
    setError(null);
    if (phone.trim().length < 6) return setError("Mete yon nimewo telefòn ki bon.");
    if (reference.trim().length < 3) return setError(`Mete ${refLabel} la.`);
    setBusy(true);
    try {
      const res = await submit({
        data: { listenerId: listener.id, plan, region, phone: phone.trim(), reference: reference.trim() },
      });
      if (!res.ok) return setError(res.error);
      toast.success("Peman an voye!", { description: "N ap verifye l epi aktive kont ou byento." });
      setPhone("");
      setReference("");
      refreshStatus();
    } catch {
      setError("Nou pa rive voye peman an. Eseye ankò.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl border-primary/30 bg-card sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-2xl bg-neon-gradient text-primary-foreground shadow-neon-lg">
            <Crown className="size-6" />
          </div>
          <DialogTitle className="text-center font-display text-xl">Vin Premium</DialogTitle>
          <DialogDescription className="text-center">
            Debloke Telechajman yo epi sove tout mizik ou renmen.
          </DialogDescription>
        </DialogHeader>

        {isPremium ? (
          <div className="rounded-2xl border border-primary/40 bg-neon-soft p-4 text-center text-sm">
            <Check className="mx-auto mb-2 size-6 text-primary" />
            Kont ou deja Premium{status?.isLifetime ? " pou tout lavi" : ""}. Mèsi!
          </div>
        ) : status?.pending ? (
          <div className="rounded-2xl border border-border bg-surface p-4 text-center text-sm">
            <Clock className="mx-auto mb-2 size-6 text-primary" />
            <p className="font-semibold">Peman ou an ap tann verifikasyon.</p>
            <p className="mt-1 text-muted-foreground">
              Plan: {PLANS[status.pending.plan as PlanId]?.label ?? status.pending.plan}. N ap aktive kont ou depi
              admin lan konfime l.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={cn(
                    "relative rounded-2xl border p-4 text-left transition-all",
                    plan === p.id ? "border-primary bg-neon-soft shadow-neon" : "border-border bg-surface",
                  )}
                >
                  {p.id === "lifetime" && (
                    <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      PI BON
                    </span>
                  )}
                  <div className="text-xs font-semibold text-muted-foreground">{p.label}</div>
                  <div className="mt-1 font-display text-2xl font-black">
                    ${p.price}
                    <span className="text-xs font-semibold text-muted-foreground">
                      {p.id === "monthly" ? "/mwa" : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-primary/50 bg-surface p-4">
              <p className="text-xs text-muted-foreground">
                Voye <span className="font-bold text-foreground">${PLANS[plan].price}</span> sou Natcash:
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="font-display text-lg font-black neon-text">{NATCASH_NUMBER}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void navigator.clipboard?.writeText(NATCASH_NUMBER.replace(/\s/g, ""));
                    toast.success("Nimewo a kopye");
                  }}
                >
                  <Copy /> Kopye
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Apre sa, ranpli enfòmasyon peman an anba a.</p>
            </div>

            <Tabs value={region} onValueChange={(v) => setRegion(v as Region)}>
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-surface">
                <TabsTrigger value="ayiti" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Moun Ayiti
                </TabsTrigger>
                <TabsTrigger value="lot_bo" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Moun Lòt Bò
                </TabsTrigger>
              </TabsList>
              {(["ayiti", "lot_bo"] as Region[]).map((r) => (
                <TabsContent key={r} value={r} className="mt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`phone-${r}`}>Telefòn</Label>
                    <Input
                      id={`phone-${r}`}
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={r === "ayiti" ? "+509 ..." : "+1 ..."}
                      className="h-11 rounded-xl bg-surface"
                      maxLength={25}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`ref-${r}`}>{r === "ayiti" ? "Transcode" : "Transaction ID"}</Label>
                    <Input
                      id={`ref-${r}`}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder={r === "ayiti" ? "Kòd tranzaksyon Natcash la" : "ID tranzaksyon an"}
                      className="h-11 rounded-xl bg-surface"
                      maxLength={60}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="neon" size="xl" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Voye peman ${PLANS[plan].price}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
