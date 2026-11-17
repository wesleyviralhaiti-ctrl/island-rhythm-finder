import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Lock, LogOut, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/wesley/Logo";
import { adminDashboard, adminLogin, adminReviewPayment } from "@/lib/admin.functions";
import { isPremiumActive } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — WESLEY MUSIC DOWNLOAD" },
      { name: "description", content: "Espas admin pou verifye peman Natcash ak jere itilizatè yo." },
      { property: "og:title", content: "Admin — WESLEY MUSIC DOWNLOAD" },
      { property: "og:description", content: "Espas admin pou verifye peman Natcash ak jere itilizatè yo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const KEY = "wmd.admin";

function AdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  useEffect(() => {
    setPasscode(window.sessionStorage.getItem(KEY));
  }, []);

  if (!passcode) {
    return (
      <AdminLogin
        onOk={(p) => {
          window.sessionStorage.setItem(KEY, p);
          setPasscode(p);
        }}
      />
    );
  }
  return (
    <Dashboard
      passcode={passcode}
      onLogout={() => {
        window.sessionStorage.removeItem(KEY);
        setPasscode(null);
      }}
    />
  );
}

function AdminLogin({ onOk }: { onOk: (p: string) => void }) {
  const login = useServerFn(adminLogin);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-sm flex-col justify-center px-6">
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-3xl border border-primary/40 bg-neon-soft shadow-neon">
        <Lock className="size-7 text-primary" />
      </div>
      <h1 className="text-center text-2xl font-black">Espas Admin</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">Antre kòd sekrè a pou kontinye.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          try {
            const r = await login({ data: { passcode: value } });
            if (r.ok) onOk(value);
            else setError("Kòd la pa bon.");
          } catch {
            setError("Gen yon pwoblèm. Eseye ankò.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Kòd admin"
          className="h-12 rounded-xl bg-surface text-center tracking-widest"
          autoFocus
        />
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="neon" size="xl" className="w-full" disabled={busy || !value}>
          {busy && <Loader2 className="animate-spin" />} Antre
        </Button>
      </form>
    </main>
  );
}

function Dashboard({ passcode, onLogout }: { passcode: string; onLogout: () => void }) {
  const fetchDash = useServerFn(adminDashboard);
  const review = useServerFn(adminReviewPayment);
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchDash({ data: { passcode } }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (isError) onLogout();
  }, [isError, onLogout]);

  async function decide(paymentId: string, decision: "approved" | "rejected") {
    setBusyId(paymentId);
    try {
      await review({ data: { passcode, paymentId, decision } });
      toast.success(decision === "approved" ? "Peman apwouve — kont lan aktive" : "Peman rejte");
      await qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch {
      toast.error("Aksyon an pa pase.");
    } finally {
      setBusyId(null);
    }
  }

  const payments = data?.payments ?? [];
  const listeners = data?.listeners ?? [];
  const pending = payments.filter((p) => p.status === "pending");
  const revenue = payments.filter((p) => p.status === "approved").reduce((a, p) => a + Number(p.amount), 0);
  const premiumCount = listeners.filter((l) =>
    isPremiumActive({ isLifetime: l.is_lifetime, premiumUntil: l.premium_until }),
  ).length;

  return (
    <>
      <header className="glass sticky top-0 z-20 border-b border-border/60">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Logo compact />
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut /> Soti
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-5">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <ShieldCheck className="text-primary" /> Admin
        </h1>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="An atant" value={pending.length} highlight={pending.length > 0} />
          <Stat label="Premium" value={premiumCount} />
          <Stat label="Revni" value={`$${revenue}`} />
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="pending" className="mt-6">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-surface">
              <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                An atant
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Tout peman
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Itilizatè
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-3">
              {pending.length === 0 && <Empty icon={Wallet} text="Pa gen peman k ap tann." />}
              {pending.map((p) => (
                <PaymentCard key={p.id} p={p} busy={busyId === p.id} onDecide={decide} />
              ))}
            </TabsContent>

            <TabsContent value="all" className="mt-4 space-y-3">
              {payments.length === 0 && <Empty icon={Wallet} text="Poko gen peman." />}
              {payments.map((p) => (
                <PaymentCard key={p.id} p={p} busy={busyId === p.id} onDecide={decide} />
              ))}
            </TabsContent>

            <TabsContent value="users" className="mt-4 space-y-2">
              {listeners.length === 0 && <Empty icon={Users} text="Poko gen itilizatè." />}
              {listeners.map((l) => {
                const active = isPremiumActive({ isLifetime: l.is_lifetime, premiumUntil: l.premium_until });
                return (
                  <div key={l.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.email}</div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {l.is_lifetime
                        ? "LAVI"
                        : active && l.premium_until
                          ? `jiska ${new Date(l.premium_until).toLocaleDateString("fr-HT")}`
                          : "GRATIS"}
                    </span>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-surface p-3", highlight ? "border-primary shadow-neon" : "border-border")}>
      <div className="font-display text-xl font-black">{value}</div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Wallet; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-2 size-7 text-primary" />
      {text}
    </div>
  );
}

type PaymentRow = {
  id: string;
  plan: string;
  amount: number;
  region: string;
  phone: string;
  reference: string;
  status: string;
  created_at: string;
  listener: { name: string; email: string } | null;
};

function PaymentCard({
  p,
  busy,
  onDecide,
}: {
  p: PaymentRow;
  busy: boolean;
  onDecide: (id: string, d: "approved" | "rejected") => void;
}) {
  return (
    <div className={cn("rounded-2xl border bg-surface p-4", p.status === "pending" ? "border-primary/40" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-bold">{p.listener?.name ?? "—"}</div>
          <div className="truncate text-xs text-muted-foreground">{p.listener?.email}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-black neon-text">${Number(p.amount)}</div>
          <div className="text-[11px] text-muted-foreground">{p.plan === "lifetime" ? "Pou tout lavi" : "Chak mwa"}</div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Kote</dt>
        <dd className="text-right font-semibold">{p.region === "ayiti" ? "Moun Ayiti" : "Moun Lòt Bò"}</dd>
        <dt className="text-muted-foreground">Telefòn</dt>
        <dd className="text-right font-semibold">{p.phone}</dd>
        <dt className="text-muted-foreground">{p.region === "ayiti" ? "Transcode" : "Transaction ID"}</dt>
        <dd className="break-all text-right font-mono font-semibold">{p.reference}</dd>
        <dt className="text-muted-foreground">Dat</dt>
        <dd className="text-right">{new Date(p.created_at).toLocaleString("fr-HT")}</dd>
      </dl>
      {p.status === "pending" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => onDecide(p.id, "rejected")}>
            <X /> Rejte
          </Button>
          <Button variant="neon" disabled={busy} onClick={() => onDecide(p.id, "approved")}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />} Apwouve
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "mt-3 rounded-lg px-3 py-1.5 text-center text-xs font-bold",
            p.status === "approved" ? "bg-neon-soft text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {p.status === "approved" ? "APWOUVE" : "REJTE"}
        </div>
      )}
    </div>
  );
}
