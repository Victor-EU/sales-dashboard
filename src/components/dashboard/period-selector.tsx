"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWeek } from "@/contexts/week-context";

export function PeriodSelector() {
  const { selectedPeriod, setSelectedPeriod, periodOptions } = useWeek();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering Select on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return placeholder with same dimensions to prevent layout shift
    return (
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Period:</span>
        <div className="h-9 w-[140px] rounded-md border border-input bg-transparent" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Period:</span>
      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
