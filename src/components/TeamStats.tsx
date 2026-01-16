"use client";

import React, { useMemo, useCallback, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  Game,
  RecordsData,
  PlayerRecord,
  RecordType,
  RecordLevel,
} from "@/types/yearRecord";
import { useDynasty } from "@/contexts/DynastyContext";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { HeroHeader } from "@/components/ui/HeroHeader";
import { fbsTeams } from "@/utils/fbsTeams";
import { positions } from "@/types/playerTypes";

// Conference list
const conferences = [
  "ACC",
  "American",
  "Big 12",
  "Big Ten",
  "C-USA",
  "Independents",
  "MAC",
  "Mountain West",
  "Pac-12",
  "SEC",
  "Sun Belt",
];

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

  // Records state management
  const [records, setRecords] = useLocalStorage<RecordsData>(
    `records_${currentDynastyId}`,
    {
      career: [],
      season: [],
      game: [],
    }
  );

  // State for editing records
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<PlayerRecord | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Form state for adding new records
  const [newRecord, setNewRecord] = useState<{
    playerName: string;
    year: number;
    recordType: RecordType;
    levels: RecordLevel[];
    school: string;
    position: string;
    conference: string;
    stats: {
      passingYards: string;
      passingTDs: string;
      rushingYards: string;
      rushingTDs: string;
      receptions: string;
      receivingYards: string;
      receivingTDs: string;
      sacks: string;
      interceptions: string;
    };
  }>({
    playerName: "",
    year: currentYear,
    recordType: "career",
    levels: [],
    school: "",
    position: "",
    conference: "",
    stats: {
      passingYards: "",
      passingTDs: "",
      rushingYards: "",
      rushingTDs: "",
      receptions: "",
      receivingYards: "",
      receivingTDs: "",
      sacks: "",
      interceptions: "",
    },
  });

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

  // Records handlers
  const handleLevelToggle = useCallback((level: RecordLevel) => {
    setNewRecord((prev) => {
      const levels = prev.levels.includes(level)
        ? prev.levels.filter((l) => l !== level)
        : [...prev.levels, level];
      return { ...prev, levels };
    });
  }, []);

  const handleStatChange = useCallback(
    (stat: keyof typeof newRecord.stats, value: string) => {
      setNewRecord((prev) => ({
        ...prev,
        stats: { ...prev.stats, [stat]: value },
      }));
    },
    []
  );

  const handleAddRecord = useCallback(() => {
    if (!newRecord.playerName.trim()) {
      return;
    }

    // Check if at least one stat has a value
    const hasStats = Object.values(newRecord.stats).some((val) => val !== "");
    if (!hasStats) {
      return;
    }

    // Convert string stats to numbers
    const stats: PlayerRecord["stats"] = {};
    Object.entries(newRecord.stats).forEach(([key, value]) => {
      if (value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          stats[key as keyof PlayerRecord["stats"]] = numValue;
        }
      }
    });

    const record: PlayerRecord = {
      id: Date.now().toString(),
      playerName: newRecord.playerName,
      year: newRecord.year,
      recordType: newRecord.recordType,
      levels: newRecord.levels,
      school: newRecord.school || undefined,
      position: newRecord.position || undefined,
      conference: newRecord.conference || undefined,
      stats,
    };

    setRecords((prev) => ({
      ...prev,
      [newRecord.recordType]: [...prev[newRecord.recordType], record],
    }));

    // Reset form
    setNewRecord({
      playerName: "",
      year: currentYear,
      recordType: "career",
      levels: [],
      school: "",
      position: "",
      conference: "",
      stats: {
        passingYards: "",
        passingTDs: "",
        rushingYards: "",
        rushingTDs: "",
        receptions: "",
        receivingYards: "",
        receivingTDs: "",
        sacks: "",
        interceptions: "",
      },
    });
  }, [newRecord, setRecords]);

  const handleDeleteRecord = useCallback(
    (recordType: RecordType, recordId: string) => {
      setRecords((prev) => ({
        ...prev,
        [recordType]: prev[recordType].filter((r) => r.id !== recordId),
      }));
    },
    [setRecords]
  );

  // Handle starting to edit a record
  const handleEditRecord = useCallback((record: PlayerRecord) => {
    setEditingRecordId(record.id);
    setEditingRecord({ ...record });
  }, []);

  // Handle canceling edit
  const handleCancelEdit = useCallback(() => {
    setEditingRecordId(null);
    setEditingRecord(null);
  }, []);

  // Handle saving edited record
  const handleSaveEdit = useCallback(() => {
    if (!editingRecord) return;

    setRecords((prev) => ({
      ...prev,
      [editingRecord.recordType]: prev[editingRecord.recordType].map((r) =>
        r.id === editingRecord.id ? editingRecord : r
      ),
    }));

    setEditingRecordId(null);
    setEditingRecord(null);
  }, [editingRecord, setRecords]);

  // Handle updating editing record fields
  const handleEditFieldChange = useCallback(
    (field: keyof PlayerRecord, value: any) => {
      if (!editingRecord) return;
      setEditingRecord((prev) => (prev ? { ...prev, [field]: value } : null));
    },
    [editingRecord]
  );

  // Handle updating editing record stats
  const handleEditStatChange = useCallback(
    (stat: keyof PlayerRecord["stats"], value: string) => {
      if (!editingRecord) return;
      const numValue = value === "" ? undefined : Number(value);
      setEditingRecord((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                [stat]: numValue,
              },
            }
          : null
      );
    },
    [editingRecord]
  );

  // Helper to get records by type and level
  const getRecordsByLevel = useCallback(
    (recordType: RecordType, level: RecordLevel) => {
      return records[recordType].filter((record) =>
        record.levels.includes(level)
      );
    },
    [records]
  );

  // Helper to render stat categories for a record
  const renderRecordStats = (record: PlayerRecord) => {
    const statLabels: Record<keyof PlayerRecord["stats"], string> = {
      passingYards: "Passing Yards",
      passingTDs: "Passing TDs",
      rushingYards: "Rushing Yards",
      rushingTDs: "Rushing TDs",
      receptions: "Receptions",
      receivingYards: "Receiving Yards",
      receivingTDs: "Receiving TDs",
      sacks: "Sacks",
      interceptions: "Interceptions",
    };

    return Object.entries(record.stats)
      .filter(([_, value]) => value !== undefined && value > 0)
      .map(([key, value]) => (
        <div key={key} className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {statLabels[key as keyof PlayerRecord["stats"]]}:
          </span>
          <span className="font-semibold">{value?.toLocaleString()}</span>
        </div>
      ));
  };

  const renderEditableRecordStats = (record: PlayerRecord) => {
    const statLabels: Record<keyof PlayerRecord["stats"], string> = {
      passingYards: "Passing Yards",
      passingTDs: "Passing TDs",
      rushingYards: "Rushing Yards",
      rushingTDs: "Rushing TDs",
      receptions: "Receptions",
      receivingYards: "Receiving Yards",
      receivingTDs: "Receiving TDs",
      sacks: "Sacks",
      interceptions: "Interceptions",
    };

    return Object.entries(statLabels).map(([key, label]) => {
      const statKey = key as keyof PlayerRecord["stats"];
      const value = record.stats[statKey];

      return (
        <div key={key} className="flex justify-between items-center gap-2">
          <span className="text-sm text-muted-foreground">{label}:</span>
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) => handleEditStatChange(statKey, e.target.value)}
            className="w-24 h-7 text-sm"
            placeholder="0"
          />
        </div>
      );
    });
  };

  // Render records section by level
  const renderRecordsSection = (
    recordType: RecordType,
    level: RecordLevel,
    title: string
  ) => {
    const levelRecords = getRecordsByLevel(recordType, level);

    return (
      <div>
        <h3 className="font-semibold text-lg mb-3">{title}</h3>
        {levelRecords.length > 0 ? (
          <div className="space-y-3">
            {levelRecords.map((record) => {
              const isEditing = editingRecordId === record.id;
              const displayRecord = isEditing ? editingRecord : record;

              if (!displayRecord) return null;

              return (
                <Card key={record.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={displayRecord.playerName}
                            onChange={(e) =>
                              handleEditFieldChange(
                                "playerName",
                                e.target.value
                              )
                            }
                            className="font-bold text-lg"
                            placeholder="Player name"
                          />
                          <div className="flex gap-2">
                            <Select
                              value={displayRecord.position || ""}
                              onValueChange={(value) =>
                                handleEditFieldChange("position", value)
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Position" />
                              </SelectTrigger>
                              <SelectContent>
                                {positions.map((pos) => (
                                  <SelectItem key={pos} value={pos}>
                                    {pos}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={displayRecord.school || ""}
                              onValueChange={(value) =>
                                handleEditFieldChange("school", value)
                              }
                            >
                              <SelectTrigger className="text-sm flex-1">
                                <SelectValue placeholder="School" />
                              </SelectTrigger>
                              <SelectContent>
                                {fbsTeams.map((team) => (
                                  <SelectItem key={team.name} value={team.name}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Select
                            value={displayRecord.conference || ""}
                            onValueChange={(value) =>
                              handleEditFieldChange("conference", value)
                            }
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Conference" />
                            </SelectTrigger>
                            <SelectContent>
                              {conferences.map((conf) => (
                                <SelectItem key={conf} value={conf}>
                                  {conf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={displayRecord.year}
                            onChange={(e) =>
                              handleEditFieldChange(
                                "year",
                                Number(e.target.value)
                              )
                            }
                            className="text-sm w-24"
                            placeholder="Year"
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-lg">
                            {displayRecord.playerName}
                          </h4>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            {displayRecord.position && displayRecord.school ? (
                              <p>
                                {displayRecord.position} •{" "}
                                {displayRecord.school}
                              </p>
                            ) : (
                              <>
                                {displayRecord.position && (
                                  <p>{displayRecord.position}</p>
                                )}
                                {displayRecord.school && (
                                  <p>{displayRecord.school}</p>
                                )}
                              </>
                            )}
                            {displayRecord.conference && (
                              <p>{displayRecord.conference}</p>
                            )}
                            <p>{displayRecord.year}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600"
                            onClick={handleSaveEdit}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() =>
                              handleDeleteRecord(recordType, record.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {isEditing
                      ? renderEditableRecordStats(displayRecord)
                      : renderRecordStats(displayRecord)}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No records yet</p>
        )}
      </div>
    );
  };

  return (
    <div
      id="MainContainer"
      className="flex flex-col items-center gap-6 space-y-8"
    >
      {/* Hero Header */}
      <HeroHeader title="Stats & Records" className="w-full" />

      <Tabs
        defaultValue="stats"
        className="flex flex-col items-center gap-6 space-y-6 w-full"
      >
        {/* Tabs List  */}
        <TabsList className="">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        {/* Stats Page */}
        <TabsContent
          value="stats"
          className="flex flex-col items-center gap-6 w-full"
        >
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
                          <Input
                            type="number"
                            value={teamStats.totalOffense || ""}
                            onChange={(e) =>
                              handleStatsChange("totalOffense", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(calculations.totalOffensePerGame)}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell>Pass YDS</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={teamStats.passYards || ""}
                            onChange={(e) =>
                              handleStatsChange("passYards", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(calculations.passYardsPerGame)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Rush YDS</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={teamStats.rushYards || ""}
                            onChange={(e) =>
                              handleStatsChange("rushYards", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(calculations.rushYardsPerGame)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>PTS</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={teamStats.points || ""}
                            onChange={(e) =>
                              handleStatsChange("points", e.target.value)
                            }
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
                          <Input
                            type="number"
                            value={teamStats.totalDefense || ""}
                            onChange={(e) =>
                              handleStatsChange("totalDefense", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(calculations.totalDefensePerGame)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Pass YDS</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={teamStats.defPassYards || ""}
                            onChange={(e) =>
                              handleStatsChange("defPassYards", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(calculations.defPassYardsPerGame)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Rush YDS</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={teamStats.defRushYards || ""}
                            onChange={(e) =>
                              handleStatsChange("defRushYards", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="bg-gray-100 dark:bg-gray-800">
                          {formatNumber(calculations.defRushYardsPerGame)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>PTS</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={teamStats.defPoints || ""}
                            onChange={(e) =>
                              handleStatsChange("defPoints", e.target.value)
                            }
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
                      <Label className="text-sm">
                        Rush Yards as % of Total
                      </Label>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                        {formatPercentage(calculations.rushYardsPercent)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">
                        Pass Yards as % of Total
                      </Label>
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

            <CardContent className="w-full px-24">
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
                          COMP%{" "}
                          {renderSortIcon("passingLeaders", "completions")}
                        </TableHead>
                        <TableHead
                          className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() =>
                            handleSort("passingLeaders", "touchdowns")
                          }
                        >
                          TDs {renderSortIcon("passingLeaders", "touchdowns")}
                        </TableHead>
                        <TableHead
                          className="w-[14%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() =>
                            handleSort("passingLeaders", "interceptions")
                          }
                        >
                          INTs{" "}
                          {renderSortIcon("passingLeaders", "interceptions")}
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
                      {getSortedLeaders("passingLeaders")?.map(
                        (leader, index) => (
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
                                    <SelectItem
                                      key={player.id}
                                      value={player.name}
                                    >
                                      {player.name} - {player.position} #
                                      {player.jerseyNumber}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.yards || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "passingLeaders",
                                    index,
                                    "yards",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.1"
                                value={leader.completions || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "passingLeaders",
                                    index,
                                    "completions",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.touchdowns || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "passingLeaders",
                                    index,
                                    "touchdowns",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.interceptions || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "passingLeaders",
                                    index,
                                    "interceptions",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
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
                        )
                      )}
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
                          onClick={() =>
                            handleSort("rushingLeaders", "carries")
                          }
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
                          onClick={() =>
                            handleSort("rushingLeaders", "touchdowns")
                          }
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
                      {getSortedLeaders("rushingLeaders")?.map(
                        (leader, index) => (
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
                                    <SelectItem
                                      key={player.id}
                                      value={player.name}
                                    >
                                      {player.name} - {player.position} #
                                      {player.jerseyNumber}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.carries || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "rushingLeaders",
                                    index,
                                    "carries",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.yards || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "rushingLeaders",
                                    index,
                                    "yards",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.touchdowns || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "rushingLeaders",
                                    index,
                                    "touchdowns",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
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
                        )
                      )}
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
                          onClick={() =>
                            handleSort("receivingLeaders", "yards")
                          }
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
                          YPC{" "}
                          {renderSortIcon("receivingLeaders", "ypc_receiving")}
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
                                    <SelectItem
                                      key={player.id}
                                      value={player.name}
                                    >
                                      {player.name} - {player.position} #
                                      {player.jerseyNumber}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.receptions || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "receivingLeaders",
                                    index,
                                    "receptions",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.yards || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "receivingLeaders",
                                    index,
                                    "yards",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.touchdowns || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "receivingLeaders",
                                    index,
                                    "touchdowns",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
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
            <CardContent className="w-full px-24">
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
                          onClick={() =>
                            handleSort("tackleLeaders", "per_game")
                          }
                        >
                          Per Game {renderSortIcon("tackleLeaders", "per_game")}
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSortedLeaders("tackleLeaders")?.map(
                        (leader, index) => (
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
                                    <SelectItem
                                      key={player.id}
                                      value={player.name}
                                    >
                                      {player.name} - {player.position} #
                                      {player.jerseyNumber}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={leader.total || ""}
                                onChange={(e) =>
                                  handleLeaderChange(
                                    "tackleLeaders",
                                    index,
                                    "total",
                                    e.target.value
                                  )
                                }
                                className="text-center mx-auto"
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
                        )
                      )}
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
                                  <SelectItem
                                    key={player.id}
                                    value={player.name}
                                  >
                                    {player.name} - {player.position} #
                                    {player.jerseyNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={leader.total || ""}
                              onChange={(e) =>
                                handleLeaderChange(
                                  "tflLeaders",
                                  index,
                                  "total",
                                  e.target.value
                                )
                              }
                              className="text-center mx-auto"
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
                                removeLeaderRow("tflLeaders", index)
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
                                  <SelectItem
                                    key={player.id}
                                    value={player.name}
                                  >
                                    {player.name} - {player.position} #
                                    {player.jerseyNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.5"
                              value={leader.total || ""}
                              onChange={(e) =>
                                handleLeaderChange(
                                  "sackLeaders",
                                  index,
                                  "total",
                                  e.target.value
                                )
                              }
                              className="text-center mx-auto"
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
                                removeLeaderRow("sackLeaders", index)
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
                                  <SelectItem
                                    key={player.id}
                                    value={player.name}
                                  >
                                    {player.name} - {player.position} #
                                    {player.jerseyNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={leader.total || ""}
                              onChange={(e) =>
                                handleLeaderChange(
                                  "intLeaders",
                                  index,
                                  "total",
                                  e.target.value
                                )
                              }
                              className="text-center mx-auto"
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
                                removeLeaderRow("intLeaders", index)
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
        </TabsContent>

        {/* Records Page */}
        <TabsContent
          value="records"
          className="flex flex-col gap-4 w-full h-full"
        >
          {/* Top - Record Entry Form */}
          <Card className="flex flex-col border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden items-center justify-center w-full">
            {/* Add Record Accordion */}
            <div
              className="bg-gradient-to-r from-primary to-primary/90 p-6 cursor-pointer flex flex-row items-center justify-between hover:from-primary/80 hover:to-primary/70 transition-all w-full"
              onClick={() => setIsFormExpanded(!isFormExpanded)}
            >
              <span className="text-2xl font-black text-white">Add Record</span>
              {isFormExpanded ? (
                <ChevronUp className="h-6 w-6 text-white" />
              ) : (
                <ChevronDown className="h-6 w-6 text-white" />
              )}
            </div>

            <CardHeader className="hidden"></CardHeader>
            {isFormExpanded && (
              <CardContent className="flex w-full items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <div className="space-y-4 flex flex-col gap-6">
                  {/* Inputs */}
                  <div className="flex gap-24 w-full">
                    {/* Left Side */}

                    <div className="flex flex-col w-1/2">
                      <h3 className="font-semibold text-lg mb-3">Details</h3>
                      <div className="flex flex-col gap-3">
                        {/* Name Input */}
                        <div>
                          <Label htmlFor="playerName">Name</Label>
                          <Input
                            id="playerName"
                            placeholder="Player name"
                            value={newRecord.playerName}
                            onChange={(e) =>
                              setNewRecord((prev) => ({
                                ...prev,
                                playerName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        {/* Year Input */}
                        <div>
                          <Label htmlFor="recordYear">Year</Label>
                          <Input
                            id="recordYear"
                            type="number"
                            placeholder="Year"
                            value={newRecord.year}
                            onChange={(e) =>
                              setNewRecord((prev) => ({
                                ...prev,
                                year: parseInt(e.target.value) || currentYear,
                              }))
                            }
                          />
                        </div>
                        {/* School Dropdown */}
                        <div>
                          <Label htmlFor="recordSchool">School</Label>
                          <Select
                            value={newRecord.school}
                            onValueChange={(value) =>
                              setNewRecord((prev) => ({
                                ...prev,
                                school: value,
                              }))
                            }
                          >
                            <SelectTrigger id="recordSchool">
                              <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                            <SelectContent>
                              {fbsTeams.map((team) => (
                                <SelectItem key={team.name} value={team.name}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Position Dropdown */}
                        <div>
                          <Label htmlFor="recordPosition">Position</Label>
                          <Select
                            value={newRecord.position}
                            onValueChange={(value) =>
                              setNewRecord((prev) => ({
                                ...prev,
                                position: value,
                              }))
                            }
                          >
                            <SelectTrigger id="recordPosition">
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent>
                              {positions.map((pos) => (
                                <SelectItem key={pos} value={pos}>
                                  {pos}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Conference Dropdown */}
                        <div>
                          <Label htmlFor="recordConference">Conference</Label>
                          <Select
                            value={newRecord.conference}
                            onValueChange={(value) =>
                              setNewRecord((prev) => ({
                                ...prev,
                                conference: value,
                              }))
                            }
                          >
                            <SelectTrigger id="recordConference">
                              <SelectValue placeholder="Select conference" />
                            </SelectTrigger>
                            <SelectContent>
                              {conferences.map((conf) => (
                                <SelectItem key={conf} value={conf}>
                                  {conf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Record Level and Type Selection */}
                        <div className="flex w-full gap-6">
                          {/* Record Level Checkboxes */}
                          <div className="space-y-2">
                            <Label>Record Level</Label>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="national"
                                checked={newRecord.levels.includes("national")}
                                onCheckedChange={() =>
                                  handleLevelToggle("national")
                                }
                              />
                              <Label
                                htmlFor="national"
                                className="font-normal cursor-pointer"
                              >
                                National
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="conference"
                                checked={newRecord.levels.includes(
                                  "conference"
                                )}
                                onCheckedChange={() =>
                                  handleLevelToggle("conference")
                                }
                              />
                              <Label
                                htmlFor="conference"
                                className="font-normal cursor-pointer"
                              >
                                Conference
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="school"
                                checked={newRecord.levels.includes("school")}
                                onCheckedChange={() =>
                                  handleLevelToggle("school")
                                }
                              />
                              <Label
                                htmlFor="school"
                                className="font-normal cursor-pointer"
                              >
                                School
                              </Label>
                            </div>
                          </div>
                          {/* Record Type Radio Buttons */}
                          <div className="space-y-2">
                            <Label>Record Type</Label>
                            <RadioGroup
                              value={newRecord.recordType}
                              onValueChange={(value: RecordType) =>
                                setNewRecord((prev) => ({
                                  ...prev,
                                  recordType: value,
                                }))
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="career"
                                  id="career-radio"
                                />
                                <Label
                                  htmlFor="career-radio"
                                  className="font-normal cursor-pointer"
                                >
                                  Career
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="season"
                                  id="season-radio"
                                />
                                <Label
                                  htmlFor="season-radio"
                                  className="font-normal cursor-pointer"
                                >
                                  Season
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="game" id="game-radio" />
                                <Label
                                  htmlFor="game-radio"
                                  className="font-normal cursor-pointer"
                                >
                                  Game
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side */}
                    {/* Stat Inputs */}
                    <div className="flex flex-col w-1/2 space-y-3">
                      <h3 className="font-semibold text-lg mb-3">Statistics</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="passYds" className="text-sm">
                            Passing Yards
                          </Label>
                          <Input
                            id="passYds"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.passingYards}
                            onChange={(e) =>
                              handleStatChange("passingYards", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="passTDs" className="text-sm">
                            Passing TDs
                          </Label>
                          <Input
                            id="passTDs"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.passingTDs}
                            onChange={(e) =>
                              handleStatChange("passingTDs", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="rushYds" className="text-sm">
                            Rushing Yards
                          </Label>
                          <Input
                            id="rushYds"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.rushingYards}
                            onChange={(e) =>
                              handleStatChange("rushingYards", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="rushTDs" className="text-sm">
                            Rushing TDs
                          </Label>
                          <Input
                            id="rushTDs"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.rushingTDs}
                            onChange={(e) =>
                              handleStatChange("rushingTDs", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="receptions" className="text-sm">
                            Receptions
                          </Label>
                          <Input
                            id="receptions"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.receptions}
                            onChange={(e) =>
                              handleStatChange("receptions", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="recYds" className="text-sm">
                            Receiving Yards
                          </Label>
                          <Input
                            id="recYds"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.receivingYards}
                            onChange={(e) =>
                              handleStatChange("receivingYards", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="recTDs" className="text-sm">
                            Receiving TDs
                          </Label>
                          <Input
                            id="recTDs"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.receivingTDs}
                            onChange={(e) =>
                              handleStatChange("receivingTDs", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="sacks" className="text-sm">
                            Sacks
                          </Label>
                          <Input
                            id="sacks"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.sacks}
                            onChange={(e) =>
                              handleStatChange("sacks", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="ints" className="text-sm">
                            Interceptions
                          </Label>
                          <Input
                            id="ints"
                            type="number"
                            placeholder="0"
                            className="mt-1"
                            value={newRecord.stats.interceptions}
                            onChange={(e) =>
                              handleStatChange("interceptions", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Add Button */}
                  <Button
                    onClick={handleAddRecord}
                    className="w-full"
                    disabled={
                      !newRecord.playerName.trim() ||
                      newRecord.levels.length === 0
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Bottom - Records Display */}
          <Card className="flex flex-col items-center justify-center ">
            <CardHeader>
              <CardTitle>Records</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 w-[500px]">
              <Tabs defaultValue="career" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="career">Career</TabsTrigger>
                  <TabsTrigger value="season">Season</TabsTrigger>
                  <TabsTrigger value="game">Game</TabsTrigger>
                </TabsList>

                <TabsContent value="career">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6 mt-4">
                      {renderRecordsSection(
                        "career",
                        "national",
                        "National Records"
                      )}
                      {renderRecordsSection(
                        "career",
                        "conference",
                        "Conference Records"
                      )}
                      {renderRecordsSection(
                        "career",
                        "school",
                        "School Records"
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="season">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6 mt-4">
                      {renderRecordsSection(
                        "season",
                        "national",
                        "National Records"
                      )}
                      {renderRecordsSection(
                        "season",
                        "conference",
                        "Conference Records"
                      )}
                      {renderRecordsSection(
                        "season",
                        "school",
                        "School Records"
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="game">
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6 mt-4">
                      {renderRecordsSection(
                        "game",
                        "national",
                        "National Records"
                      )}
                      {renderRecordsSection(
                        "game",
                        "conference",
                        "Conference Records"
                      )}
                      {renderRecordsSection("game", "school", "School Records")}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamStats;
