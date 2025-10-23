// src/components/GameHistoryDetail.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "@/components/ui/TeamLogo";
import {
  getHeadToHeadRecord,
  getSchedule,
  setSchedule,
  getUserById,
  getUsers,
  setUsers,
} from "@/utils/localStorage";
import { TeamSelector } from "@/components/ui/TeamSelector";
import { HeadToHeadRecord } from "@/types/user";
import { Game } from "@/types/yearRecord";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface GameHistoryDetailProps {
  userId: string | null;
  refreshTrigger?: number;
  onGameAdded?: () => void; // Optional callback to notify parent of changes
}

export const GameHistoryDetail: React.FC<GameHistoryDetailProps> = ({
  userId,
  refreshTrigger,
  onGameAdded,
}) => {
  const [record, setRecord] = useState<HeadToHeadRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingGame, setEditingGame] = useState<{
    year: number;
    week: number;
    originalOpponent: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    year: "",
    week: "",
    opponentTeam: "",
    score: "",
  });

  useEffect(() => {
    if (userId) {
      const h2hRecord = getHeadToHeadRecord(userId);
      setRecord(h2hRecord);
    } else {
      setRecord(null);
    }
  }, [userId, refreshTrigger]);

  const handleAddHistoricalGame = () => {
    if (!userId) return;

    // Validate inputs
    const year = parseInt(formData.year);
    const week = parseInt(formData.week);

    if (isNaN(year) || year < 1900 || year > 2100) {
      toast.error("Please enter a valid year");
      return;
    }

    if (isNaN(week) || week < 0 || week > 20) {
      toast.error("Please enter a valid week (0-20)");
      return;
    }

    if (!formData.opponentTeam) {
      toast.error("Please select an opponent team");
      return;
    }

    // Validate score format
    const scoreParts = formData.score.split("-").map((s) => s.trim());
    if (
      scoreParts.length !== 2 ||
      isNaN(parseInt(scoreParts[0])) ||
      isNaN(parseInt(scoreParts[1]))
    ) {
      toast.error("Please enter score in format: XX-XX");
      return;
    }

    const myScore = parseInt(scoreParts[0]);
    const oppScore = parseInt(scoreParts[1]);

    // Get user and team information
    const user = getUserById(userId);
    if (!user) {
      toast.error("User not found");
      return;
    }

    const opponentTeam = formData.opponentTeam;

    // Add team to user's team history for this year
    // NOTE: This is a fallback for historical data. Going forward, the system
    // automatically saves user-to-team mappings when "End Season" is clicked,
    // so this manual assignment won't be needed for future seasons.
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      toast.error("User not found");
      return;
    }

    // Check if user already has a team assignment for this year
    const existingAssignment = user.teamHistory.find(
      (th) => th.startYear <= year && (!th.endYear || th.endYear >= year)
    );

    if (existingAssignment && existingAssignment.teamId !== opponentTeam) {
      // User already has a different team for this year - show warning
      const confirmMessage = `${user.name} already controlled ${existingAssignment.teamId} in ${year}. This will add ${opponentTeam} to their team history for this year. Continue?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    // Add the team assignment if it doesn't exist
    if (!existingAssignment || existingAssignment.teamId !== opponentTeam) {
      // Add new team assignment for this specific year
      users[userIndex].teamHistory.push({
        teamId: opponentTeam,
        startYear: year,
        endYear: year, // Historical assignment for a specific year
      });

      // Sort team history by start year
      users[userIndex].teamHistory.sort((a, b) => a.startYear - b.startYear);

      // Save updated users
      setUsers(users);
    }

    // Calculate result
    let result: "Win" | "Loss" | "Tie";
    if (myScore > oppScore) {
      result = "Win";
    } else if (myScore < oppScore) {
      result = "Loss";
    } else {
      result = "Tie";
    }

    // Load existing schedule for that year
    const schedule = getSchedule(year);

    // If NOT in edit mode, check for duplicates
    if (!editMode) {
      const existingGame = schedule.find(
        (g) => g.week === week && g.opponentUserId === userId && g.opponent
      );
      if (existingGame) {
        toast.error(
          `Week ${week} already has a game against ${user.name}'s team (${existingGame.opponent})`
        );
        return; // STOP HERE - don't save anything
      }
    }

    // Create the new game entry
    const newGame: Game = {
      id: week,
      week: week,
      location: "vs",
      opponent: opponentTeam,
      result: result,
      score: formData.score,
      opponentUserId: userId,
    };

    // Update the schedule based on mode
    if (editMode && editingGame) {
      // EDIT MODE: Replace the specific game being edited
      const updatedSchedule = schedule.map((g) => {
        // Match by week and original opponent to find the exact game
        if (
          g.week === editingGame.week &&
          g.opponent === editingGame.originalOpponent
        ) {
          return newGame;
        }
        return g;
      });
      setSchedule(year, updatedSchedule);
    } else {
      // ADD MODE: Check if there's already a game against this team this week
      const existingGameIndex = schedule.findIndex(
        (g) => g.week === week && g.opponent === opponentTeam
      );

      if (existingGameIndex !== -1) {
        // Replace existing game against this team (update old game with userId)
        const updatedSchedule = [...schedule];
        updatedSchedule[existingGameIndex] = newGame;
        setSchedule(year, updatedSchedule);
      } else {
        // Check for empty slot
        const emptySlotIndex = schedule.findIndex(
          (g) => g.week === week && (!g.opponent || g.opponent === "")
        );

        if (emptySlotIndex !== -1) {
          // Replace existing empty game slot
          const updatedSchedule = [...schedule];
          updatedSchedule[emptySlotIndex] = newGame;
          setSchedule(year, updatedSchedule);
        } else {
          // Add new game to schedule
          const updatedSchedule = [...schedule, newGame];
          updatedSchedule.sort((a, b) => a.week - b.week);
          setSchedule(year, updatedSchedule);
        }
      }
    }

    // Show success message
    if (editMode) {
      toast.success(`Updated ${year} Week ${week} game vs ${opponentTeam}`);
    } else {
      toast.success(`Added ${year} Week ${week} game vs ${opponentTeam}`);
    }

    // Reset form and state
    setFormData({ year: "", week: "", opponentTeam: "", score: "" });
    setShowAddForm(false);
    setEditMode(false);
    setEditingGame(null);

    // Immediately refresh the record display
    const h2hRecord = getHeadToHeadRecord(userId);
    setRecord(h2hRecord);

    // Notify parent component to refresh other views
    if (onGameAdded) {
      onGameAdded();
    }
  };

  const handleEditGame = (game: {
    year: number;
    week: number;
    myTeam: string;
    theirTeam: string;
    myScore: number;
    theirScore: number;
  }) => {
    // Populate form with game data
    setFormData({
      year: game.year.toString(),
      week: game.week.toString(),
      opponentTeam: game.theirTeam,
      score: `${game.myScore}-${game.theirScore}`,
    });

    // Set edit mode
    setEditMode(true);
    setEditingGame({
      year: game.year,
      week: game.week,
      originalOpponent: game.theirTeam,
    });

    // Show form
    setShowAddForm(true);
  };

  const handleDeleteGame = (game: {
    year: number;
    week: number;
    theirTeam: string;
  }) => {
    if (!userId) return;

    const user = getUserById(userId);
    if (!user) return;

    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete this game from ${game.year} Week ${game.week} vs ${game.theirTeam}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Load schedule for that year
    const schedule = getSchedule(game.year);

    // Remove the game by filtering it out
    const updatedSchedule = schedule.filter(
      (g) => !(g.week === game.week && g.opponent === game.theirTeam)
    );

    // Save updated schedule
    setSchedule(game.year, updatedSchedule);

    // Show success message
    toast.success(
      `Deleted ${game.year} Week ${game.week} game vs ${game.theirTeam}`
    );

    // Immediately refresh the record display
    const h2hRecord = getHeadToHeadRecord(userId);
    setRecord(h2hRecord);

    // Notify parent component to refresh other views
    if (onGameAdded) {
      onGameAdded();
    }
  };

  const handleCancelEdit = () => {
    setFormData({ year: "", week: "", opponentTeam: "", score: "" });
    setShowAddForm(false);
    setEditMode(false);
    setEditingGame(null);
  };

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
    return `${record.wins}-${record.losses}${
      record.ties > 0 ? `-${record.ties}` : ""
    } (${winPct}% win rate)`;
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
        {/* Add Previous Matchups Button */}
        <div className="mb-4">
          <Button
            onClick={() => {
              if (showAddForm) {
                handleCancelEdit();
              } else {
                setShowAddForm(true);
              }
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {showAddForm ? (
              <>
                <X size={16} className="mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus size={16} className="mr-2" />
                Add Previous Matchups
              </>
            )}
          </Button>
        </div>

        {/* Add/Edit Historical Game Form */}
        {showAddForm && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-sm font-semibold mb-3">
              {editMode ? "Edit Historical Game" : "Add Historical Game"}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Year
                  </label>
                  <Input
                    type="number"
                    placeholder="2024"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Week
                  </label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={formData.week}
                    onChange={(e) =>
                      setFormData({ ...formData, week: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Opponent Team
                </label>
                <TeamSelector
                  value={formData.opponentTeam}
                  onValueChange={(value) =>
                    setFormData({ ...formData, opponentTeam: value })
                  }
                  placeholder="Select opponent team"
                  className="mt-1"
                  hideUsernames={true}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Score (Your Score - Their Score)
                </label>
                <Input
                  type="text"
                  placeholder="35-28"
                  value={formData.score}
                  onChange={(e) =>
                    setFormData({ ...formData, score: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAddHistoricalGame}
                  size="sm"
                  className="flex-1"
                >
                  {editMode ? "Update Game" : "Save Game"}
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Game History List */}
        {record.games.length > 0 ? (
          <div className="space-y-2">
            {record.games.map((game, index) => (
              <div
                key={`${game.year}-${game.week}-${index}`}
                className={`p-3 rounded-lg border-l-4 relative ${
                  game.result === "Win"
                    ? "border-l-green-500 bg-green-50 dark:bg-green-900/20"
                    : game.result === "Loss"
                    ? "border-l-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                }`}
              >
                {/* Edit and Delete Buttons */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    onClick={() => handleEditGame(game)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Edit game"
                  >
                    <Edit
                      size={14}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </Button>
                  <Button
                    onClick={() => handleDeleteGame(game)}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Delete game"
                  >
                    <Trash2
                      size={14}
                      className="text-red-600 dark:text-red-400"
                    />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-4 pr-16">
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
                      <span className="font-bold text-lg">
                        {game.theirScore}
                      </span>
                    </div>

                    {/* Their Team */}
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <TeamLogo teamName={game.theirTeam} size="sm" />
                      <span className="font-medium text-sm">
                        {game.theirTeam}
                      </span>
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
