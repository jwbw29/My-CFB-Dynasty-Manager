"use client";

import React, { useMemo, useCallback, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Game } from "@/types/yearRecord";
import { useDynasty } from "@/contexts/DynastyContext";
import { ChevronUp, ChevronDown, Plus } from "lucide-react";

interface TeamStatsData {
  gamesPlayed: number;
  // Offense
  totalOffense: number;
  passYards: number;
  rushYards: number;
  points: number;
  // Defense
  totalDefense: number;
  defPassYards: number;
  defRushYards: number;
  defPoints: number;
}

interface TeamLeaderStats {
  // Passing
  passingLeaders: PlayerLeaderStat[];
  // Rushing
  rushingLeaders: PlayerLeaderStat[];
  // Receiving
  receivingLeaders: PlayerLeaderStat[];
  // Tackles
  tackleLeaders: PlayerLeaderStat[];
  // TFLs
  tflLeaders: PlayerLeaderStat[];
  // Sacks
  sackLeaders: PlayerLeaderStat[];
  // Interceptions
  intLeaders: PlayerLeaderStat[];
}

interface PlayerLeaderStat {
  name: string;
  // Passing
  yards?: number;
  completions?: number;
  attempts?: number;
  touchdowns?: number;
  interceptions?: number;
  // Rushing
  carries?: number;
  // Receiving
  receptions?: number;
  // Defense
  total?: number;
  perGame?: number;
}

interface RosterPlayer {
  id: number;
  name: string;
  position: string;
  jerseyNumber: string;
  year: string;
  rating: string;
  devTrait?: string;
  notes?: string;
}

const TeamStats: React.FC = () => {
  const { currentDynastyId } = useDynasty();
  const [currentYear] = useLocalStorage<number>(
    "currentYear",
    new Date().getFullYear()
  );
  const [schedule] = useLocalStorage<Game[]>(`schedule_${currentYear}`, []);
  const [rosterPlayers] = useLocalStorage<RosterPlayer[]>("players", []);
  const [teamStats, setTeamStats] = useLocalStorage<TeamStatsData>(
    `teamStats_${currentDynastyId}_${currentYear}`,
    {
      gamesPlayed: 0,
      totalOffense: 0,
      passYards: 0,
      rushYards: 0,
      points: 0,
      totalDefense: 0,
      defPassYards: 0,
      defRushYards: 0,
      defPoints: 0,
    }
  );

  const [teamLeaders, setTeamLeaders] = useLocalStorage<TeamLeaderStats>(
    `teamLeaders_${currentDynastyId}_${currentYear}`,
    {
      passingLeaders: [],
      rushingLeaders: [],
      receivingLeaders: [],
      tackleLeaders: [],
      tflLeaders: [],
      sackLeaders: [],
      intLeaders: [],
    }
  );

  // Persistent sorting state per category
  const [sortConfigs, setSortConfigs] = useLocalStorage<
    Record<
      keyof TeamLeaderStats,
      { field: string | null; direction: "asc" | "desc" }
    >
  >(`teamLeaderSorts_${currentDynastyId}_${currentYear}`, {
    passingLeaders: { field: null, direction: "desc" },
    rushingLeaders: { field: null, direction: "desc" },
    receivingLeaders: { field: null, direction: "desc" },
    tackleLeaders: { field: null, direction: "desc" },
    tflLeaders: { field: null, direction: "desc" },
    sackLeaders: { field: null, direction: "desc" },
    intLeaders: { field: null, direction: "desc" },
  });

  // Add mode state for team stats inputs
  const [addModeStates, setAddModeStates] = React.useState<
    Record<keyof TeamStatsData, boolean>
  >({
    gamesPlayed: false,
    totalOffense: false,
    passYards: false,
    rushYards: false,
    points: false,
    totalDefense: false,
    defPassYards: false,
    defRushYards: false,
    defPoints: false,
  });

  // Temporary add values state
  const [addValues, setAddValues] = React.useState<
    Record<keyof TeamStatsData, string>
  >({
    gamesPlayed: "",
    totalOffense: "",
    passYards: "",
    rushYards: "",
    points: "",
    totalDefense: "",
    defPassYards: "",
    defRushYards: "",
    defPoints: "",
  });

  // Add mode state for team leaders inputs
  const [leaderAddModeStates, setLeaderAddModeStates] = React.useState<
    Record<string, boolean>
  >({});

  // Temporary add values state for team leaders
  const [leaderAddValues, setLeaderAddValues] = React.useState<
    Record<string, string>
  >({});

  // Calculate games played from schedule (excluding BYE weeks)
  const calculatedGamesPlayed = useMemo(() => {
    return schedule.filter(
      (game) =>
        game.result !== "Bye" && game.result !== "N/A" && game.score !== ""
    ).length;
  }, [schedule]);

  // Use calculated games played if user input is 0
  const effectiveGamesPlayed = teamStats.gamesPlayed || calculatedGamesPlayed;

  // Calculated fields
  const calculations = useMemo(() => {
    const gp = effectiveGamesPlayed || 1; // Prevent division by zero

    return {
      // Per game stats
      totalOffensePerGame: teamStats.totalOffense / gp,
      passYardsPerGame: teamStats.passYards / gp,
      rushYardsPerGame: teamStats.rushYards / gp,
      pointsPerGame: teamStats.points / gp,
      totalDefensePerGame: teamStats.totalDefense / gp,
      defPassYardsPerGame: teamStats.defPassYards / gp,
      defRushYardsPerGame: teamStats.defRushYards / gp,
      defPointsPerGame: teamStats.defPoints / gp,

      // Percentages
      avgMarginOfVictory: (teamStats.points - teamStats.defPoints) / gp,
      rushYardsPercent: teamStats.totalOffense
        ? (teamStats.rushYards / teamStats.totalOffense) * 100
        : 0,
      passYardsPercent: teamStats.totalOffense
        ? (teamStats.passYards / teamStats.totalOffense) * 100
        : 0,
      allowedRushYardsPercent: teamStats.totalDefense
        ? (teamStats.defRushYards / teamStats.totalDefense) * 100
        : 0,
      allowedPassYardsPercent: teamStats.totalDefense
        ? (teamStats.defPassYards / teamStats.totalDefense) * 100
        : 0,
    };
  }, [teamStats, effectiveGamesPlayed]);

  const handleStatsChange = useCallback(
    (field: keyof TeamStatsData, value: string) => {
      const numValue = parseInt(value) || 0;
      setTeamStats((prev) => ({
        ...prev,
        [field]: numValue,
      }));
    },
    [setTeamStats]
  );

  // Handle entering add mode
  const handleAddModeToggle = useCallback(
    (field: keyof TeamStatsData) => {
      setAddModeStates((prev) => ({
        ...prev,
        [field]: !prev[field],
      }));
      // Clear the add value when toggling off
      if (addModeStates[field]) {
        setAddValues((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
    },
    [addModeStates]
  );

  // Handle add value change
  const handleAddValueChange = useCallback(
    (field: keyof TeamStatsData, value: string) => {
      setAddValues((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  // Handle adding value to existing stat
  const handleAddToStat = useCallback(
    (field: keyof TeamStatsData) => {
      const addValue = parseInt(addValues[field]) || 0;
      if (addValue !== 0) {
        setTeamStats((prev) => ({
          ...prev,
          [field]: prev[field] + addValue,
        }));
      }
      // Reset add mode and clear value
      setAddModeStates((prev) => ({
        ...prev,
        [field]: false,
      }));
      setAddValues((prev) => ({
        ...prev,
        [field]: "",
      }));
    },
    [addValues, setTeamStats]
  );

  // Handle canceling add mode
  const handleCancelAdd = useCallback((field: keyof TeamStatsData) => {
    setAddModeStates((prev) => ({
      ...prev,
      [field]: false,
    }));
    setAddValues((prev) => ({
      ...prev,
      [field]: "",
    }));
  }, []);

  // Team Leaders add functionality
  const getLeaderKey = (
    category: keyof TeamLeaderStats,
    index: number,
    field: string
  ) => {
    return `${category}_${index}_${field}`;
  };

  const handleLeaderAddModeToggle = useCallback(
    (category: keyof TeamLeaderStats, index: number, field: string) => {
      const key = getLeaderKey(category, index, field);
      setLeaderAddModeStates((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
      // Clear the add value when toggling off
      if (leaderAddModeStates[key]) {
        setLeaderAddValues((prev) => ({
          ...prev,
          [key]: "",
        }));
      }
    },
    [leaderAddModeStates]
  );

  const handleLeaderAddValueChange = useCallback(
    (
      category: keyof TeamLeaderStats,
      index: number,
      field: string,
      value: string
    ) => {
      const key = getLeaderKey(category, index, field);
      setLeaderAddValues((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handleLeaderAddToStat = useCallback(
    (category: keyof TeamLeaderStats, index: number, field: string) => {
      const key = getLeaderKey(category, index, field);
      const addValue = parseFloat(leaderAddValues[key]) || 0;

      if (addValue !== 0) {
        setTeamLeaders((prev) => {
          const leaders = [...(prev[category] || [])];
          if (!leaders[index]) {
            leaders[index] = { name: "" };
          }

          const currentValue =
            (leaders[index][field as keyof PlayerLeaderStat] as number) || 0;
          (leaders[index] as any)[field] = currentValue + addValue;

          return {
            ...prev,
            [category]: leaders,
          };
        });
      }

      // Reset add mode and clear value
      setLeaderAddModeStates((prev) => ({
        ...prev,
        [key]: false,
      }));
      setLeaderAddValues((prev) => ({
        ...prev,
        [key]: "",
      }));
    },
    [leaderAddValues, setTeamLeaders]
  );

  const handleLeaderCancelAdd = useCallback(
    (category: keyof TeamLeaderStats, index: number, field: string) => {
      const key = getLeaderKey(category, index, field);
      setLeaderAddModeStates((prev) => ({
        ...prev,
        [key]: false,
      }));
      setLeaderAddValues((prev) => ({
        ...prev,
        [key]: "",
      }));
    },
    []
  );

  const handleLeaderChange = useCallback(
    (
      category: keyof TeamLeaderStats,
      index: number,
      field: keyof PlayerLeaderStat,
      value: string
    ) => {
      setTeamLeaders((prev) => {
        const leaders = [...(prev[category] || [])];
        if (!leaders[index]) {
          leaders[index] = { name: "" };
        }

        if (field === "name") {
          leaders[index][field] = value;
        } else {
          leaders[index][field] = parseFloat(value) || 0;
        }

        return {
          ...prev,
          [category]: leaders,
        };
      });
    },
    [setTeamLeaders]
  );

  const addLeaderRow = useCallback(
    (category: keyof TeamLeaderStats) => {
      setTeamLeaders((prev) => ({
        ...prev,
        [category]: [...(prev[category] || []), { name: "" }],
      }));
    },
    [setTeamLeaders]
  );

  const removeLeaderRow = useCallback(
    (category: keyof TeamLeaderStats, index: number) => {
      setTeamLeaders((prev) => {
        const leaders = [...(prev[category] || [])];
        leaders.splice(index, 1);
        return {
          ...prev,
          [category]: leaders,
        };
      });
    },
    [setTeamLeaders]
  );

  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  // Get sorted players for dropdown
  const getSortedPlayers = () => {
    return rosterPlayers.sort(
      (a, b) =>
        (parseInt(a.jerseyNumber) || 0) - (parseInt(b.jerseyNumber) || 0)
    );
  };

  // Sorting functionality
  const handleSort = (category: keyof TeamLeaderStats, field: string) => {
    const currentSort = sortConfigs[category];
    let direction: "asc" | "desc" = "desc";
    let sortField = field;

    if (currentSort.field === field && currentSort.direction === "desc") {
      direction = "asc";
    } else if (currentSort.field === field && currentSort.direction === "asc") {
      // Clear sorting if clicking the same ascending field
      sortField = "";
    }

    // Apply sorting immediately to the team leaders data
    const leaders = teamLeaders[category] || [];
    let sortedLeaders = [...leaders];

    if (sortField) {
      sortedLeaders = sortedLeaders.sort((a, b) => {
        let aVal, bVal;

        // Handle calculated fields
        if (sortField === "ypg") {
          aVal = (a.yards || 0) / effectiveGamesPlayed;
          bVal = (b.yards || 0) / effectiveGamesPlayed;
        } else if (sortField === "ypc_rushing") {
          aVal = (a.yards || 0) / (a.carries || 1);
          bVal = (b.yards || 0) / (b.carries || 1);
        } else if (sortField === "ypc_receiving") {
          aVal = (a.yards || 0) / (a.receptions || 1);
          bVal = (b.yards || 0) / (b.receptions || 1);
        } else if (sortField === "per_game") {
          aVal = (a.total || 0) / effectiveGamesPlayed;
          bVal = (b.total || 0) / effectiveGamesPlayed;
        } else {
          // Handle regular fields
          aVal = a[sortField as keyof PlayerLeaderStat];
          bVal = b[sortField as keyof PlayerLeaderStat];
        }

        if (sortField === "name") {
          const aStr = (aVal as string) || "";
          const bStr = (bVal as string) || "";
          return direction === "asc"
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
        }

        const aNum = Number(aVal) || 0;
        const bNum = Number(bVal) || 0;

        return direction === "asc" ? aNum - bNum : bNum - aNum;
      });
    }

    // Update both the sorted data and the sort configuration
    setTeamLeaders((prev) => ({
      ...prev,
      [category]: sortedLeaders,
    }));

    setSortConfigs((prev) => ({
      ...prev,
      [category]: { field: sortField, direction },
    }));
  };

  const getSortedLeaders = (category: keyof TeamLeaderStats) => {
    // Simply return the leaders as they are - sorting is handled by handleSort
    return teamLeaders[category] || [];
  };

  const renderSortIcon = (category: keyof TeamLeaderStats, field: string) => {
    const sortConfig = sortConfigs[category];
    if (sortConfig.field !== field) {
      return null;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  // Custom input component with add functionality
  const StatsInputWithAdd: React.FC<{
    field: keyof TeamStatsData;
    value: number;
    placeholder?: string;
  }> = ({ field, value, placeholder }) => {
    const [localValue, setLocalValue] = React.useState<string>("");
    const isAddMode = addModeStates[field];
    const addValue = addValues[field];

    // Sync local value with prop value when it changes externally
    React.useEffect(() => {
      setLocalValue(
        value !== undefined && value !== null ? value.toString() : ""
      );
    }, [value]);

    const handleInputChange = (newValue: string) => {
      setLocalValue(newValue);
    };

    const handleInputBlur = () => {
      handleStatsChange(field, localValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleStatsChange(field, localValue);
        (e.target as HTMLInputElement).blur();
      }
    };

    if (isAddMode) {
      return (
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600 dark:text-gray-400 pointer-events-none">
            {value} +
          </div>
          <Input
            type="number"
            value={
              addValue !== undefined && addValue !== null
                ? addValue.toString()
                : ""
            }
            onChange={(e) => handleAddValueChange(field, e.target.value)}
            placeholder="0"
            className="pl-16 pr-16"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddToStat(field);
              } else if (e.key === "Escape") {
                handleCancelAdd(field);
              }
            }}
          />
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
            <button
              onClick={() => handleAddToStat(field)}
              className="w-6 h-6 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center justify-center"
              title="Add to current value (Enter)"
            >
              ✓
            </button>
            <button
              onClick={() => handleCancelAdd(field)}
              className="w-6 h-6 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 flex items-center justify-center"
              title="Cancel (Escape)"
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          type="number"
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8"
        />
        <button
          onClick={() => handleAddModeToggle(field)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          title="Add to current value"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Custom input component for team leaders with add functionality
  const LeaderInputWithAdd: React.FC<{
    category: keyof TeamLeaderStats;
    index: number;
    field: string;
    value: number | undefined;
    step?: string;
    className?: string;
  }> = ({ category, index, field, value, step, className }) => {
    const [localValue, setLocalValue] = React.useState<string>("");
    const key = getLeaderKey(category, index, field);
    const isAddMode = leaderAddModeStates[key];
    const addValue = leaderAddValues[key];

    // Sync local value with prop value when it changes externally
    React.useEffect(() => {
      setLocalValue(
        value !== undefined && value !== null ? value.toString() : ""
      );
    }, [value]);

    const handleInputChange = (newValue: string) => {
      setLocalValue(newValue);
    };

    const handleInputBlur = () => {
      handleLeaderChange(
        category,
        index,
        field as keyof PlayerLeaderStat,
        localValue
      );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleLeaderChange(
          category,
          index,
          field as keyof PlayerLeaderStat,
          localValue
        );
        (e.target as HTMLInputElement).blur();
      }
    };

    if (isAddMode) {
      return (
        <div className="relative">
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400 pointer-events-none">
            {value || 0} +
          </div>
          <Input
            type="number"
            step={step}
            value={
              addValue !== undefined && addValue !== null
                ? addValue.toString()
                : ""
            }
            onChange={(e) =>
              handleLeaderAddValueChange(category, index, field, e.target.value)
            }
            placeholder="0"
            className={`pl-12 pr-12 ${className}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLeaderAddToStat(category, index, field);
              } else if (e.key === "Escape") {
                handleLeaderCancelAdd(category, index, field);
              }
            }}
          />
          <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2 flex gap-0.5">
            <button
              onClick={() => handleLeaderAddToStat(category, index, field)}
              className="w-5 h-5 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center justify-center"
              title="Add to current value (Enter)"
            >
              ✓
            </button>
            <button
              onClick={() => handleLeaderCancelAdd(category, index, field)}
              className="w-5 h-5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 flex items-center justify-center"
              title="Cancel (Escape)"
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`${className} pr-8`}
        />
        <button
          onClick={() => handleLeaderAddModeToggle(category, index, field)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          title="Add to current value"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div
      id="MainContainer"
      className="flex flex-col items-center gap-6 space-y-6"
    >
      <div id="PageTitle" className="flex justify-center w-full">
        <h1 className="text-3xl font-bold">{currentYear} Team Stats</h1>
      </div>

      {/* Team Stats Section */}
      <Card
        id="TeamStats"
        className="max-w-2xl flex flex-col items-center w-full"
      >
        <CardHeader>
          <CardTitle>Team Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Games Played */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <Label>Games Played</Label>
              <Input
                type="number"
                value={teamStats.gamesPlayed}
                onChange={(e) =>
                  handleStatsChange("gamesPlayed", e.target.value)
                }
                className="w-full"
                placeholder={calculatedGamesPlayed.toString()}
              />
              <span className="text-sm text-muted-foreground">
                Auto: {calculatedGamesPlayed}
              </span>
            </div>

            {/* Stats Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Per Game</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Offense Section */}
                  <TableRow className="bg-blue-50 dark:bg-blue-900/20">
                    <TableCell className="font-semibold" colSpan={3}>
                      Offense
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>TOT OFF</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="totalOffense"
                        value={teamStats.totalOffense}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.totalOffensePerGame)}
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>Pass YDS</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="passYards"
                        value={teamStats.passYards}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.passYardsPerGame)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Rush YDS</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="rushYards"
                        value={teamStats.rushYards}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.rushYardsPerGame)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>PTS</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="points"
                        value={teamStats.points}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.pointsPerGame)}
                    </TableCell>
                  </TableRow>

                  {/* Defense Section */}
                  <TableRow className="bg-red-50 dark:bg-red-900/20">
                    <TableCell className="font-semibold" colSpan={3}>
                      Defense
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>TOT DEF</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="totalDefense"
                        value={teamStats.totalDefense}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.totalDefensePerGame)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pass YDS</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="defPassYards"
                        value={teamStats.defPassYards}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.defPassYardsPerGame)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Rush YDS</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="defRushYards"
                        value={teamStats.defRushYards}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.defRushYardsPerGame)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>PTS</TableCell>
                    <TableCell>
                      <StatsInputWithAdd
                        field="defPoints"
                        value={teamStats.defPoints}
                      />
                    </TableCell>
                    <TableCell className="bg-gray-100 dark:bg-gray-800">
                      {formatNumber(calculations.defPointsPerGame)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Calculated Metrics */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Avg Margin of Victory</Label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                    {formatNumber(calculations.avgMarginOfVictory)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Rush Yards as % of Total</Label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                    {formatPercentage(calculations.rushYardsPercent)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Pass Yards as % of Total</Label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                    {formatPercentage(calculations.passYardsPercent)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">
                    Allowed Rush Yards as % of Total
                  </Label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                    {formatPercentage(calculations.allowedRushYardsPercent)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm">
                    Allowed Pass Yards as % of Total
                  </Label>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                    {formatPercentage(calculations.allowedPassYardsPercent)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offensive Team Leaders Section */}
      <Card
        id="OffenseTeamLeaders"
        className="flex flex-col items-center w-full"
      >
        <CardHeader>
          <CardTitle>Offensive Team Leaders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Passing Leaders */}
            <div>
              <h3 className="font-semibold text-lg bg-blue-100 dark:bg-blue-900 p-2 rounded">
                Passing
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[30%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("passingLeaders", "name")}
                    >
                      Name {renderSortIcon("passingLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("passingLeaders", "yards")}
                    >
                      YDS {renderSortIcon("passingLeaders", "yards")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() =>
                        handleSort("passingLeaders", "completions")
                      }
                    >
                      COMP% {renderSortIcon("passingLeaders", "completions")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("passingLeaders", "touchdowns")}
                    >
                      TDs {renderSortIcon("passingLeaders", "touchdowns")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() =>
                        handleSort("passingLeaders", "interceptions")
                      }
                    >
                      INTs {renderSortIcon("passingLeaders", "interceptions")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("passingLeaders", "ypg")}
                    >
                      YPG {renderSortIcon("passingLeaders", "ypg")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("passingLeaders")?.map((leader, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={leader.name || ""}
                          onValueChange={(value) =>
                            handleLeaderChange(
                              "passingLeaders",
                              index,
                              "name",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSortedPlayers().map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} - {player.position} #
                                {player.jerseyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="passingLeaders"
                          index={index}
                          field="yards"
                          value={leader.yards}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="passingLeaders"
                          index={index}
                          field="completions"
                          value={leader.completions}
                          step="0.1"
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="passingLeaders"
                          index={index}
                          field="touchdowns"
                          value={leader.touchdowns}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="passingLeaders"
                          index={index}
                          field="interceptions"
                          value={leader.interceptions}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.yards || 0) / effectiveGamesPlayed
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            removeLeaderRow("passingLeaders", index)
                          }
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={7}>
                      <button
                        onClick={() => addLeaderRow("passingLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Rushing Leaders */}
            <div>
              <h3 className="font-semibold text-lg bg-green-100 dark:bg-green-900 p-2 rounded">
                Rushing
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[30%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("rushingLeaders", "name")}
                    >
                      Name {renderSortIcon("rushingLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("rushingLeaders", "carries")}
                    >
                      CAR {renderSortIcon("rushingLeaders", "carries")}
                    </TableHead>
                    <TableHead
                      className="w-[18%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("rushingLeaders", "yards")}
                    >
                      YDS {renderSortIcon("rushingLeaders", "yards")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("rushingLeaders", "touchdowns")}
                    >
                      TDs {renderSortIcon("rushingLeaders", "touchdowns")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() =>
                        handleSort("rushingLeaders", "ypc_rushing")
                      }
                    >
                      YPC {renderSortIcon("rushingLeaders", "ypc_rushing")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("rushingLeaders", "ypg")}
                    >
                      YPG {renderSortIcon("rushingLeaders", "ypg")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("rushingLeaders")?.map((leader, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={leader.name || ""}
                          onValueChange={(value) =>
                            handleLeaderChange(
                              "rushingLeaders",
                              index,
                              "name",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSortedPlayers().map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} - {player.position} #
                                {player.jerseyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="rushingLeaders"
                          index={index}
                          field="carries"
                          value={leader.carries}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="rushingLeaders"
                          index={index}
                          field="yards"
                          value={leader.yards}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="rushingLeaders"
                          index={index}
                          field="touchdowns"
                          value={leader.touchdowns}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.yards || 0) / (leader.carries || 1)
                        )}
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.yards || 0) / effectiveGamesPlayed
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            removeLeaderRow("rushingLeaders", index)
                          }
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={7}>
                      <button
                        onClick={() => addLeaderRow("rushingLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Receiving Leaders */}
            <div>
              <h3 className="font-semibold text-lg bg-purple-100 dark:bg-purple-900 p-2 rounded">
                Receiving
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[30%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("receivingLeaders", "name")}
                    >
                      Name {renderSortIcon("receivingLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="w-[17%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() =>
                        handleSort("receivingLeaders", "receptions")
                      }
                    >
                      REC {renderSortIcon("receivingLeaders", "receptions")}
                    </TableHead>
                    <TableHead
                      className="w-[17%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("receivingLeaders", "yards")}
                    >
                      YDS {renderSortIcon("receivingLeaders", "yards")}
                    </TableHead>
                    <TableHead
                      className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() =>
                        handleSort("receivingLeaders", "touchdowns")
                      }
                    >
                      TDs {renderSortIcon("receivingLeaders", "touchdowns")}
                    </TableHead>
                    <TableHead
                      className="w-[11%] bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() =>
                        handleSort("receivingLeaders", "ypc_receiving")
                      }
                    >
                      YPC {renderSortIcon("receivingLeaders", "ypc_receiving")}
                    </TableHead>
                    <TableHead
                      className="w-[11%] bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("receivingLeaders", "ypg")}
                    >
                      YPG {renderSortIcon("receivingLeaders", "ypg")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("receivingLeaders")?.map(
                    (leader, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={leader.name || ""}
                            onValueChange={(value) =>
                              handleLeaderChange(
                                "receivingLeaders",
                                index,
                                "name",
                                value
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Player" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSortedPlayers().map((player) => (
                                <SelectItem key={player.id} value={player.name}>
                                  {player.name} - {player.position} #
                                  {player.jerseyNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <LeaderInputWithAdd
                            category="receivingLeaders"
                            index={index}
                            field="receptions"
                            value={leader.receptions}
                            className="text-center mx-auto pr-0"
                          />
                        </TableCell>
                        <TableCell>
                          <LeaderInputWithAdd
                            category="receivingLeaders"
                            index={index}
                            field="yards"
                            value={leader.yards}
                            className="text-center mx-auto pr-0"
                          />
                        </TableCell>
                        <TableCell>
                          <LeaderInputWithAdd
                            category="receivingLeaders"
                            index={index}
                            field="touchdowns"
                            value={leader.touchdowns}
                            className="text-center mx-auto pr-0"
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(
                            (leader.yards || 0) / (leader.receptions || 1)
                          )}
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(
                            (leader.yards || 0) / effectiveGamesPlayed
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() =>
                              removeLeaderRow("receivingLeaders", index)
                            }
                            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                            title="Remove Player"
                          >
                            ✕
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                  <TableRow>
                    <TableCell colSpan={7}>
                      <button
                        onClick={() => addLeaderRow("receivingLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defensive Team Leaders Section */}
      <Card
        id="DefenseTeamLeaders"
        className="flex flex-col items-center w-full"
      >
        <CardHeader className="flex flex-col items-center w-full">
          <CardTitle>Defensive Team Leaders</CardTitle>
        </CardHeader>
        <CardContent className="w-full">
          <div className="space-y-6">
            {/* DEFENSIVE LEADERS */}
            {/* Tackles */}
            <div className="">
              <h3 className="font-semibold text-lg bg-red-100 dark:bg-red-900 p-2 rounded">
                TAKs
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("tackleLeaders", "name")}
                    >
                      Name {renderSortIcon("tackleLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("tackleLeaders", "total")}
                    >
                      TOT {renderSortIcon("tackleLeaders", "total")}
                    </TableHead>
                    <TableHead
                      className="bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("tackleLeaders", "per_game")}
                    >
                      Per Game {renderSortIcon("tackleLeaders", "per_game")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("tackleLeaders")?.map((leader, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={leader.name || ""}
                          onValueChange={(value) =>
                            handleLeaderChange(
                              "tackleLeaders",
                              index,
                              "name",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSortedPlayers().map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} - {player.position} #
                                {player.jerseyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="tackleLeaders"
                          index={index}
                          field="total"
                          value={leader.total}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.total || 0) / effectiveGamesPlayed
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            removeLeaderRow("tackleLeaders", index)
                          }
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4}>
                      <button
                        onClick={() => addLeaderRow("tackleLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* TFLs */}
            <div>
              <h3 className="font-semibold text-lg bg-orange-100 dark:bg-orange-900 p-2 rounded">
                TFLs
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("tflLeaders", "name")}
                    >
                      Name {renderSortIcon("tflLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("tflLeaders", "total")}
                    >
                      TOT {renderSortIcon("tflLeaders", "total")}
                    </TableHead>
                    <TableHead
                      className="bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("tflLeaders", "per_game")}
                    >
                      Per Game {renderSortIcon("tflLeaders", "per_game")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("tflLeaders")?.map((leader, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={leader.name || ""}
                          onValueChange={(value) =>
                            handleLeaderChange(
                              "tflLeaders",
                              index,
                              "name",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSortedPlayers().map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} - {player.position} #
                                {player.jerseyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="tflLeaders"
                          index={index}
                          field="total"
                          value={leader.total}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.total || 0) / effectiveGamesPlayed
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => removeLeaderRow("tflLeaders", index)}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4}>
                      <button
                        onClick={() => addLeaderRow("tflLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Sacks */}
            <div>
              <h3 className="font-semibold text-lg bg-yellow-100 dark:bg-yellow-900 p-2 rounded">
                SACKS
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("sackLeaders", "name")}
                    >
                      Name {renderSortIcon("sackLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("sackLeaders", "total")}
                    >
                      TOT {renderSortIcon("sackLeaders", "total")}
                    </TableHead>
                    <TableHead
                      className="bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("sackLeaders", "per_game")}
                    >
                      Per Game {renderSortIcon("sackLeaders", "per_game")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("sackLeaders")?.map((leader, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={leader.name || ""}
                          onValueChange={(value) =>
                            handleLeaderChange(
                              "sackLeaders",
                              index,
                              "name",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSortedPlayers().map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} - {player.position} #
                                {player.jerseyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="sackLeaders"
                          index={index}
                          field="total"
                          value={leader.total}
                          step="0.5"
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.total || 0) / effectiveGamesPlayed
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => removeLeaderRow("sackLeaders", index)}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4}>
                      <button
                        onClick={() => addLeaderRow("sackLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Interceptions */}
            <div>
              <h3 className="font-semibold text-lg bg-indigo-100 dark:bg-indigo-900 p-2 rounded">
                INTs
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("intLeaders", "name")}
                    >
                      Name {renderSortIcon("intLeaders", "name")}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleSort("intLeaders", "total")}
                    >
                      TOT {renderSortIcon("intLeaders", "total")}
                    </TableHead>
                    <TableHead
                      className="bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => handleSort("intLeaders", "per_game")}
                    >
                      Per Game {renderSortIcon("intLeaders", "per_game")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedLeaders("intLeaders")?.map((leader, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={leader.name || ""}
                          onValueChange={(value) =>
                            handleLeaderChange(
                              "intLeaders",
                              index,
                              "name",
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {getSortedPlayers().map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {player.name} - {player.position} #
                                {player.jerseyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <LeaderInputWithAdd
                          category="intLeaders"
                          index={index}
                          field="total"
                          value={leader.total}
                          className="text-center mx-auto pr-0"
                        />
                      </TableCell>
                      <TableCell className="bg-gray-100 dark:bg-gray-800">
                        {formatNumber(
                          (leader.total || 0) / effectiveGamesPlayed
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => removeLeaderRow("intLeaders", index)}
                          className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded"
                          title="Remove Player"
                        >
                          ✕
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4}>
                      <button
                        onClick={() => addLeaderRow("intLeaders")}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Player
                      </button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamStats;
