// src/components/Top25Rankings.tsx

"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown, Minus, Save } from "lucide-react";
import { fbsTeams, Team } from "@/utils/fbsTeams";
import { toast } from "react-hot-toast";
import { useTop25Rankings, RankedTeam } from "@/hooks/useTop25Rankings";
import { TeamLogo } from "./ui/TeamLogo";
import { getWeekDisplayName } from "@/utils/weekUtils";
import { getCurrentYear } from "@/utils/localStorage";
import { useDynasty } from "@/contexts/DynastyContext";
import { isTeamUserControlled as isUserControlled } from "@/utils/localStorage";
import { TeamDisplay } from "./TeamHome";

// --- WEEKS array for the dropdown selector ---
const WEEKS = Array.from({ length: 22 }, (_, i) => i); // Weeks 0-21

// --- HELPER: Check if a team is user-controlled ---
// Now using the new centralized user teams data source
const isTeamUserControlled = (teamName: string): boolean => {
  return isUserControlled(teamName);
};

// --- Updated TeamRankingRow Component ---
interface TeamRankingRowProps {
  team: RankedTeam;
  index: number;
  unrankedTeams: Team[];
  onTeamChange: (index: number, teamName: string) => void;
  renderRankingChange: (
    teamName: string,
    currentRank: number
  ) => React.ReactNode;
}

const TeamRankingRow: React.FC<TeamRankingRowProps> = ({
  team,
  index,
  unrankedTeams,
  onTeamChange,
  renderRankingChange,
}) => {
  const dropdownOptions = useMemo(() => {
    const options = [...unrankedTeams];
    if (team.name && !unrankedTeams.some((t) => t.name === team.name)) {
      const currentTeamObject = fbsTeams.find((t) => t.name === team.name);
      if (currentTeamObject) {
        options.unshift(currentTeamObject);
      }
    }
    return options;
  }, [unrankedTeams, team.name]);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-1.5 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="text-right w-8 font-bold text-lg">{index + 1}</div>
      <div className="flex items-center">
        <Select
          value={team.name || "unranked"}
          onValueChange={(val) => onTeamChange(index, val)}
        >
          <SelectTrigger className="h-9">
            <SelectValue>
              {team.name ? (
                <div className="flex items-center gap-2">
                  <TeamLogo teamName={team.name} size="sm" />
                  <TeamDisplay
                    name={team.name}
                    isUserControlled={isTeamUserControlled(team.name)}
                    custom_classes="font-semibold"
                  />
                  {team.record && team.record.trim() && (
                    <span className="text-muted-foreground text-xs">
                      ({team.record})
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Select a team...</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="unranked">-- Unranked --</SelectItem>
            {dropdownOptions.map((optionTeam) => (
              <SelectItem
                key={optionTeam.name}
                value={optionTeam.name}
                className="flex flex-row"
              >
                <TeamDisplay
                  name={optionTeam.name}
                  isUserControlled={isTeamUserControlled(optionTeam.name)}
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-center w-16 flex justify-center">
        {renderRankingChange(team.name, index)}
      </div>
    </div>
  );
};

// --- OthersReceivingVotes Editor Component ---
interface OthersReceivingVotesProps {
  currentYear: number;
  activeWeek: number;
}

const OthersReceivingVotes: React.FC<OthersReceivingVotesProps> = ({
  currentYear,
  activeWeek,
}) => {
  const {
    getOthersReceivingVotes,
    updateOthersReceivingVotes,
    saveDynastyData,
  } = useDynasty();

  const [text, setText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  // Load the saved text when component mounts or week/year changes
  useEffect(() => {
    const savedText = getOthersReceivingVotes(currentYear, activeWeek);
    setText(savedText);
    setDraft(savedText);
  }, [currentYear, activeWeek, getOthersReceivingVotes]);

  const handleEdit = () => {
    setDraft(text);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(text);
  };

  const handleSave = () => {
    setText(draft);
    setIsEditing(false);
    // Save to dynasty context/localStorage
    updateOthersReceivingVotes(currentYear, activeWeek, draft);
    saveDynastyData();
  };

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 whitespace-pre-wrap">{text}</p>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        rows={5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Others receiving votes (e.g., Team A 45, Team B 23)"
      />
      <div className="flex gap-2">
        <Button onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

// --- Main Top25Rankings Component ---
const Top25Rankings: React.FC = () => {
  const currentYear = getCurrentYear();

  // --- FIX 1: Call useTop25Rankings with NO arguments ---
  const {
    activeWeek,
    setActiveWeek,
    latestUnlockedWeek,
    getRankingsForWeek,
    updateRankingsForWeek,
  } = useTop25Rankings();

  const availableWeeks = useMemo(() => {
    const weeks = Array.from({ length: latestUnlockedWeek + 1 }, (_, i) => i);
    if (latestUnlockedWeek >= 20 && !weeks.includes(21)) {
      weeks.push(21);
    }
    return weeks;
  }, [latestUnlockedWeek]);

  const currentRankings = useMemo(
    () => getRankingsForWeek(currentYear, activeWeek),
    [currentYear, activeWeek, getRankingsForWeek]
  );
  const previousRankings = useMemo(
    () => getRankingsForWeek(currentYear, activeWeek - 1),
    [currentYear, activeWeek, getRankingsForWeek]
  );

  const rankedTeamNames = useMemo(
    () =>
      new Set(currentRankings.map((t: RankedTeam) => t.name).filter(Boolean)),
    [currentRankings]
  );
  const unrankedTeams = useMemo(
    () =>
      fbsTeams
        .filter((team: Team) => !rankedTeamNames.has(team.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rankedTeamNames]
  );

  const handleTeamChange = useCallback(
    (index: number, teamName: string) => {
      const newRankings = [...currentRankings];
      newRankings[index] = {
        name: teamName === "unranked" ? "" : teamName,
        record: "",
      };

      // --- FIX 2: Call updateRankingsForWeek with THREE arguments ---
      updateRankingsForWeek(currentYear, activeWeek, newRankings);
    },
    [currentRankings, activeWeek, updateRankingsForWeek, currentYear]
  );

  const handleSave = () => {
    // The `updateRankingsForWeek` now handles saving via the context, so this button is just for user feedback.
    toast.success(`${getWeekDisplayName(activeWeek)} rankings saved!`);
  };

  const renderRankingChange = (teamName: string, currentRank: number) => {
    if (!teamName || activeWeek === 0)
      return <Minus className="text-gray-400" size={16} />;
    const previousRank = previousRankings.findIndex(
      (t: RankedTeam) => t.name === teamName
    );
    if (previousRank === -1)
      return <ArrowUp className="text-green-500" size={16} />;
    const diff = previousRank - currentRank;
    if (diff > 0)
      return (
        <div className="text-green-500 flex items-center">
          <ArrowUp size={16} />
          {diff}
        </div>
      );
    if (diff < 0)
      return (
        <div className="text-red-500 flex items-center">
          <ArrowDown size={16} />
          {Math.abs(diff)}
        </div>
      );
    return <Minus className="text-gray-400" size={16} />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Top 25 Rankings</h1>
        <p className="text-muted-foreground">{currentYear} Season</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle>{getWeekDisplayName(activeWeek)} Poll</CardTitle>
            <Select
              value={activeWeek.toString()}
              onValueChange={(val) => setActiveWeek(Number(val))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    {getWeekDisplayName(week)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Rankings
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            <div className="space-y-1 border rounded-lg p-2">
              {currentRankings.slice(0, 10).map((team, index) => (
                <TeamRankingRow
                  key={`rank-${index}`}
                  team={team}
                  index={index}
                  unrankedTeams={unrankedTeams}
                  onTeamChange={handleTeamChange}
                  renderRankingChange={renderRankingChange}
                />
              ))}
            </div>
            <div className="space-y-1 border rounded-lg p-2">
              {currentRankings.slice(10, 20).map((team, index) => (
                <TeamRankingRow
                  key={`rank-${index + 10}`}
                  team={team}
                  index={index + 10}
                  unrankedTeams={unrankedTeams}
                  onTeamChange={handleTeamChange}
                  renderRankingChange={renderRankingChange}
                />
              ))}
            </div>
            <div className="space-y-1 border rounded-lg p-2">
              {currentRankings.slice(20, 25).map((team, index) => (
                <TeamRankingRow
                  key={`rank-${index + 20}`}
                  team={team}
                  index={index + 20}
                  unrankedTeams={unrankedTeams}
                  onTeamChange={handleTeamChange}
                  renderRankingChange={renderRankingChange}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="font-bold">Others Receiving Votes:</CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OthersReceivingVotes
            currentYear={currentYear}
            activeWeek={activeWeek}
          />
          <p className="text-sm italic">
            Point values in parentheses indicate the number of first place
            votes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Top25Rankings;
