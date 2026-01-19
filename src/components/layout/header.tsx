"use client";

import { usePathname } from "next/navigation";
import { Command, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { WeekSelector } from "@/components/dashboard/week-selector";
import { PeriodSelector } from "@/components/dashboard/period-selector";

const pageTitles: Record<string, string> = {
  "/": "Executive Summary",
  "/pipeline": "Pipeline View",
  "/deals": "Deal List",
  "/trends": "Historical Trends",
  "/movements": "Stage Movements",
  "/settings": "Settings",
};

interface HeaderProps {
  onOpenCommand?: () => void;
}

export function Header({ onOpenCommand }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-xl font-semibold">{title}</h1>

      <div className="flex items-center gap-3">
        <PeriodSelector />
        <div className="h-6 w-px bg-border" />
        <WeekSelector />

        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 md:flex"
          onClick={onOpenCommand}
        >
          <Command className="h-3.5 w-3.5" />
          <span className="text-xs text-muted-foreground">Search</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
