// src/components/Records.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getAllYearRecords,
  setYearRecord,
  getCoachProfile,
  getCurrentYear,
  getSchedule,
  getRecruits,
  getTransfers,
  calculateStats,
  getYearAwards,
  getUsernameForTeam,
  getTeamStats,
  getTeamLeaders,
  getRivalTrophiesForYear,
} from "@/utils/localStorage";
import {
  YearRecord,
  Game,
  TeamStatsData,
  TeamLeaderStats,
} from "@/types/yearRecord";
import { DraftedPlayer } from "@/types/playerTypes";
import {
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Users,
  Award,
  X,
  Save,
  Calendar,
  UserPlus,
  ShieldCheck,
  BarChart2,
  Zap,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import { TeamLogo, ConferenceLogo } from "@/components/ui/TeamLogo";
import { getTeamWithLogo } from "@/utils/logoUtils";
import { fbsTeams, getTeamData } from "@/utils/fbsTeams";
import { toast } from "react-hot-toast";
import { MESSAGES } from "@/utils/notification-utils";
import { Badge } from "@/components/ui/badge";
import { useDynasty } from "@/contexts/DynastyContext";

const classOptions = [
  "FR",
  "FR (RS)",
  "SO",
  "SO (RS)",
  "JR",
  "JR (RS)",
  "SR",
  "SR (RS)",
];
const positionOptions = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "P",
  "OL",
  "DL",
  "LB",
  "CB",
  "S",
];
const SCHEDULE_SIZE = 21;

// Helper component for Dev Trait Badges
const DevTraitBadge: React.FC<{ trait: string }> = ({ trait }) => {
  const colors = {
    Elite: "bg-green-500 text-green-900 dark:bg-green-500 dark:text-green-900",
    Star: "bg-blue-500 text-blue-900 dark:bg-blue-500 dark:text-blue-900",
    Impact:
      "bg-yellow-500 text-yellow-900 dark:bg-yellow-500 dark:text-yellow-900",
    Normal: "bg-red-500 text-red-900 dark:bg-red-500 dark:text-red-900",
  } as const;
  const traitKey = trait as keyof typeof colors;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[traitKey] || colors.Normal
      }`}
    >
      {trait}
    </span>
  );
};

const Records: React.FC = () => {
  const [allRecords, setAllRecords] = useState<YearRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeRecord, setActiveRecord] = useState<YearRecord | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingDraftPlayerId, setEditingDraftPlayerId] = useState<
    string | null
  >(null);
  const [draftPlayerEditValues, setDraftPlayerEditValues] = useState<{
    playerName: string;
    round: number;
  }>({ playerName: "", round: 1 });

  // --- MODIFICATION: Get current year and dynasty ID ---
  const { dataVersion, currentDynastyId } = useDynasty();
  const currentYear = useMemo(() => getCurrentYear(), []);

  // Helper function to calculate effective games played
  const getEffectiveGamesPlayed = useCallback((record: YearRecord | null) => {
    if (!record) return 1;
    const calculatedGamesPlayed = record.schedule.filter(
      (game) =>
        game.result !== "Bye" && game.result !== "N/A" && game.score !== ""
    ).length;
    return record.teamStats?.gamesPlayed || calculatedGamesPlayed || 1;
  }, []);

  useEffect(() => {
    const loadRecords = () => {
      const records = getAllYearRecords();
      const currentYearRecordExists = records.some(
        (r) => r.year === currentYear
      );

      if (!currentYearRecordExists) {
        // This logic is fine, it creates a placeholder for the current year
        const schedule = getSchedule(currentYear);
        const stats = calculateStats(
          schedule,
          getCoachProfile()?.schoolName || ""
        );
        const newCurrentRecord: YearRecord = {
          year: currentYear,
          overallRecord: `${stats.wins}-${stats.losses}`,
          conferenceRecord: `${stats.conferenceWins}-${stats.conferenceLosses}`,
          pointsFor: String(stats.pointsScored),
          pointsAgainst: String(stats.pointsAgainst),
          schedule: schedule,
          recruits: getRecruits(currentYear),
          transfers: getTransfers(currentYear),
          playerAwards: getYearAwards(currentYear), // Use correct function
          bowlGame: "",
          bowlResult: "",
          natChamp: "",
          heisman: "",
          recruitingClassPlacement: "",
          playersDrafted: [],
          finalRanking: "",
          conferenceFinish: "",
          rivalTrophies: getRivalTrophiesForYear(currentYear),
        };
        records.push(newCurrentRecord);
      }

      records.sort((a, b) => b.year - a.year);
      setAllRecords(records);

      if (selectedYear === null) {
        setSelectedYear(currentYear);
      }
    };

    loadRecords();
  }, [currentYear, dataVersion]);

  useEffect(() => {
    if (selectedYear === null) return;

    const allStoredRecords = getAllYearRecords();
    let recordForDisplay: YearRecord | null = null;

    if (selectedYear === currentYear) {
      // LIVE DATA MODE: Build the record dynamically for the current year
      const liveSchedule = getSchedule(currentYear);
      const liveStats = calculateStats(
        liveSchedule,
        getCoachProfile()?.schoolName || ""
      );

      // --- MODIFICATION START: Provide a structured default object ---
      const defaultRecordShape = {
        bowlGame: "",
        bowlResult: "",
        natChamp: "",
        heisman: "",
        recruitingClassPlacement: "",
        playersDrafted: [],
        finalRanking: "",
        conferenceFinish: "",
      };
      const storedEditableData =
        allStoredRecords.find((r) => r.year === currentYear) ||
        defaultRecordShape;
      // --- MODIFICATION END ---

      recordForDisplay = {
        year: currentYear,
        // Dynamically calculated fields
        overallRecord: `${liveStats.wins}-${liveStats.losses}`,
        conferenceRecord: `${liveStats.conferenceWins}-${liveStats.conferenceLosses}`,
        pointsFor: String(liveStats.pointsScored),
        pointsAgainst: String(liveStats.pointsAgainst),
        schedule: liveSchedule,
        recruits: getRecruits(currentYear),
        transfers: getTransfers(currentYear),
        playerAwards: getYearAwards(currentYear),
        // User-editable fields from storage (now safely accessed)
        bowlGame: storedEditableData.bowlGame,
        bowlResult: storedEditableData.bowlResult,
        natChamp: storedEditableData.natChamp,
        heisman: storedEditableData.heisman,
        recruitingClassPlacement: storedEditableData.recruitingClassPlacement,
        playersDrafted: storedEditableData.playersDrafted,
        finalRanking: storedEditableData.finalRanking,
        conferenceFinish: storedEditableData.conferenceFinish,
        rivalTrophies: getRivalTrophiesForYear(currentYear),
        // Team Stats (load from localStorage)
        teamStats: currentDynastyId
          ? getTeamStats(currentDynastyId, currentYear)
          : undefined,
        teamLeaders: currentDynastyId
          ? getTeamLeaders(currentDynastyId, currentYear)
          : undefined,
      };
    } else {
      // HISTORICAL MODE: Just load the saved record
      recordForDisplay =
        allStoredRecords.find((r) => r.year === selectedYear) || null;

      // Load team stats and rival trophies for historical records if dynasty ID is available
      if (recordForDisplay && currentDynastyId) {
        recordForDisplay = {
          ...recordForDisplay,
          teamStats: getTeamStats(currentDynastyId, selectedYear),
          teamLeaders: getTeamLeaders(currentDynastyId, selectedYear),
          rivalTrophies:
            recordForDisplay.rivalTrophies ||
            getRivalTrophiesForYear(selectedYear),
        };
      } else if (recordForDisplay) {
        // Ensure rival trophies are loaded even without dynasty ID
        recordForDisplay = {
          ...recordForDisplay,
          rivalTrophies:
            recordForDisplay.rivalTrophies ||
            getRivalTrophiesForYear(selectedYear),
        };
      }
    }

    // Ensure schedule array is always the correct size for the UI
    if (
      recordForDisplay &&
      (recordForDisplay.schedule?.length || 0) < SCHEDULE_SIZE
    ) {
      const currentSchedule = recordForDisplay.schedule || [];
      const additionalSlots = Array(SCHEDULE_SIZE - currentSchedule.length)
        .fill(null)
        .map((_, i) => ({
          id: currentSchedule.length + i,
          week: currentSchedule.length + i,
          opponent: "",
          result: "N/A" as const,
          score: "",
          location: "vs" as const,
        }));
      recordForDisplay.schedule = [...currentSchedule, ...additionalSlots];
    }

    setActiveRecord(recordForDisplay);
    setHasChanges(false);
  }, [selectedYear, currentYear, dataVersion]);

  const getConferenceForYear = (year: number): string => {
    const coachProfile = getCoachProfile();
    // For the currently active dynasty year, check the profile for an override.
    if (year === currentYear && coachProfile?.conference) {
      return coachProfile.conference;
    }

    // For past years, we assume the conference was what's in the default data.
    // A more advanced (and complex) solution would be to save the conference in each YearRecord,
    // but for now, this keeps it simple and consistent.
    if (coachProfile?.schoolName) {
      const teamData = getTeamData(coachProfile.schoolName);
      return teamData?.conference || "N/A";
    }

    return "N/A";
  };

  const handleFieldChange = (field: keyof YearRecord, value: any) => {
    setActiveRecord((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasChanges(true);
  };

  const handleHeismanChange = (subfield: keyof any, value: string) => {
    const heismanStr = activeRecord?.heisman || "";
    const parts = heismanStr.split(" - ").map((p) => p.trim());
    const heismanObj = {
      name: parts[0] || "",
      position: parts[1] || "",
      class: parts[2] || "",
      school: parts[3] || "",
    };
    (heismanObj as any)[subfield] = value;
    const newHeismanStr = [
      heismanObj.name,
      heismanObj.position,
      heismanObj.class,
      heismanObj.school,
    ]
      .filter(Boolean)
      .join(" - ");
    handleFieldChange("heisman", newHeismanStr);
  };

  const updateDraftedPlayer = (
    index: number,
    field: keyof DraftedPlayer,
    value: string | number
  ) => {
    if (!activeRecord) return;
    const updatedPlayers = [...(activeRecord.playersDrafted || [])];
    (updatedPlayers[index] as any)[field] = value;
    handleFieldChange("playersDrafted", updatedPlayers);
  };

  const addDraftedPlayer = () => {
    if (!activeRecord) return;
    const newPlayer: DraftedPlayer = {
      id: Date.now().toString(),
      playerName: "",
      originalTeam: "",
      draftedTeam: "",
      round: 1,
      pick: 1,
      year: selectedYear!,
    };
    handleFieldChange("playersDrafted", [
      ...(activeRecord.playersDrafted || []),
      newPlayer,
    ]);
    // Enter edit mode for this new player
    setEditingDraftPlayerId(newPlayer.id);
    setDraftPlayerEditValues({ playerName: "", round: 1 });
  };

  const saveDraftedPlayer = (id: string) => {
    if (!activeRecord) return;
    const updatedPlayers = (activeRecord.playersDrafted || []).map((p) =>
      p.id === id
        ? {
            ...p,
            playerName: draftPlayerEditValues.playerName,
            round: draftPlayerEditValues.round,
          }
        : p
    );
    handleFieldChange("playersDrafted", updatedPlayers);
    setEditingDraftPlayerId(null);
    setDraftPlayerEditValues({ playerName: "", round: 1 });
  };

  const cancelDraftedPlayerEdit = (id: string) => {
    // If the player has no name, remove them entirely (they were just added)
    if (!activeRecord) return;
    const player = (activeRecord.playersDrafted || []).find((p) => p.id === id);
    if (player && !player.playerName.trim()) {
      removeDraftedPlayer(id);
    }
    setEditingDraftPlayerId(null);
    setDraftPlayerEditValues({ playerName: "", round: 1 });
  };

  const removeDraftedPlayer = (id: string) => {
    if (!activeRecord) return;
    handleFieldChange(
      "playersDrafted",
      (activeRecord.playersDrafted || []).filter((p) => p.id !== id)
    );
  };

  const updateSchedule = (index: number, field: keyof Game, value: string) => {
    if (!activeRecord) return;
    const updatedSchedule = [...activeRecord.schedule];
    (updatedSchedule[index] as any)[field] = value;
    handleFieldChange("schedule", updatedSchedule);
  };

  const handleSave = () => {
    if (activeRecord) {
      setYearRecord(activeRecord.year, activeRecord);
      setAllRecords((prev) =>
        prev.map((r) => (r.year === activeRecord.year ? activeRecord : r))
      );
      setHasChanges(false);
      toast.success("Season record saved!");
    }
  };

  // Calculate schedule highlights
  const scheduleHighlights = useMemo(() => {
    if (!activeRecord)
      return { bestWin: null, worstLoss: null, longestStreak: 0 };

    const playedGames = activeRecord.schedule.filter(
      (g) => g.result === "Win" || g.result === "Loss"
    );
    if (playedGames.length === 0)
      return { bestWin: null, worstLoss: null, longestStreak: 0 };

    let bestWin: Game | null = null;
    let worstLoss: Game | null = null;
    let maxWinStreak = 0;
    let currentStreak = 0;

    for (const game of playedGames) {
      const scoreParts = game.score.split("-").map((s) => parseInt(s.trim()));
      if (
        scoreParts.length !== 2 ||
        isNaN(scoreParts[0]) ||
        isNaN(scoreParts[1])
      )
        continue;

      const diff = scoreParts[0] - scoreParts[1];

      if (game.result === "Win") {
        currentStreak++;
        if (
          !bestWin ||
          diff >
            parseInt(bestWin.score.split("-")[0]) -
              parseInt(bestWin.score.split("-")[1])
        ) {
          bestWin = game;
        }
      } else if (game.result === "Loss") {
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
        currentStreak = 0;
        if (
          !worstLoss ||
          diff <
            parseInt(worstLoss.score.split("-")[0]) -
              parseInt(worstLoss.score.split("-")[1])
        ) {
          worstLoss = game;
        }
      }
    }
    maxWinStreak = Math.max(maxWinStreak, currentStreak);

    return { bestWin, worstLoss, longestStreak: maxWinStreak };
  }, [activeRecord]);

  if (allRecords.length === 0 && !currentYear) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="text-center p-12">
          <h2 className="text-xl font-semibold">Loading Season Data...</h2>
        </Card>
      </div>
    );
  }

  const sortedTeams = [...fbsTeams].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Season History</h1>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => setSelectedYear(Number(value))}
            value={selectedYear?.toString()}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select a Season" />
            </SelectTrigger>
            <SelectContent>
              {allRecords.map((record) => (
                <SelectItem key={record.year} value={record.year.toString()}>
                  {record.year} Season{" "}
                  {record.year === currentYear && "(Current)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasChanges && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {activeRecord ? (
        <Tabs defaultValue="overview" className="w-full">
          {/* Tabs List */}
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="recruits">Recruits & Transfers</TabsTrigger>
            <TabsTrigger value="awards">Awards & Draft</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-6">
            {/* All Content Below the tabs */}
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Team logo and Year Season Summary */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-4">
                  {(() => {
                    const p = getCoachProfile();
                    return p?.schoolName ? (
                      <TeamLogo teamName={p.schoolName} size="xl" />
                    ) : null;
                  })()}
                  <div>
                    <h2 className="text-3xl font-bold">
                      {activeRecord.year} Season Summary
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {(() => {
                        const conference = getConferenceForYear(
                          activeRecord.year
                        );
                        return conference !== "N/A" ? (
                          <>
                            <ConferenceLogo conference={conference} size="sm" />
                            <span className="text-md text-gray-600 dark:text-gray-400">
                              {conference}
                            </span>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Overall Record */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs font-medium text-gray-500">Overall</p>
                    <p className="text-2xl font-bold">
                      {activeRecord.overallRecord || "0-0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Conference Record */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs font-medium text-gray-500">
                      Conference
                    </p>
                    <p className="text-2xl font-bold">
                      {activeRecord.conferenceRecord || "0-0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Points For */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs font-medium text-gray-500">
                      Points For
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {activeRecord.pointsFor || "0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Points Against */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs font-medium text-gray-500">
                      Points Against
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {activeRecord.pointsAgainst || "0"}
                    </p>
                  </CardContent>
                </Card>

                {/* Conference Finish */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs font-medium text-gray-500">
                      Conf. Finish
                    </p>
                    <p className="text-2xl font-bold">
                      {activeRecord.conferenceFinish || "N/A"}
                    </p>
                  </CardContent>
                </Card>

                {/* Final Rank */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="text-xs font-medium text-gray-500">
                      Final Rank
                    </p>
                    <p className="text-2xl font-bold">
                      #{activeRecord.finalRanking || "NR"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Season Achievements */}
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy /> Season Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {activeRecord.natChamp && (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <Trophy className="h-6 w-6 text-yellow-600" />
                        <div>
                          <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                            National Champions!
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            {activeRecord.natChamp}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeRecord.bowlGame && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Medal className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-semibold text-blue-800 dark:text-blue-200">
                              {activeRecord.bowlGame}
                            </p>
                          </div>
                        </div>
                        {activeRecord.bowlResult && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              activeRecord.bowlResult
                                .toLowerCase()
                                .includes("win")
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {activeRecord.bowlResult}
                          </span>
                        )}
                      </div>
                    )}
                    {activeRecord.heisman && (
                      <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <Award className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-semibold text-purple-800 dark:text-purple-200">
                            Heisman Winner
                          </p>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            {activeRecord.heisman}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeRecord.rivalTrophies &&
                      activeRecord.rivalTrophies.length > 0 && (
                        <div className="space-y-2">
                          {activeRecord.rivalTrophies.map((trophy, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                            >
                              <Trophy className="h-5 w-5 text-orange-600" />
                              <div>
                                <p className="font-semibold text-orange-800 dark:text-orange-200">
                                  Rival Trophy
                                </p>
                                <p className="text-sm text-orange-600 dark:text-orange-400">
                                  {trophy}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* Schedule Highlights */}
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap /> Schedule Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {scheduleHighlights.bestWin && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <ChevronsUp className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-200">
                            Best Win
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            vs {scheduleHighlights.bestWin.opponent} (
                            {scheduleHighlights.bestWin.score})
                          </p>
                        </div>
                      </div>
                    )}
                    {scheduleHighlights.worstLoss && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <ChevronsDown className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="font-semibold text-red-800 dark:text-red-200">
                            Worst Loss
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            vs {scheduleHighlights.worstLoss.opponent} (
                            {scheduleHighlights.worstLoss.score})
                          </p>
                        </div>
                      </div>
                    )}
                    {scheduleHighlights.longestStreak > 1 && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-800 dark:text-blue-200">
                            Longest Win Streak
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {scheduleHighlights.longestStreak} Games
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* NFL Draft Class Preview */}
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="text-blue-600" /> NFL Draft Class
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {(activeRecord.playersDrafted || []).length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                            {(activeRecord.playersDrafted || []).length}
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            Players Drafted
                          </p>
                        </div>
                        <div className="space-y-2">
                          {(activeRecord.playersDrafted || [])
                            .filter((p) => p.playerName.trim())
                            .sort(
                              (a, b) => a.round - b.round || a.pick - b.pick
                            )
                            .slice(0, 3)
                            .map((player) => (
                              <div
                                key={player.id}
                                className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                              >
                                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  R{player.round}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-blue-800 dark:text-blue-200 truncate text-sm">
                                    {player.playerName}
                                  </p>
                                </div>
                              </div>
                            ))}
                          {(activeRecord.playersDrafted || []).filter((p) =>
                            p.playerName.trim()
                          ).length > 3 && (
                            <p className="text-xs text-center text-blue-600 dark:text-blue-400 mt-2">
                              +
                              {(activeRecord.playersDrafted || []).filter((p) =>
                                p.playerName.trim()
                              ).length - 3}{" "}
                              more
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No players drafted
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Third Row - Season Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-5 w-5" />
                    {activeRecord.year} Season Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeRecord.teamStats ? (
                    <div className="space-y-6">
                      {/* Team Stats Overview */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Total Offense
                          </p>
                          <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                            {activeRecord.teamStats.totalOffense.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            Total Defense
                          </p>
                          <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                            {activeRecord.teamStats.totalDefense.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            Avg Margin
                          </p>
                          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                            {(
                              (activeRecord.teamStats.points -
                                activeRecord.teamStats.defPoints) /
                              getEffectiveGamesPlayed(activeRecord)
                            ).toFixed(1)}
                          </p>
                        </div>
                      </div>

                      {/* Offense vs Defense Breakdown */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Offense */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Offense
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                Pass Yards
                              </p>
                              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                {activeRecord.teamStats.passYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                (
                                {(
                                  activeRecord.teamStats.passYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game)
                              </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                Rush Yards
                              </p>
                              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                {activeRecord.teamStats.rushYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                (
                                {(
                                  activeRecord.teamStats.rushYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game)
                              </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg col-span-2">
                              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                Points Scored
                              </p>
                              <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
                                {activeRecord.teamStats.points.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                (
                                {(
                                  activeRecord.teamStats.points /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Defense */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Defense
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">
                                Pass Yards Allowed
                              </p>
                              <p className="text-lg font-bold text-red-800 dark:text-red-200">
                                {activeRecord.teamStats.defPassYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400">
                                (
                                {(
                                  activeRecord.teamStats.defPassYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game)
                              </p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">
                                Rush Yards Allowed
                              </p>
                              <p className="text-lg font-bold text-red-800 dark:text-red-200">
                                {activeRecord.teamStats.defRushYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400">
                                (
                                {(
                                  activeRecord.teamStats.defRushYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game)
                              </p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg col-span-2">
                              <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">
                                Points Allowed
                              </p>
                              <p className="text-lg font-bold text-red-800 dark:text-red-200">
                                {activeRecord.teamStats.defPoints.toLocaleString()}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400">
                                (
                                {(
                                  activeRecord.teamStats.defPoints /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game)
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team Leaders - Show only top performers */}
                      {activeRecord.teamLeaders && (
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            Season Leaders
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Top Passer */}
                            {activeRecord.teamLeaders.passingLeaders.length >
                              0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">
                                  Passing Leader
                                </p>
                                <p className="font-bold text-blue-800 dark:text-blue-200 truncate">
                                  {
                                    activeRecord.teamLeaders.passingLeaders[0]
                                      .name
                                  }
                                </p>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  {activeRecord.teamLeaders.passingLeaders[0].yards?.toLocaleString() ||
                                    0}{" "}
                                  yds,{" "}
                                  {activeRecord.teamLeaders.passingLeaders[0]
                                    .touchdowns || 0}{" "}
                                  TDs
                                </p>
                              </div>
                            )}

                            {/* Top Rusher */}
                            {activeRecord.teamLeaders.rushingLeaders.length >
                              0 && (
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide font-medium">
                                  Rushing Leader
                                </p>
                                <p className="font-bold text-green-800 dark:text-green-200 truncate">
                                  {
                                    activeRecord.teamLeaders.rushingLeaders[0]
                                      .name
                                  }
                                </p>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                  {activeRecord.teamLeaders.rushingLeaders[0].yards?.toLocaleString() ||
                                    0}{" "}
                                  yds,{" "}
                                  {activeRecord.teamLeaders.rushingLeaders[0]
                                    .touchdowns || 0}{" "}
                                  TDs
                                </p>
                              </div>
                            )}

                            {/* Top Receiver */}
                            {activeRecord.teamLeaders.receivingLeaders.length >
                              0 && (
                              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                                <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide font-medium">
                                  Receiving Leader
                                </p>
                                <p className="font-bold text-purple-800 dark:text-purple-200 truncate">
                                  {
                                    activeRecord.teamLeaders.receivingLeaders[0]
                                      .name
                                  }
                                </p>
                                <p className="text-sm text-purple-600 dark:text-purple-400">
                                  {activeRecord.teamLeaders.receivingLeaders[0]
                                    .receptions || 0}{" "}
                                  rec,{" "}
                                  {activeRecord.teamLeaders.receivingLeaders[0].yards?.toLocaleString() ||
                                    0}{" "}
                                  yds
                                </p>
                              </div>
                            )}

                            {/* Top Tackler */}
                            {activeRecord.teamLeaders.tackleLeaders.length >
                              0 && (
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide font-medium">
                                  Tackle Leader
                                </p>
                                <p className="font-bold text-red-800 dark:text-red-200 truncate">
                                  {
                                    activeRecord.teamLeaders.tackleLeaders[0]
                                      .name
                                  }
                                </p>
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  {activeRecord.teamLeaders.tackleLeaders[0]
                                    .total || 0}{" "}
                                  tackles
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No team stats available for this season.</p>
                      <p className="text-sm mt-2">
                        Stats will appear here when they are entered in the Team
                        Stats page.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Schedule */}
          <TabsContent value="schedule" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Schedule & Results</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {/* MODIFICATION: Make this a read-only display */}
                  {activeRecord.schedule
                    .filter((g) => g.opponent && g.opponent !== "BYE")
                    .map((game) => (
                      <div
                        key={game.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                          game.result === "Win"
                            ? "border-l-green-500 bg-green-50 dark:bg-green-900/20"
                            : game.result === "Loss"
                            ? "border-l-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-l-gray-300 dark:border-l-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-center text-muted-foreground text-sm w-10">{`W${game.week}`}</div>
                          <div className="flex items-center gap-2">
                            <TeamLogo teamName={game.opponent} size="md" />
                            <div className="font-semibold text-lg">
                              {game.location === "@" ? "@" : "vs"}{" "}
                              {game.opponent}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-bold text-lg text-right w-24">
                            {game.score}
                          </div>
                          {game.result && game.result !== "N/A" && (
                            <Badge
                              className={`w-16 justify-center ${
                                game.result === "Win"
                                  ? "bg-green-600"
                                  : game.result === "Loss"
                                  ? "bg-red-600"
                                  : "bg-gray-500"
                              } text-white`}
                            >
                              {game.result}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recruits & Transfers */}
          <TabsContent value="recruits" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="text-yellow-500" />
                    Recruiting Class ({(activeRecord.recruits || []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ScrollArea className="h-[450px] pr-3">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      {(activeRecord.recruits || []).length > 0 ? (
                        (activeRecord.recruits || [])
                          .sort((a, b) => parseInt(b.stars) - parseInt(a.stars))
                          .map((recruit) => (
                            <div
                              key={recruit.id}
                              className="flex items-center gap-3 p-2 border rounded-md"
                            >
                              <div className="flex flex-col items-center w-12">
                                <div className="flex">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < parseInt(recruit.stars)
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs">
                                  {recruit.stars}⭐
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">
                                  {recruit.name}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {recruit.position}
                                </p>
                              </div>
                              <DevTraitBadge trait={recruit.potential} />
                            </div>
                          ))
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No recruits recorded.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="text-blue-500" />
                    Transfer Portal ({(activeRecord.transfers || []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ScrollArea className="h-[450px] pr-3">
                    <div className="space-y-2">
                      {(activeRecord.transfers || []).length > 0 ? (
                        (activeRecord.transfers || [])
                          .sort((a, b) =>
                            a.transferDirection.localeCompare(
                              b.transferDirection
                            )
                          )
                          .map((transfer) => (
                            <div
                              key={transfer.id}
                              className={`flex items-center gap-3 p-2 border rounded-md border-l-4 ${
                                transfer.transferDirection === "From"
                                  ? "border-l-green-500"
                                  : "border-l-red-500"
                              }`}
                            >
                              <div
                                className={`text-xs font-bold w-8 text-center ${
                                  transfer.transferDirection === "From"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {transfer.transferDirection === "From"
                                  ? "IN"
                                  : "OUT"}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">
                                  {transfer.playerName}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {transfer.position} | {transfer.school}
                                </p>
                              </div>
                              <div className="text-sm">{transfer.stars}⭐</div>
                            </div>
                          ))
                      ) : (
                        <p className="text-center text-muted-foreground py-4">
                          No transfer activity.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Awards & Draft */}
          <TabsContent value="awards" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart2 />
                      Season Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">
                        Overall Record
                      </label>
                      <Input
                        value={activeRecord.overallRecord}
                        onChange={(e) =>
                          handleFieldChange("overallRecord", e.target.value)
                        }
                        placeholder="12-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Conference Record
                      </label>
                      <Input
                        value={activeRecord.conferenceRecord}
                        onChange={(e) =>
                          handleFieldChange("conferenceRecord", e.target.value)
                        }
                        placeholder="8-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Final Rank</label>
                      <Input
                        value={activeRecord.finalRanking || ""}
                        onChange={(e) =>
                          handleFieldChange("finalRanking", e.target.value)
                        }
                        placeholder="#5"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Conference Finish
                      </label>
                      <Input
                        value={activeRecord.conferenceFinish || ""}
                        onChange={(e) =>
                          handleFieldChange("conferenceFinish", e.target.value)
                        }
                        placeholder="1st"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Bowl Game</label>
                      <Input
                        value={activeRecord.bowlGame}
                        onChange={(e) =>
                          handleFieldChange("bowlGame", e.target.value)
                        }
                        placeholder="Rose Bowl"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Bowl Result</label>
                      <Select
                        value={activeRecord.bowlResult}
                        onValueChange={(v) =>
                          handleFieldChange("bowlResult", v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Win">Win</SelectItem>
                          <SelectItem value="Loss">Loss</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy />
                      Major Awards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        National Champion
                      </label>
                      <Select
                        value={activeRecord.natChamp || "none"}
                        onValueChange={(v) =>
                          handleFieldChange("natChamp", v === "none" ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Team" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedTeams.map((t) => (
                            <SelectItem key={t.name} value={t.name}>
                              <div className="flex items-center gap-2">
                                <TeamLogo teamName={t.name} size="sm" />
                                <span>
                                  {t.name}
                                  {getUsernameForTeam(t.name) && (
                                    <span className="text-xs text-blue-600 font-medium">
                                      {" "}
                                      ({getUsernameForTeam(t.name)})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Heisman Winner
                      </label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <Input
                          value={
                            (activeRecord.heisman || " -  -  - ").split(
                              " - "
                            )[0]
                          }
                          onChange={(e) =>
                            handleHeismanChange("name", e.target.value)
                          }
                          placeholder="Player Name"
                        />
                        <Select
                          value={
                            (activeRecord.heisman || " -  -  - ").split(
                              " - "
                            )[1]
                          }
                          onValueChange={(v) =>
                            handleHeismanChange("position", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pos" />
                          </SelectTrigger>
                          <SelectContent>
                            {positionOptions.map((pos) => (
                              <SelectItem key={pos} value={pos}>
                                {pos}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            (activeRecord.heisman || " -  -  - ").split(
                              " - "
                            )[2]
                          }
                          onValueChange={(v) => handleHeismanChange("class", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classOptions.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            (activeRecord.heisman || " -  -  - ").split(
                              " - "
                            )[3]
                          }
                          onValueChange={(v) =>
                            handleHeismanChange("school", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="School" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedTeams.map((t) => (
                              <SelectItem key={t.name} value={t.name}>
                                <div className="flex items-center gap-2">
                                  <TeamLogo teamName={t.name} size="sm" />
                                  <span>
                                    {t.name}
                                    {getUsernameForTeam(t.name) && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        {" "}
                                        ({getUsernameForTeam(t.name)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-6">
                <Card className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="text-yellow-500" />
                      Team Awards
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ScrollArea className="h-48 pr-3">
                      <div className="space-y-2">
                        {(activeRecord.playerAwards || []).length > 0 ? (
                          (activeRecord.playerAwards || []).map((award) => (
                            <div
                              key={award.id}
                              className="flex items-center p-2 border rounded-md text-sm"
                            >
                              <Award className="h-4 w-4 mr-2 text-yellow-500" />{" "}
                              <span className="font-semibold">
                                {award.playerName}
                              </span>{" "}
                              - {award.awardName}
                              {award.team && ` (${award.team})`}
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            No team awards recorded.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="text-blue-600" />
                      NFL Draft Class (
                      {(activeRecord.playersDrafted || []).length})
                    </CardTitle>
                    <Button
                      onClick={addDraftedPlayer}
                      size="sm"
                      variant="outline"
                    >
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ScrollArea className="h-48 pr-3">
                      <div className="space-y-2">
                        {(activeRecord.playersDrafted || [])
                          .sort((a, b) => a.round - b.round || a.pick - b.pick)
                          .map((player, index) => {
                            // If player is being edited, show edit mode
                            if (editingDraftPlayerId === player.id) {
                              return (
                                <div
                                  key={player.id}
                                  className="grid grid-cols-[1fr,auto] gap-2 items-center p-2 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                                >
                                  <div className="space-y-2">
                                    <Input
                                      value={draftPlayerEditValues.playerName}
                                      onChange={(e) =>
                                        setDraftPlayerEditValues((prev) => ({
                                          ...prev,
                                          playerName: e.target.value,
                                        }))
                                      }
                                      placeholder="Player Name"
                                      className="h-8"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium">
                                        Round:
                                      </label>
                                      <Input
                                        type="number"
                                        value={draftPlayerEditValues.round}
                                        onChange={(e) =>
                                          setDraftPlayerEditValues((prev) => ({
                                            ...prev,
                                            round:
                                              parseInt(e.target.value) || 1,
                                          }))
                                        }
                                        className="h-8 w-16 text-center"
                                        min="1"
                                        max="7"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      onClick={() =>
                                        saveDraftedPlayer(player.id)
                                      }
                                      variant="default"
                                      size="sm"
                                      className="h-8"
                                      disabled={
                                        !draftPlayerEditValues.playerName.trim()
                                      }
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        cancelDraftedPlayerEdit(player.id)
                                      }
                                      variant="ghost"
                                      size="sm"
                                      className="h-8"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

                            // Show display mode for players with names
                            return (
                              <div
                                key={player.id}
                                className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                      R{player.round}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-blue-800 dark:text-blue-200 truncate">
                                      {player.playerName || "(Unnamed)"}
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                      Round {player.round}
                                      {player.pick > 0 &&
                                        `, Pick ${player.pick}`}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => removeDraftedPlayer(player.id)}
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-70 hover:opacity-100 text-blue-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        {(activeRecord.playersDrafted || []).length === 0 && (
                          <p className="text-center text-muted-foreground py-4">
                            No players drafted yet.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="text-center p-12">
          <p>Select a year to view its records.</p>
        </Card>
      )}
    </div>
  );
};

export default Records;
