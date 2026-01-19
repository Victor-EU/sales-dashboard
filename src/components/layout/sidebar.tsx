"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GitBranch, Briefcase, TrendingUp, ArrowRightLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Summary", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/deals", label: "Deals", icon: Briefcase },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/movements", label: "Movements", icon: ArrowRightLeft },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 h-screen w-[240px] border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">SD</span>
          </div>
          <span className="font-semibold">Sales Dashboard</span>
        </Link>
      </div>

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="flex flex-col gap-1 p-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <Separator className="my-4" />

          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Settings
          </p>
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Connected to HubSpot</p>
            <p className="mt-1 text-xs font-medium">Smallpdf / PDF Tools</p>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
