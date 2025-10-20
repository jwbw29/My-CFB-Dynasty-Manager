"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Outcome = "win" | "loss" | "tie" | "neutral";

const getOutcome = (result?: string | null): Outcome => {
  if (!result) return "neutral";
  const normalized = result.toLowerCase();
  if (normalized.includes("win")) return "win";
  if (normalized.includes("loss")) return "loss";
  if (normalized.includes("tie")) return "tie";
  return "neutral";
};

const outcomeClasses: Record<Outcome, string> = {
  win: "border-green-300 bg-green-50 dark:bg-green-900/20",
  loss: "border-red-300 bg-red-50 dark:bg-red-900/20",
  tie: "border-muted bg-muted/30",
  neutral: "border-border bg-muted/40 dark:bg-muted/20",
};

const badgeClasses: Record<Outcome, string> = {
  win: "bg-green-500 hover:bg-green-500 text-white",
  loss: "bg-red-500 hover:bg-red-500 text-white",
  tie: "bg-muted-foreground text-background",
  neutral: "bg-primary/10 text-primary",
};

interface MatchupRowProps {
  weekLabel: string;
  leading: React.ReactNode;
  scoreLabel?: string;
  resultLabel?: string;
  trailingContent?: React.ReactNode;
  notes?: React.ReactNode;
  className?: string;
}

export const MatchupRow: React.FC<MatchupRowProps> = ({
  weekLabel,
  leading,
  scoreLabel,
  resultLabel,
  trailingContent,
  notes,
  className,
}) => {
  const outcome = getOutcome(resultLabel);

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 transition",
        "flex flex-col gap-3",
        outcomeClasses[outcome],
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Badge
            variant="secondary"
            className="uppercase tracking-wide text-xs sm:text-sm"
          >
            {weekLabel}
          </Badge>
          {leading}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {scoreLabel && (
            <span className="text-base sm:text-lg font-semibold">
              {scoreLabel}
            </span>
          )}
          {resultLabel && (
            <Badge className={cn("px-3 py-1", badgeClasses[outcome])}>
              {resultLabel}
            </Badge>
          )}
          {trailingContent}
        </div>
      </div>

      {notes && (
        <div className="text-xs sm:text-sm text-muted-foreground border-t pt-2">
          {notes}
        </div>
      )}
    </div>
  );
};
