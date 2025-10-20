"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils";
import { MatchupRow } from "@/components/ui/matchup-row";
import { fbsTeams } from "@/utils/fbsTeams";
import {
  getCoachProfile,
  getCurrentYear,
} from "@/utils/localStorage";
import { useOpponents } from "@/hooks/useOpponents";
import { OpponentWithDetails } from "@/hooks/useOpponents";
import { toast } from "react-hot-toast";
import {
  History,
  Plus,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";

const getRecordLabel = (record: OpponentWithDetails["record"]) => {
  if (!record.wins && !record.losses && !record.ties) {
    return "0-0";
  }
  const base = `${record.wins}-${record.losses}`;
  return record.ties ? `${base}-${record.ties}` : base;
};

const OpponentManagerPage: React.FC = () => {
  const {
    opponentsWithDetails,
    opponents,
    controlledTeams,
    isInitialized,
    addOpponent,
    removeOpponent,
    setOpponentDefaultTeam,
    setOpponentTeamForSeason,
  } = useOpponents();

  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(
    null
  );
  const [newOpponentName, setNewOpponentName] = useState("");
  const [newOpponentTeam, setNewOpponentTeam] = useState<string>("__none__");
  const [teamHistorySeason, setTeamHistorySeason] = useState(
    String(getCurrentYear())
  );
  const [teamHistoryTeam, setTeamHistoryTeam] = useState("__none__");
  const coachProfile = useMemo(() => getCoachProfile(), []);

  useEffect(() => {
    if (!opponentsWithDetails.length) {
      setSelectedOpponentId(null);
      return;
    }

    if (
      !selectedOpponentId ||
      !opponentsWithDetails.find((o) => o.id === selectedOpponentId)
    ) {
      setSelectedOpponentId(opponentsWithDetails[0]?.id ?? null);
    }
  }, [opponentsWithDetails, selectedOpponentId]);

  const assignedTeams = useMemo(
    () => new Set(controlledTeams.filter(Boolean)),
    [controlledTeams]
  );

  const availableTeamsForNewOpponent = useMemo(
    () =>
      fbsTeams
        .filter((team) => !assignedTeams.has(team.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [assignedTeams]
  );

  const selectedOpponent = useMemo(
    () =>
      opponentsWithDetails.find((opponent) => opponent.id === selectedOpponentId) ||
      null,
    [opponentsWithDetails, selectedOpponentId]
  );

  const availableTeamsForOpponent = useMemo(() => {
    if (!selectedOpponent) return availableTeamsForNewOpponent;
    return fbsTeams
      .filter(
        (team) =>
          !assignedTeams.has(team.name) ||
          team.name === selectedOpponent.defaultTeamId
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedTeams, selectedOpponent, availableTeamsForNewOpponent]);

  const groupedMatchups = useMemo(() => {
    if (!selectedOpponent) return [];
    const groups = new Map<number, typeof selectedOpponent.matchups>();
    selectedOpponent.matchups.forEach((matchup) => {
      const list = groups.get(matchup.season) || [];
      list.push(matchup);
      groups.set(matchup.season, list);
    });

    return Array.from(groups.entries())
      .map(([season, matchups]) => ({
        season,
        matchups: [...matchups].sort((a, b) =>
          (a.week ?? 0) - (b.week ?? 0)
        ),
      }))
      .sort((a, b) => b.season - a.season);
  }, [selectedOpponent]);

  const handleCreateOpponent = () => {
    const trimmedName = newOpponentName.trim();
    if (!trimmedName) {
      toast.error("Enter a user name before saving.");
      return;
    }

    const nameAlreadyUsed = opponents.some(
      (opponent) =>
        opponent.displayName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameAlreadyUsed) {
      toast.error("Another opponent already uses that name.");
      return;
    }

    const selectedTeam =
      newOpponentTeam === "__none__" ? null : newOpponentTeam;

    if (selectedTeam && assignedTeams.has(selectedTeam)) {
      toast.error("That team is already assigned to another user.");
      return;
    }

    addOpponent(trimmedName, selectedTeam || undefined);
    toast.success("Opponent saved");
    setNewOpponentName("");
    setNewOpponentTeam("__none__");
  };

  const handleUpdateDefaultTeam = (teamId: string) => {
    if (!selectedOpponent) return;
    if (teamId !== "__none__" && assignedTeams.has(teamId)) {
      toast.error("That team is already assigned to another user.");
      return;
    }

    setOpponentDefaultTeam(
      selectedOpponent.id,
      teamId === "__none__" ? null : teamId
    );
    toast.success("Default team updated");
  };

  const handleAddTeamHistory = () => {
    if (!selectedOpponent) return;
    const seasonNumber = parseInt(teamHistorySeason, 10);
    if (Number.isNaN(seasonNumber) || seasonNumber < 1950) {
      toast.error("Enter a valid season year.");
      return;
    }

    const selectedTeam =
      teamHistoryTeam === "__none__" ? null : teamHistoryTeam;
    if (!selectedTeam) {
      toast.error("Select a team to associate with that season.");
      return;
    }

    if (
      selectedTeam !== selectedOpponent.defaultTeamId &&
      assignedTeams.has(selectedTeam)
    ) {
      toast.error("That team is already assigned to another user.");
      return;
    }

    setOpponentTeamForSeason(selectedOpponent.id, seasonNumber, selectedTeam);
    toast.success(`Season ${seasonNumber} assignment saved`);
    setTeamHistorySeason(String(getCurrentYear()));
    setTeamHistoryTeam("__none__");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Opponent History</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track the users in your dynasty, assign the teams they&apos;ve
          controlled each season, and capture head-to-head results so you always
          know the series record.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px,minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Opponent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  User name
                </label>
                <Input
                  placeholder="e.g. Justin"
                  value={newOpponentName}
                  onChange={(event) => setNewOpponentName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Current team
                </label>
                <Select
                  value={newOpponentTeam}
                  onValueChange={setNewOpponentTeam}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none__">No team</SelectItem>
                    {availableTeamsForNewOpponent.map((team) => (
                      <SelectItem key={team.name} value={team.name}>
                        <div className="flex items-center gap-2">
                          <TeamLogo teamName={team.name} size="xs" />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreateOpponent}>
                <Plus className="w-4 h-4 mr-2" />
                Save Opponent
              </Button>
            </CardContent>
          </Card>

          <Card className="h-[520px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Opponents
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 px-4 pb-4">
                  {!isInitialized && (
                    <div className="text-sm text-muted-foreground py-8 text-center">
                      Loading opponents…
                    </div>
                  )}
                  {isInitialized && opponentsWithDetails.length === 0 && (
                    <div className="text-sm text-muted-foreground py-8 text-center">
                      Add an opponent to start tracking matchups.
                    </div>
                  )}
                  {opponentsWithDetails.map((opponent) => {
                    const isActive = opponent.id === selectedOpponentId;
                    return (
                      <button
                        key={opponent.id}
                        type="button"
                        onClick={() => setSelectedOpponentId(opponent.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          "hover:border-primary/60 hover:bg-primary/5",
                          isActive
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-muted/40"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold text-base">
                              {opponent.displayName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {opponent.defaultTeamId || "No team"}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-sm px-2">
                            {getRecordLabel(opponent.record)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {!selectedOpponent ? (
            <Card className="h-full min-h-[480px] flex items-center justify-center text-center">
              <div className="space-y-2 px-6">
                <History className="w-10 h-10 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  Select an opponent to view their history
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose an opponent from the list or add a new one to start
                  tracking results.
                </p>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {selectedOpponent.displayName}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {selectedOpponent.matchups.length} recorded game
                      {selectedOpponent.matchups.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-base px-3 py-1.5">
                    Record: {getRecordLabel(selectedOpponent.record)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Default team
                      </label>
                      <Select
                        value={selectedOpponent.defaultTeamId || "__none__"}
                        onValueChange={handleUpdateDefaultTeam}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectItem value="__none__">No team</SelectItem>
                          {availableTeamsForOpponent.map((team) => (
                            <SelectItem key={team.name} value={team.name}>
                              <div className="flex items-center gap-2">
                                <TeamLogo teamName={team.name} size="xs" />
                                {team.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                      <Button
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          removeOpponent(selectedOpponent.id);
                          toast.success("Opponent removed");
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove opponent
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Team History</h3>
                    </div>
                    <div className="grid gap-3">
                      {Object.entries(selectedOpponent.teamHistory)
                        .sort(
                          ([seasonA], [seasonB]) =>
                            Number(seasonB) - Number(seasonA)
                        )
                        .map(([season, teamName]) => (
                          <div
                            key={season}
                            className="flex items-center gap-3 border rounded-lg p-3"
                          >
                            <div className="w-16 text-sm font-medium">
                              {season}
                            </div>
                            <div className="flex-1">
                              <Select
                                value={teamName}
                                onValueChange={(value) =>
                                  setOpponentTeamForSeason(
                                    selectedOpponent.id,
                                    Number(season),
                                    value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                  {fbsTeams.map((team) => (
                                    <SelectItem
                                      key={team.name}
                                      value={team.name}
                                    >
                                      <div className="flex items-center gap-2">
                                        <TeamLogo
                                          teamName={team.name}
                                          size="xs"
                                        />
                                        {team.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setOpponentTeamForSeason(
                                  selectedOpponent.id,
                                  Number(season),
                                  null
                                )
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      <div className="grid gap-3 md:grid-cols-[140px,1fr,120px]">
                        <Input
                          value={teamHistorySeason}
                          onChange={(event) =>
                            setTeamHistorySeason(event.target.value)
                          }
                          placeholder="Season"
                          type="number"
                        />
                        <Select
                          value={teamHistoryTeam}
                          onValueChange={setTeamHistoryTeam}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Team" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            <SelectItem value="__none__">
                              Select team
                            </SelectItem>
                            {fbsTeams
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((team) => (
                                <SelectItem key={team.name} value={team.name}>
                                  <div className="flex items-center gap-2">
                                    <TeamLogo teamName={team.name} size="xs" />
                                    {team.name}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleAddTeamHistory}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Season
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="w-5 h-5 text-primary" />
                    Head-to-Head History
                  </CardTitle>
                  <CardDescription>
                    Game results sync automatically from the Schedule page.
                    Update opponents and scores there to keep this history
                    current.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {groupedMatchups.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-10">
                      No games recorded for this opponent yet. Add results on
                      the Schedule page once you play them.
                    </div>
                  ) : (
                    groupedMatchups.map((group) => {
                      const completedGames = group.matchups.filter(
                        (matchup) => matchup.result
                      ).length;

                      return (
                      <div key={group.season} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold">
                            Season {group.season}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {completedGames || 0}
                            {" "}
                            completed game
                            {completedGames === 1
                              ? ""
                              : "s"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.matchups.map((matchup) => {
                            const scoreLabel =
                              typeof matchup.myScore === "number" &&
                              typeof matchup.opponentScore === "number"
                                ? `${matchup.myScore}-${matchup.opponentScore}`
                                : undefined;
                            const resultLabel = matchup.result
                              ? matchup.result === "WIN"
                                ? "Win"
                                : matchup.result === "LOSS"
                                ? "Loss"
                                : "Tie"
                              : "Pending";

                            return (
                              <MatchupRow
                                key={matchup.id}
                                weekLabel={matchup.weekLabel}
                                leading={
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <TeamLogo
                                        teamName={matchup.myTeamId}
                                        size="sm"
                                      />
                                      <span className="font-medium">
                                        {matchup.myTeamId}
                                      </span>
                                    </div>
                                    <span className="text-muted-foreground">
                                      vs
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <TeamLogo
                                        teamName={matchup.opponentTeamId}
                                        size="sm"
                                      />
                                      <span className="font-medium">
                                        {matchup.opponentTeamId}
                                      </span>
                                    </div>
                                  </div>
                                }
                                scoreLabel={scoreLabel}
                                resultLabel={resultLabel}
                              />
                            );
                          })}
                        </div>
                      </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpponentManagerPage;
