import { Link } from "@tanstack/react-router";
import { Download, Home, ListMusic, ShieldCheck } from "lucide-react";

const items = [
  { to: "/", label: "Akèy", icon: Home },
  { to: "/telechajman", label: "Telechajman", icon: Download },
  { to: "/playlist", label: "Playlist", icon: ListMusic },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

export function BottomNav() {
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border">
      <div className="mx-auto grid max-w-md grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="group flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors data-[status=active]:text-primary"
          >
            <span className="grid h-7 w-12 place-items-center rounded-full transition-all group-data-[status=active]:bg-neon-soft group-data-[status=active]:shadow-neon">
              <Icon className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
