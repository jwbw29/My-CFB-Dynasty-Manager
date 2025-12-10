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
            <div className="space-y-8 max-w-7xl mx-auto">
              {/* Hero Section - Enhanced Header with Key Stats */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                <div className="relative p-8">
                  {/* Header with Logo and Title */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-6">
                      {(() => {
                        const p = getCoachProfile();
                        return p?.schoolName ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-xl opacity-20"></div>
                            <TeamLogo teamName={p.schoolName} size="3xl" />
                          </div>
                        ) : null;
                      })()}
                      <div className="text-center md:text-left">
                        <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
                          {activeRecord.year} Season
                        </h2>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                          {(() => {
                            const conference = getConferenceForYear(
                              activeRecord.year
                            );
                            return conference !== "N/A" ? (
                              <>
                                <ConferenceLogo
                                  conference={conference}
                                  size="lg"
                                />
                                <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                                  {conference}
                                </span>
                              </>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Key Achievement Badges */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                      {activeRecord.finalRanking && (
                        <div className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 dark:from-yellow-500 dark:to-orange-500 rounded-full shadow-md">
                          <span className="text-sm font-bold text-white">
                            #{activeRecord.finalRanking} Final Rank
                          </span>
                        </div>
                      )}
                      {activeRecord.natChamp && (
                        <div className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full shadow-md">
                          <span className="text-sm font-bold text-white flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            National Champions
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Stats Grid - Reorganized by Logical Grouping */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Group 1: Team Records */}
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-300 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-blue-500 p-2 rounded-lg">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Season Record
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {/* Overall Record - Most Prominent */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
                            Overall Record
                          </p>
                          <p className="text-5xl font-black text-blue-900 dark:text-blue-100">
                            {activeRecord.overallRecord || "0-0"}
                          </p>
                        </div>
                        {/* Conference Record */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">
                            Conference Record
                          </p>
                          <p className="text-4xl font-black text-purple-900 dark:text-purple-100">
                            {activeRecord.conferenceRecord || "0-0"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Group 2: Scoring Performance */}
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-300 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-gradient-to-br from-green-500 to-red-500 p-2 rounded-lg">
                          <BarChart2 className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Scoring
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {/* Points For */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 rounded-xl p-4 border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                              Points For
                            </p>
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-4xl font-black text-green-700 dark:text-green-400">
                            {activeRecord.pointsFor || "0"}
                          </p>
                        </div>
                        {/* Points Against */}
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 rounded-xl p-4 border border-red-200 dark:border-red-800">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                              Points Against
                            </p>
                            <ChevronsDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <p className="text-4xl font-black text-red-700 dark:text-red-400">
                            {activeRecord.pointsAgainst || "0"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Group 3: Final Standings */}
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-gray-300 dark:border-gray-600 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-2 rounded-lg">
                          <Star className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          Final Standings
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {/* Final Rank - Most Prominent */}
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider mb-1">
                            National Rank
                          </p>
                          <p className="text-5xl font-black text-yellow-700 dark:text-yellow-400">
                            #{activeRecord.finalRanking || "NR"}
                          </p>
                        </div>
                        {/* Conference Finish */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                            Conference Finish
                          </p>
                          <p className="text-4xl font-black text-amber-900 dark:text-amber-100">
                            {activeRecord.conferenceFinish || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Highlights Section - Three Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Season Achievements */}
                <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                    <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                      <Trophy className="h-6 w-6" /> Season Achievements
                    </CardTitle>
                  </div>
                  <CardContent className="p-5 space-y-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                    {activeRecord.natChamp && (
                      <div className="group relative overflow-hidden flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl border-2 border-yellow-400 dark:border-yellow-600 shadow-md hover:shadow-lg transition-all">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 group-hover:from-yellow-400/30 group-hover:to-amber-400/30 transition-all"></div>
                        <Trophy className="h-7 w-7 text-yellow-600 dark:text-yellow-400 relative z-10" />
                        <div className="relative z-10">
                          <p className="font-black text-yellow-900 dark:text-yellow-200 text-lg">
                            National Champions!
                          </p>
                          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                            {activeRecord.natChamp}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeRecord.bowlGame && (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-300 dark:border-blue-700 shadow-md hover:shadow-lg transition-all">
                        <div className="flex items-center gap-3">
                          <Medal className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-bold text-blue-900 dark:text-blue-200 text-base">
                              {activeRecord.bowlGame}
                            </p>
                          </div>
                        </div>
                        {activeRecord.bowlResult && (
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${
                              activeRecord.bowlResult
                                .toLowerCase()
                                .includes("win")
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                            }`}
                          >
                            {activeRecord.bowlResult}
                          </span>
                        )}
                      </div>
                    )}
                    {activeRecord.heisman && (
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-300 dark:border-purple-700 shadow-md hover:shadow-lg transition-all">
                        <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        <div>
                          <p className="font-bold text-purple-900 dark:text-purple-200 text-base">
                            Heisman Winner
                          </p>
                          <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
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
                              className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-xl border border-orange-300 dark:border-orange-700 shadow-sm hover:shadow-md transition-all"
                            >
                              <Trophy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              <div>
                                <p className="font-semibold text-orange-900 dark:text-orange-200">
                                  Rival Trophy
                                </p>
                                <p className="text-sm text-orange-700 dark:text-orange-400">
                                  {trophy}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    {!activeRecord.natChamp &&
                      !activeRecord.bowlGame &&
                      !activeRecord.heisman &&
                      (!activeRecord.rivalTrophies ||
                        activeRecord.rivalTrophies.length === 0) && (
                        <div className="text-center py-8">
                          <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            No achievements recorded
                          </p>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* Schedule Highlights */}
                <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
                    <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                      <Zap className="h-6 w-6" /> Schedule Highlights
                    </CardTitle>
                  </div>
                  <CardContent className="p-5 space-y-3 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                    {scheduleHighlights.bestWin && (
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border-l-4 border-green-500 shadow-md hover:shadow-lg transition-all">
                        <div className="bg-green-500 p-2 rounded-lg">
                          <ChevronsUp className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-green-900 dark:text-green-200 text-base">
                            Best Win
                          </p>
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                            vs {scheduleHighlights.bestWin.opponent}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-500">
                            {scheduleHighlights.bestWin.score}
                          </p>
                        </div>
                      </div>
                    )}
                    {scheduleHighlights.worstLoss && (
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-xl border-l-4 border-red-500 shadow-md hover:shadow-lg transition-all">
                        <div className="bg-red-500 p-2 rounded-lg">
                          <ChevronsDown className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-red-900 dark:text-red-200 text-base">
                            Worst Loss
                          </p>
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            vs {scheduleHighlights.worstLoss.opponent}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-500">
                            {scheduleHighlights.worstLoss.score}
                          </p>
                        </div>
                      </div>
                    )}
                    {scheduleHighlights.longestStreak > 1 && (
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-all">
                        <div className="bg-blue-500 p-2 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-blue-900 dark:text-blue-200 text-base">
                            Longest Win Streak
                          </p>
                          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {scheduleHighlights.longestStreak} Games
                          </p>
                        </div>
                      </div>
                    )}
                    {!scheduleHighlights.bestWin &&
                      !scheduleHighlights.worstLoss &&
                      scheduleHighlights.longestStreak <= 1 && (
                        <div className="text-center py-8">
                          <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            No schedule highlights yet
                          </p>
                        </div>
                      )}
                  </CardContent>
                </Card>

                {/* NFL Draft Class Preview */}
                <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-shadow overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                    <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                      <ShieldCheck className="h-6 w-6" /> NFL Draft Class
                    </CardTitle>
                  </div>
                  <CardContent className="p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                    {(activeRecord.playersDrafted || []).length > 0 ? (
                      <div className="space-y-4">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-lg">
                          <p className="text-4xl font-black text-blue-700 dark:text-blue-300">
                            {(activeRecord.playersDrafted || []).length}
                          </p>
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            Players Drafted
                          </p>
                        </div>
                        <div className="space-y-2">
                          {(activeRecord.playersDrafted || [])
                            .filter((p) => p.playerName.trim())
                            .sort((a, b) => a.round - b.round)
                            .slice(0, 3)
                            .map((player) => (
                              <div
                                key={player.id}
                                className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all"
                              >
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-black shadow-md flex-shrink-0">
                                  R{player.round}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-blue-900 dark:text-blue-200 truncate">
                                    {player.playerName}
                                  </p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    Round {player.round}
                                  </p>
                                </div>
                              </div>
                            ))}
                          {(activeRecord.playersDrafted || []).filter((p) =>
                            p.playerName.trim()
                          ).length > 3 && (
                            <p className="text-sm text-center text-blue-600 dark:text-blue-400 font-bold mt-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                              +
                              {(activeRecord.playersDrafted || []).filter((p) =>
                                p.playerName.trim()
                              ).length - 3}{" "}
                              more players
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          No players drafted
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Season Stats Section - Enhanced */}
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 p-6">
                  <CardTitle className="flex items-center gap-3 text-2xl font-black text-white">
                    <BarChart2 className="h-7 w-7" />
                    {activeRecord.year} Season Stats
                  </CardTitle>
                </div>
                <CardContent className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                  {activeRecord.teamStats ? (
                    <div className="space-y-8">
                      {/* Key Stats Summary - Three Large Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="relative overflow-hidden text-center p-6 bg-gradient-to-br from-green-100 via-emerald-100 to-green-100 dark:from-green-900/40 dark:via-emerald-900/40 dark:to-green-900/40 rounded-2xl border-2 border-green-300 dark:border-green-700 shadow-lg hover:shadow-xl transition-all">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative z-10">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <p className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                                Total Offense
                              </p>
                            </div>
                            <p className="text-5xl font-black text-green-800 dark:text-green-200 mb-1">
                              {activeRecord.teamStats.totalOffense.toLocaleString()}
                            </p>
                            <p className="text-xs font-semibold text-green-600 dark:text-green-500">
                              {(
                                activeRecord.teamStats.totalOffense /
                                getEffectiveGamesPlayed(activeRecord)
                              ).toFixed(1)}{" "}
                              yards per game
                            </p>
                          </div>
                        </div>
                        <div className="relative overflow-hidden text-center p-6 bg-gradient-to-br from-red-100 via-rose-100 to-red-100 dark:from-red-900/40 dark:via-rose-900/40 dark:to-red-900/40 rounded-2xl border-2 border-red-300 dark:border-red-700 shadow-lg hover:shadow-xl transition-all">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative z-10">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <ShieldCheck className="h-5 w-5 text-red-600 dark:text-red-400" />
                              <p className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                Total Defense
                              </p>
                            </div>
                            <p className="text-5xl font-black text-red-800 dark:text-red-200 mb-1">
                              {activeRecord.teamStats.totalDefense.toLocaleString()}
                            </p>
                            <p className="text-xs font-semibold text-red-600 dark:text-red-500">
                              {(
                                activeRecord.teamStats.totalDefense /
                                getEffectiveGamesPlayed(activeRecord)
                              ).toFixed(1)}{" "}
                              yards allowed per game
                            </p>
                          </div>
                        </div>
                        <div className="relative overflow-hidden text-center p-6 bg-gradient-to-br from-purple-100 via-violet-100 to-purple-100 dark:from-purple-900/40 dark:via-violet-900/40 dark:to-purple-900/40 rounded-2xl border-2 border-purple-300 dark:border-purple-700 shadow-lg hover:shadow-xl transition-all">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full -mr-16 -mt-16"></div>
                          <div className="relative z-10">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              <p className="text-sm font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                                Avg Margin
                              </p>
                            </div>
                            <p className="text-5xl font-black text-purple-800 dark:text-purple-200 mb-1">
                              {(
                                (activeRecord.teamStats.points -
                                  activeRecord.teamStats.defPoints) /
                                getEffectiveGamesPlayed(activeRecord)
                              ).toFixed(1)}
                            </p>
                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-500">
                              points per game
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Offense vs Defense Breakdown - Side by Side */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Offense Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 shadow-lg">
                          <h4 className="text-2xl font-black text-blue-800 dark:text-blue-200 flex items-center gap-3 mb-6">
                            <div className="bg-blue-500 p-2 rounded-lg">
                              <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                            Offense
                          </h4>
                          <div className="space-y-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-blue-700 shadow-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider">
                                  Pass Yards
                                </p>
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              </div>
                              <p className="text-3xl font-black text-blue-900 dark:text-blue-100">
                                {activeRecord.teamStats.passYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-500 font-medium mt-1">
                                {(
                                  activeRecord.teamStats.passYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-blue-200 dark:border-blue-700 shadow-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider">
                                  Rush Yards
                                </p>
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              </div>
                              <p className="text-3xl font-black text-blue-900 dark:text-blue-100">
                                {activeRecord.teamStats.rushYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-500 font-medium mt-1">
                                {(
                                  activeRecord.teamStats.rushYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game
                              </p>
                            </div>
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 rounded-xl shadow-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-white font-bold uppercase tracking-wider">
                                  Points Scored
                                </p>
                                <div className="h-2 w-2 bg-white rounded-full"></div>
                              </div>
                              <p className="text-3xl font-black text-white">
                                {activeRecord.teamStats.points.toLocaleString()}
                              </p>
                              <p className="text-xs text-blue-100 font-medium mt-1">
                                {(
                                  activeRecord.teamStats.points /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Defense Card */}
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 rounded-2xl border-2 border-red-200 dark:border-red-800 p-6 shadow-lg">
                          <h4 className="text-2xl font-black text-red-800 dark:text-red-200 flex items-center gap-3 mb-6">
                            <div className="bg-red-500 p-2 rounded-lg">
                              <ShieldCheck className="h-6 w-6 text-white" />
                            </div>
                            Defense
                          </h4>
                          <div className="space-y-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-700 shadow-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">
                                  Pass Yards Allowed
                                </p>
                                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                              </div>
                              <p className="text-3xl font-black text-red-900 dark:text-red-100">
                                {activeRecord.teamStats.defPassYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-500 font-medium mt-1">
                                {(
                                  activeRecord.teamStats.defPassYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game
                              </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-red-200 dark:border-red-700 shadow-md">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-red-700 dark:text-red-400 font-bold uppercase tracking-wider">
                                  Rush Yards Allowed
                                </p>
                                <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                              </div>
                              <p className="text-3xl font-black text-red-900 dark:text-red-100">
                                {activeRecord.teamStats.defRushYards.toLocaleString()}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-500 font-medium mt-1">
                                {(
                                  activeRecord.teamStats.defRushYards /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game
                              </p>
                            </div>
                            <div className="bg-gradient-to-r from-red-500 to-rose-500 p-4 rounded-xl shadow-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-white font-bold uppercase tracking-wider">
                                  Points Allowed
                                </p>
                                <div className="h-2 w-2 bg-white rounded-full"></div>
                              </div>
                              <p className="text-3xl font-black text-white">
                                {activeRecord.teamStats.defPoints.toLocaleString()}
                              </p>
                              <p className="text-xs text-red-100 font-medium mt-1">
                                {(
                                  activeRecord.teamStats.defPoints /
                                  getEffectiveGamesPlayed(activeRecord)
                                ).toFixed(1)}{" "}
                                per game
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team Leaders - Enhanced */}
                      {activeRecord.teamLeaders && (
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-2xl border-2 border-amber-200 dark:border-amber-800 p-6 shadow-lg">
                          <h4 className="text-2xl font-black flex items-center gap-3 mb-6">
                            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 p-2 rounded-lg shadow-md">
                              <Star className="h-6 w-6 text-white" />
                            </div>
                            <span className="bg-gradient-to-r from-amber-700 to-yellow-600 bg-clip-text text-transparent">
                              Season Leaders
                            </span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Top Passer */}
                            {activeRecord.teamLeaders.passingLeaders.length >
                              0 && (
                              <div className="group relative overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 p-5 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-md hover:shadow-xl transition-all">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wider font-black">
                                      Passing Leader
                                    </p>
                                  </div>
                                  <p className="font-black text-lg text-blue-900 dark:text-blue-200 truncate mb-2">
                                    {
                                      activeRecord.teamLeaders.passingLeaders[0]
                                        .name
                                    }
                                  </p>
                                  <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                    <span className="text-2xl">
                                      {activeRecord.teamLeaders.passingLeaders[0].yards?.toLocaleString() ||
                                        0}
                                    </span>{" "}
                                    yds
                                  </div>
                                  <p className="text-xs text-blue-600 dark:text-blue-500 font-semibold mt-1">
                                    {activeRecord.teamLeaders.passingLeaders[0]
                                      .touchdowns || 0}{" "}
                                    TDs
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Top Rusher */}
                            {activeRecord.teamLeaders.rushingLeaders.length >
                              0 && (
                              <div className="group relative overflow-hidden bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 p-5 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-md hover:shadow-xl transition-all">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-green-400/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <p className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wider font-black">
                                      Rushing Leader
                                    </p>
                                  </div>
                                  <p className="font-black text-lg text-green-900 dark:text-green-200 truncate mb-2">
                                    {
                                      activeRecord.teamLeaders.rushingLeaders[0]
                                        .name
                                    }
                                  </p>
                                  <div className="text-sm font-bold text-green-700 dark:text-green-400">
                                    <span className="text-2xl">
                                      {activeRecord.teamLeaders.rushingLeaders[0].yards?.toLocaleString() ||
                                        0}
                                    </span>{" "}
                                    yds
                                  </div>
                                  <p className="text-xs text-green-600 dark:text-green-500 font-semibold mt-1">
                                    {activeRecord.teamLeaders.rushingLeaders[0]
                                      .touchdowns || 0}{" "}
                                    TDs
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Top Receiver */}
                            {activeRecord.teamLeaders.receivingLeaders.length >
                              0 && (
                              <div className="group relative overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 p-5 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-md hover:shadow-xl transition-all">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-400/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <p className="text-xs text-purple-700 dark:text-purple-400 uppercase tracking-wider font-black">
                                      Receiving Leader
                                    </p>
                                  </div>
                                  <p className="font-black text-lg text-purple-900 dark:text-purple-200 truncate mb-2">
                                    {
                                      activeRecord.teamLeaders
                                        .receivingLeaders[0].name
                                    }
                                  </p>
                                  <div className="text-sm font-bold text-purple-700 dark:text-purple-400">
                                    <span className="text-2xl">
                                      {activeRecord.teamLeaders
                                        .receivingLeaders[0].receptions || 0}
                                    </span>{" "}
                                    rec
                                  </div>
                                  <p className="text-xs text-purple-600 dark:text-purple-500 font-semibold mt-1">
                                    {activeRecord.teamLeaders.receivingLeaders[0].yards?.toLocaleString() ||
                                      0}{" "}
                                    yds
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Top Tackler */}
                            {activeRecord.teamLeaders.tackleLeaders.length >
                              0 && (
                              <div className="group relative overflow-hidden bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 p-5 rounded-xl border-2 border-red-300 dark:border-red-700 shadow-md hover:shadow-xl transition-all">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-red-400/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <p className="text-xs text-red-700 dark:text-red-400 uppercase tracking-wider font-black">
                                      Tackle Leader
                                    </p>
                                  </div>
                                  <p className="font-black text-lg text-red-900 dark:text-red-200 truncate mb-2">
                                    {
                                      activeRecord.teamLeaders.tackleLeaders[0]
                                        .name
                                    }
                                  </p>
                                  <div className="text-sm font-bold text-red-700 dark:text-red-400">
                                    <span className="text-2xl">
                                      {activeRecord.teamLeaders.tackleLeaders[0]
                                        .total || 0}
                                    </span>{" "}
                                    tackles
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-block p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                        <BarChart2 className="h-16 w-16 text-gray-400 dark:text-gray-600" />
                      </div>
                      <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                        No team stats available for this season
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Stats will appear here when they are entered in the Team
                        Stats page
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
                          .sort((a, b) => a.round - b.round)
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
