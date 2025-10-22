// src/components/GameHistoryDetail.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { getHeadToHeadRecord } from "@/utils/localStorage";
import { HeadToHeadRecord, HeadToHeadGame } from "@/types/user";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface GameHistoryDetailProps {
  userId: string | null;
  refreshTrigger?: number;
}

export const GameHistoryDetail: React.FC<GameHistoryDetailProps> = ({
  userId,
  refreshTrigger,
}) => {
  const [record, setRecord] = useState<HeadToHeadRecord | null>(null);

  useEffect(() => {
    if (userId) {
      const h2hRecord = getHeadToHeadRecord(userId);
      setRecord(h2hRecord);
    } else {
      setRecord(null);
    }
  }, [userId, refreshTrigger]);

  if (!userId || !record) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full min-h-[400px]">
          <p className="text-muted-foreground text-center">
            Select a user from the list to view game history
          </p>
        </CardContent>
      </Card>
    );
  }

  const getLocationText = (location: "@" | "vs" | "neutral"): string => {
    switch (location) {
      case "@":
        return "@";
      case "vs":
        return "vs";
      case "neutral":
        return "vs"; // Neutral site games shown as "vs"
      default:
        return "vs";
    }
  };

  const getResultBadge = (result: "Win" | "Loss" | "Tie") => {
    const colors = {
      Win: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      Loss: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      Tie: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${colors[result]}`}
      >
        {result.toUpperCase()}
      </span>
    );
  };

  const getRecordSummary = () => {
    const total = record.wins + record.losses + record.ties;
    if (total === 0) return "No games played";
    
    const winPct = ((record.wins / total) * 100).toFixed(1);
    return `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ""} (${winPct}% win rate)`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>History vs {record.userName}</span>
          <div className="text-sm font-normal text-muted-foreground">
            {getRecordSummary()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {record.games.length > 0 ? (
          <div className="space-y-2">
            {record.games.map((game, index) => (
              <div
                key={`${game.year}-${game.week}-${index}`}
                className={`p-3 rounded-lg border-l-4 ${
                  game.result === "Win"
                    ? "border-l-green-500 bg-green-50 dark:bg-green-900/20"
                    : game.result === "Loss"
                    ? "border-l-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Year and Week */}
                  <div className="text-sm font-medium text-muted-foreground min-w-[80px]">
                    {game.year} • Wk {game.week}
                  </div>

                  {/* Teams and Score */}
                  <div className="flex-1 flex items-center justify-center gap-3">
                    {/* My Team */}
                    <div className="flex items-center gap-2 min-w-[140px] justify-end">
                      <span className="font-medium text-sm">{game.myTeam}</span>
                      <TeamLogo teamName={game.myTeam} size="sm" />
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-2 min-w-[100px] justify-center">
                      <span className="font-bold text-lg">{game.myScore}</span>
                      <span className="text-muted-foreground font-medium">
                        {getLocationText(game.location)}
                      </span>
                      <span className="font-bold text-lg">{game.theirScore}</span>
                    </div>

                    {/* Their Team */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <TeamLogo teamName={game.theirTeam} size="sm" />
                      <span className="font-medium text-sm">{game.theirTeam}</span>
                    </div>
                  </div>

                  {/* Result Badge */}
                  <div className="min-w-[60px] flex justify-end">
                    {getResultBadge(game.result)}
                  </div>
                </div>

                {/* Margin of Victory/Defeat */}
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {game.result === "Win" ? (
                    <span className="flex items-center justify-center gap-1">
                      <TrendingUp size={12} className="text-green-600" />
                      Won by {game.myScore - game.theirScore}
                    </span>
                  ) : game.result === "Loss" ? (
                    <span className="flex items-center justify-center gap-1">
                      <TrendingDown size={12} className="text-red-600" />
                      Lost by {game.theirScore - game.myScore}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <Minus size={12} className="text-yellow-600" />
                      Tied
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No games played against {record.userName} yet
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Games will appear here once you play against their team
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

