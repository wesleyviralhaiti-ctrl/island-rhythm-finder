import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useApp } from "@/lib/app-store";
import { AddToPlaylistDialog } from "./AddToPlaylistDialog";
import { BottomNav } from "./BottomNav";
import { Logo } from "./Logo";
import { PaymentDialog } from "./PaymentDialog";
import { PlayerDock } from "./PlayerDock";
import { WelcomeScreen } from "./WelcomeScreen";

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, listener, current } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="animate-pulse">
          <Logo />
        </div>
      </div>
    );
  }

  if (!listener && !isAdmin) return <WelcomeScreen />;

  return (
    <div className="min-h-dvh">
      <div className={current ? "pb-[420px]" : "pb-24"}>{children}</div>
      {listener && <PlayerDock />}
      <BottomNav />
      {listener && (
        <>
          <PaymentDialog />
          <AddToPlaylistDialog />
        </>
      )}
    </div>
  );
}
