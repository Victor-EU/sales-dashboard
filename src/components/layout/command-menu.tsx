"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Briefcase,
  TrendingUp,
  ArrowRightLeft,
  Search,
  Filter,
  Download,
  Moon,
  Sun,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "@/hooks/use-theme";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const runCommand = (command: () => void) => {
    onOpenChange(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Go to Summary
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/pipeline"))}>
            <GitBranch className="mr-2 h-4 w-4" />
            Go to Pipeline
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/deals"))}>
            <Briefcase className="mr-2 h-4 w-4" />
            Go to Deals
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/trends"))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Go to Trends
            <CommandShortcut>G T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/movements"))}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Go to Movements
            <CommandShortcut>G M</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Search className="mr-2 h-4 w-4" />
            Search deals...
            <CommandShortcut>/D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Filter className="mr-2 h-4 w-4" />
            Filter by owner
            <CommandShortcut>F O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Download className="mr-2 h-4 w-4" />
            Export current view
            <CommandShortcut>E X</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(toggleTheme)}>
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Toggle {theme === "dark" ? "light" : "dark"} mode
            <CommandShortcut>T D</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Filters">
          <CommandItem onSelect={() => runCommand(() => router.push("/deals?health=CRITICAL"))}>
            <span className="mr-2 text-red-500">●</span>
            Show critical deals
            <CommandShortcut>F C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/deals?owner=me"))}>
            <span className="mr-2">👤</span>
            Show my deals
            <CommandShortcut>F M</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/deals?closing=7"))}>
            <span className="mr-2">📅</span>
            Closing this week
            <CommandShortcut>F W</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
