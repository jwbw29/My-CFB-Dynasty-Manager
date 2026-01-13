// src/components/SchedulePage.tsx

"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { TeamLogo, ConferenceLogo } from "@/components/ui/TeamLogo";
import {
  getCurrentYear,
  getSchedule,
  setSchedule,
  setYearStats,
  calculateStats,
  getYearStats,
  getCoachProfile,
  getUserForTeam,
  getUsers,
} from "@/utils/localStorage";
import { getTeamData } from "@/utils/fbsTeams";
import { fcsTeams } from "@/utils/fcsTeams";
import {
  AlertCircle,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
} from "lucide-react";
import { CustomTeamManager } from "@/utils/customTeamManager";
import { useDynasty } from "@/contexts/DynastyContext"; // <-- IMPORT CONTEXT HOOK
import { Game } from "@/types/yearRecord";

type UpdateableField = "location" | "opponent" | "result" | "score";

const getWeekDisplayName = (weekNumber: number): string => {
  switch (weekNumber) {
    case 15:
      return "Conf. Champ";
    case 16:
      return "Army - Navy";
    case 17:
      return "Bowl Week 1";
    case 18:
      return "CFP Quarterfinals";
    case 19:
      return "CFP Semifinals";
    case 20:
      return "CFP National Championship";
    default:
      return `Week ${weekNumber}`;
  }
};

interface GameRowProps {
  game: Game;
  availableTeams: any[];
  onUpdateGame: (week: number, field: UpdateableField, value: any) => void;
  getRankForTeam: (teamName: string, week: number) => number | null;
  teamUsernameMap: Map<string, string>; // <-- Memoized username lookup
}

const GameRow = React.memo(
  ({
    game,
    availableTeams,
    onUpdateGame,
    getRankForTeam,
    teamUsernameMap,
  }: GameRowProps) => {
    const [localTeamScore, setLocalTeamScore] = useState("");
    const [localOppScore, setLocalOppScore] = useState("");

    // --- USE THE NEW PROP TO GET RANK ---
    const opponentRank = game.opponent
      ? getRankForTeam(game.opponent, game.week)
      : null;

    // Get username for opponent team using memoized map (avoids localStorage reads)
    const opponentUsername = game.opponent
      ? teamUsernameMap.get(game.opponent)
      : undefined;

    // Build opponent display name with rank (username will be styled separately)
    let opponentDisplayName = game.opponent;
    if (opponentRank) {
      opponentDisplayName = `#${opponentRank} ${opponentDisplayName}`;
    }

    useEffect(() => {
      if (game.score) {
        const [team, opp] = game.score.split("-").map((s) => s.trim());
        setLocalTeamScore(team || "");
        setLocalOppScore(opp || "");
      } else {
        setLocalTeamScore("");
        setLocalOppScore("");
      }
    }, [game.score]);

    const handleScoreInput = (type: "team" | "opp", value: string) => {
      if (value && !/^\d+$/.test(value)) return;
      if (type === "team") {
        setLocalTeamScore(value);
      } else {
        setLocalOppScore(value);
      }
    };

    const handleScoreBlur = () => {
      const newScore = `${localTeamScore}-${localOppScore}`;
      if (newScore !== game.score && (localTeamScore || localOppScore)) {
        onUpdateGame(game.week, "score", newScore);
      }
    };

    const getResultColor = (result: string) => {
      switch (result) {
        case "Win":
          return "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100";
        case "Loss":
          return "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100";
        case "Bye":
          return "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100";
        default:
          return "";
      }
    };

    const getResultIcon = (result: string) => {
      switch (result) {
        case "Win":
          return <Trophy className="w-4 h-4 text-green-600" />;
        case "Loss":
          return <TrendingDown className="w-4 h-4 text-red-600" />;
        case "Tie":
          return <Minus className="w-4 h-4 text-yellow-600" />;
        case "Bye":
          return <Calendar className="w-4 h-4 text-gray-500" />;
        default:
          return null;
      }
    };

    return (
      <div
        className="grid gap-2 py-2 items-center border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        style={{ gridTemplateColumns: "1fr 2fr 3fr 1fr 3fr 2fr" }}
      >
        <div className="text-sm font-medium">
          {getWeekDisplayName(game.week)}
        </div>
        <div>
          <Select
            value={game.location}
            onValueChange={(value) =>
              onUpdateGame(game.week, "location", value)
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="@">Away (@)</SelectItem>
              <SelectItem value="vs">Home (vs)</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value=" ">BYE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select
            value={game.opponent || "NONE"}
            onValueChange={(value) =>
              onUpdateGame(game.week, "opponent", value)
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select opponent">
                {game.opponent && game.opponent !== "BYE" && (
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={game.opponent} size="xs" />
                    <span>
                      {opponentDisplayName}
                      {opponentUsername && (
                        <span className="text-xs text-blue-600 font-medium">
                          {" "}
                          ({opponentUsername})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {game.opponent === "BYE" && <span>BYE</span>}
                {!game.opponent && <span>Select opponent</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="NONE">No Opponent</SelectItem>
              <SelectItem value="BYE">BYE</SelectItem>
              {availableTeams.map((team) => {
                const isCustom = CustomTeamManager.isCustomTeam(team.name);
                const isFCS = "isFCS" in team && team.isFCS;
                const teamUsername = teamUsernameMap.get(team.name);
                return (
                  <SelectItem key={team.name} value={team.name}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <TeamLogo teamName={team.name} size="xs" />
                        <span>
                          {team.name}
                          {teamUsername && (
                            <span
                              id="username"
                              className="text-xs text-blue-600 font-medium"
                            >
                              ({teamUsername})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <ConferenceLogo
                          conference={team.conference}
                          size="xs"
                        />
                        <span className="text-sm text-gray-500">
                          ({team.conference}) {isCustom && " 🎨"}
                          {isFCS && " (FCS)"}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select
            value={game.result}
            onValueChange={(value) => onUpdateGame(game.week, "result", value)}
          >
            <SelectTrigger className={`h-8 ${getResultColor(game.result)}`}>
              <SelectValue placeholder="Result">
                <div className="flex items-center gap-2">
                  {getResultIcon(game.result)}
                  <span>{game.result}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Win">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-600" />
                  Win
                </div>
              </SelectItem>
              <SelectItem value="Loss">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  Loss
                </div>
              </SelectItem>
              <SelectItem value="Tie">
                <div className="flex items-center gap-2">
                  <Minus className="w-4 h-4 text-yellow-600" />
                  Tie
                </div>
              </SelectItem>
              <SelectItem value="Bye">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Bye
                </div>
              </SelectItem>
              <SelectItem value="N/A">Not Played</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            value={localTeamScore}
            onChange={(e) => handleScoreInput("team", e.target.value)}
            onBlur={handleScoreBlur}
            placeholder="You"
            className="h-8 text-center w-20"
          />
          <span className="flex items-center">-</span>
          <Input
            value={localOppScore}
            onChange={(e) => handleScoreInput("opp", e.target.value)}
            onBlur={handleScoreBlur}
            placeholder="Opp."
            className="h-8 text-center w-20"
          />
        </div>
      </div>
    );
  }
);
GameRow.displayName = "GameRow";

const SchedulePage = () => {
  const [currentYear, setYear] = useState<number>(getCurrentYear());
  const [currentSchedule, setCurrentSchedule] = useState<Game[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [teamName, setTeamName] = useState<string>("Your Team");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- GET GLOBAL STATE AND ACTIONS FROM CONTEXT ---
  const { dataVersion, activeWeek, setActiveWeek, getRankingsForWeek } =
    useDynasty();

  const scheduleRef = useRef<Game[]>(currentSchedule);
  useEffect(() => {
    scheduleRef.current = currentSchedule;
  }, [currentSchedule]);

  const saveScheduleNow = useCallback(
    (scheduleToSave: Game[]) => {
      try {
        setSchedule(currentYear, scheduleToSave);
        const coachProfile = getCoachProfile();
        const schoolNameForStats = coachProfile?.schoolName || "";
        const calculatedStats = calculateStats(
          scheduleToSave,
          schoolNameForStats
        );
        const currentStats = getYearStats(currentYear);
        setYearStats(currentYear, { ...currentStats, ...calculatedStats });
      } catch (error) {
        console.error("Save failed:", error);
      }
    },
    [currentYear]
  );

  const teamData = useMemo(
    () => (teamName ? getTeamData(teamName) : null),
    [teamName, dataVersion]
  );
  const record = useMemo(() => {
    const wins = currentSchedule.filter((g) => g.result === "Win").length;
    const losses = currentSchedule.filter((g) => g.result === "Loss").length;
    const ties = currentSchedule.filter((g) => g.result === "Tie").length;
    return { wins, losses, ties };
  }, [currentSchedule]);

  const locationRecords = useMemo(() => {
    const calculate = (location: Game["location"]) => {
      const games = currentSchedule.filter(
        (g) =>
          g.location === location && g.result !== "N/A" && g.result !== "Bye"
      );
      return {
        wins: games.filter((g) => g.result === "Win").length,
        losses: games.filter((g) => g.result === "Loss").length,
        ties: games.filter((g) => g.result === "Tie").length,
      };
    };
    return {
      home: calculate("vs"),
      away: calculate("@"),
      neutral: calculate("neutral"),
    };
  }, [currentSchedule]);

  const debouncedSave = useCallback(() => {
    if (!hasUnsavedChanges || isSaving) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      // We pass `currentSchedule` directly to avoid stale closure issues
      saveScheduleNow(currentSchedule);
      setHasUnsavedChanges(false);
      setIsSaving(false);
    }, 1000); // Debounced for better performance and user experience
  }, [currentSchedule, hasUnsavedChanges, isSaving, saveScheduleNow]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      debouncedSave();
    }

    // Cleanup function runs when the component unmounts (e.g., user navigates away)
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // If there are unsaved changes when we leave, save them immediately
      if (unsavedChangesRef.current) {
        saveScheduleNow(scheduleRef.current);
      }
    };
  }, [hasUnsavedChanges, debouncedSave, saveScheduleNow]);

  const unsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    unsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const availableTeams = useMemo(() => {
    const allTeams = CustomTeamManager.getAllAvailableTeams();
    const fcsTeamsList = fcsTeams.map((team: any) => ({
      name: typeof team === "string" ? team : team.name,
      conference: typeof team === "string" ? "FCS" : team.conference || "FCS",
      isFCS: true,
    }));
    return [...allTeams, ...fcsTeamsList]
      .filter((team) => team && team.name)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, []);

  // Memoize username lookups for performance - eliminates ~2,940 localStorage reads on render
  const teamUsernameMap = useMemo(() => {
    const users = getUsers();
    const map = new Map<string, string>();
    users.forEach((user) => {
      if (user.currentTeamId) {
        map.set(user.currentTeamId, user.name);
      }
    });
    return map;
  }, [dataVersion]);

  useEffect(() => {
    const fetchData = () => {
      const year = getCurrentYear();
      setYear(year);
      const profile = getCoachProfile();
      setTeamName(profile?.schoolName || "Your Team");
      const schedule = getSchedule(year);
      if (schedule.length === 0) {
        const newSchedule: Game[] = Array.from({ length: 21 }, (_, i) => ({
          id: i,
          week: i,
          location: "neutral",
          opponent: "",
          result: "N/A",
          score: "",
        }));
        setSchedule(year, newSchedule);
        setCurrentSchedule(newSchedule);
      } else {
        setCurrentSchedule(schedule);
      }
    };
    fetchData();
  }, [dataVersion]);

  // Cache rankings Maps by week for performance
  const rankingsMapsCache = useRef<Map<number, Map<string, number>>>(new Map());

  // Optimized rank lookup using cached Maps for O(1) access
  const getRankForTeam = useCallback(
    (teamNameToRank: string, week: number) => {
      const cacheKey = week;

      // Check if we have a cached Map for this week
      if (!rankingsMapsCache.current.has(cacheKey)) {
        const rankings = getRankingsForWeek(currentYear, week);
        const rankMap = new Map(
          rankings.map((team, index) => [team.name, index + 1])
        );
        rankingsMapsCache.current.set(cacheKey, rankMap);
      }

      return (
        rankingsMapsCache.current.get(cacheKey)?.get(teamNameToRank) || null
      );
    },
    [currentYear, getRankingsForWeek]
  );

  // Clear rankings cache when year or data version changes
  useEffect(() => {
    rankingsMapsCache.current.clear();
  }, [currentYear, dataVersion]);

  const handleUpdateGame = useCallback(
    (week: number, field: UpdateableField, value: any) => {
      setCurrentSchedule((prevSchedule) => {
        const updatedSchedule = [...prevSchedule];
        const gameIndex = updatedSchedule.findIndex((g) => g.week === week);
        if (gameIndex === -1) return prevSchedule;

        const gameToUpdate = { ...updatedSchedule[gameIndex] };

        if (field === "result") {
          gameToUpdate.result = value;
          if (value === "Bye") {
            gameToUpdate.opponent = "BYE";
            gameToUpdate.score = "";
          }
          // Auto-set opponentUserId if opponent is user-controlled
          if (gameToUpdate.opponent) {
            const opponentUser = getUserForTeam(gameToUpdate.opponent);
            if (opponentUser) {
              gameToUpdate.opponentUserId = opponentUser.id;
            }
          }
        } else if (field === "opponent") {
          gameToUpdate.opponent = value === "NONE" ? "" : value;
          if (value === "BYE") {
            gameToUpdate.score = "";
          }
          // Auto-set opponentUserId if opponent is user-controlled
          const opponentUser = getUserForTeam(gameToUpdate.opponent);
          gameToUpdate.opponentUserId = opponentUser?.id;
        } else if (field === "score") {
          gameToUpdate.score = value;
          const [teamScore, oppScore] = value.split("-").map(Number);
          if (!isNaN(teamScore) && !isNaN(oppScore)) {
            gameToUpdate.result =
              teamScore > oppScore
                ? "Win"
                : oppScore > teamScore
                ? "Loss"
                : "Tie";
          }
          // Auto-set opponentUserId if opponent is user-controlled
          if (gameToUpdate.opponent) {
            const opponentUser = getUserForTeam(gameToUpdate.opponent);
            if (opponentUser) {
              gameToUpdate.opponentUserId = opponentUser.id;
            }
          }
        } else {
          gameToUpdate[field as "location"] = value;
        }

        updatedSchedule[gameIndex] = gameToUpdate;

        const lastCompletedGame = [...updatedSchedule]
          .reverse()
          .find((g) => g.result !== "N/A");
        const newActiveWeek = lastCompletedGame
          ? Math.min(lastCompletedGame.week + 1, 21)
          : 0;

        if (newActiveWeek !== activeWeek) {
          setActiveWeek(newActiveWeek);
        }

        // Mark as unsaved instead of immediate save - debounced save will handle it
        setHasUnsavedChanges(true);

        return updatedSchedule;
      });
    },
    [activeWeek, setActiveWeek]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-primary">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="flex items-center justify-start p-6 md:p-8 gap-6">
          {teamData && (
            <div className="relative bg-white rounded-full p-4">
              <TeamLogo teamName={teamData.name} size="3xl" />
            </div>
          )}

          {/* Title and Conference */}
          <div className="flex flex-col justify-center items-start text-center gap-2">
            <h1 className="text-4xl md:text-5xl leading-relaxed md:leading-relaxed font-black text-school-secondary flex items-center gap-3 justify-center">
              <Calendar className="h-10 w-10 text-school-secondary " />
              {currentYear} Schedule
            </h1>
            {teamData && teamData.conference && (
              <div className="flex items-center justify-center gap-2">
                <ConferenceLogo conference={teamData.conference} size="xl" />
                <span className="text-base font-semibold text-school-secondary">
                  {teamData.conference}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record cards grid - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall record */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
          <div className="bg-primary p-4">
            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5" />
              Overall
            </h3>
          </div>

          <CardContent className="p-6 text-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="text-5xl leading-relaxed md:leading-relaxed font-black text-blue-600 dark:text-blue-400">
              {record.wins}-{record.losses}
              {record.ties > 0 ? `-${record.ties}` : ""}
            </div>
            <div className="text-xs font-bold text-school-accent uppercase tracking-wider mt-2">
              Season Record
            </div>
          </CardContent>
        </Card>

        {/* Home record */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
          <div className="bg-primary p-4">
            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Home
            </h3>
          </div>

          <CardContent className="p-6 text-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="text-5xl leading-relaxed md:leading-relaxed font-black text-green-600 dark:text-green-400">
              {locationRecords.home.wins}-{locationRecords.home.losses}
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
              Home Record
            </div>
          </CardContent>
        </Card>

        {/* Away record */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
          <div className="bg-primary p-4">
            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Away
            </h3>
          </div>

          <CardContent className="p-6 text-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="text-5xl leading-relaxed md:leading-relaxed font-black text-red-600 dark:text-red-400">
              {locationRecords.away.wins}-{locationRecords.away.losses}
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
              Away Record
            </div>
          </CardContent>
        </Card>

        {/* Neutral site record */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
          <div className="bg-primary p-4">
            <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <Minus className="h-5 w-5" />
              Neutral
            </h3>
          </div>

          <CardContent className="p-6 text-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="text-5xl leading-relaxed md:leading-relaxed font-black text-purple-600 dark:text-purple-400">
              {locationRecords.neutral.wins}-{locationRecords.neutral.losses}
            </div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">
              Neutral Record
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule management table - Enhanced */}
      <Card className="border-2 overflow-hidden">
        <div className="bg-primary p-6">
          <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
            <Calendar className="h-7 w-7" />
            Schedule Management
          </CardTitle>
        </div>

        <CardContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          {/* Header Row */}
          <div
            className="grid gap-2 py-4 mb-2 border-b font-semibold text-sm text-gray-600 dark:text-gray-400"
            style={{ gridTemplateColumns: "1fr 2fr 3fr 1fr 3fr 2fr" }}
          >
            <div>Week</div>
            <div>Location</div>
            <div>Opponent</div>
            <div>Result</div>
            <div>Score</div>
            <div></div>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {currentSchedule.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                availableTeams={availableTeams}
                onUpdateGame={handleUpdateGame}
                getRankForTeam={getRankForTeam}
                teamUsernameMap={teamUsernameMap}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save indicator */}
      {isSaving && (
        <div className="flex justify-center items-center py-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Saving changes...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
