// src/components/WeeklyAwards.tsx
// Weekly award assignment UI for storing four POTW slots per week/year in YearRecord.playerAwards.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useDynasty } from "@/contexts/DynastyContext";
import { getWeekDisplayName } from "@/utils/weekUtils";
import { getCoachProfile, getYearAwards, setYearAwards } from "@/utils/localStorage";
import { getTeamData } from "@/utils/fbsTeams";
import {
  buildConferenceAwardName,
  NATIONAL_DEFENSIVE_POTW,
  NATIONAL_OFFENSIVE_POTW,
} from "@/utils/weeklyAwardUtils";
import type { Player } from "@/types/playerTypes";
import type { Award } from "@/types/statTypes";

type WeeklyAwardSlot =
  | "nationalOffensive"
  | "nationalDefensive"
  | "conferenceOffensive"
  | "conferenceDefensive";

type WeeklySlotAssignments = Record<WeeklyAwardSlot, string>;

const EMPTY_ASSIGNMENTS: WeeklySlotAssignments = {
  nationalOffensive: "",
  nationalDefensive: "",
  conferenceOffensive: "",
  conferenceDefensive: "",
};

/**
 * WeeklyAwards manages the four weekly POTW slots for a single selected week.
 *
 * The component persists assignments immediately to YearRecord.playerAwards so
 * weekly and season award views stay in sync without introducing new storage keys.
 *
 * @returns Weekly award entry UI with week selection and per-slot player selectors.
 */
export default function WeeklyAwards() {
  const { activeWeek, latestUnlockedWeek } = useDynasty();

  // State management: selectedWeek is intentionally local so users can review/edit
  // prior weeks without mutating the global active week used by other pages.
  const [selectedWeek, setSelectedWeek] = useState(activeWeek);
  const [slotAssignments, setSlotAssignments] =
    useState<WeeklySlotAssignments>(EMPTY_ASSIGNMENTS);

  const [currentYear] = useLocalStorage<number>(
    "currentYear",
    new Date().getFullYear(),
  );
  const [players] = useLocalStorage<Player[]>("players", []);

  const availableWeeks = useMemo(() => {
    const weeks = Array.from({ length: latestUnlockedWeek + 1 }, (_, i) => i);
    if (latestUnlockedWeek >= 20 && !weeks.includes(21)) {
      weeks.push(21);
    }
    return weeks;
  }, [latestUnlockedWeek]);

  // Conference resolution: conference-scoped award names must be generated from
  // the active coach team so the same save/load keys are used everywhere.
  // When conference can't be resolved (coach profile unset), we disable conference
  // award slots and show guidance to set up the coach profile.
  const { conference, isConferenceResolved } = useMemo(() => {
    const coach = getCoachProfile();
    const team = coach?.schoolName ? getTeamData(coach.schoolName) : null;
    const resolvedConference = team?.conference;
    return {
      conference: resolvedConference ?? "Conference",
      isConferenceResolved: !!resolvedConference,
    };
  }, []);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aJersey = Number.parseInt(a.jerseyNumber, 10);
      const bJersey = Number.parseInt(b.jerseyNumber, 10);
      return (Number.isNaN(aJersey) ? Number.MAX_SAFE_INTEGER : aJersey) -
        (Number.isNaN(bJersey) ? Number.MAX_SAFE_INTEGER : bJersey);
    });
  }, [players]);

  const expectedAwardNames = useMemo(
    () => ({
      nationalOffensive: NATIONAL_OFFENSIVE_POTW,
      nationalDefensive: NATIONAL_DEFENSIVE_POTW,
      conferenceOffensive: buildConferenceAwardName(conference, "Offensive"),
      conferenceDefensive: buildConferenceAwardName(conference, "Defensive"),
    }),
    [conference],
  );

  // Save/load logic: load the selected week slice and map it into UI slot state.
  useEffect(() => {
    const weekAwards = getYearAwards(currentYear).filter(
      (award) => award.week === selectedWeek,
    );

    const nextAssignments: WeeklySlotAssignments = { ...EMPTY_ASSIGNMENTS };

    const nationalOffensive = weekAwards.find(
      (award) => award.awardName === expectedAwardNames.nationalOffensive,
    );
    const nationalDefensive = weekAwards.find(
      (award) => award.awardName === expectedAwardNames.nationalDefensive,
    );
    const conferenceOffensive = weekAwards.find(
      (award) => award.awardName === expectedAwardNames.conferenceOffensive,
    );
    const conferenceDefensive = weekAwards.find(
      (award) => award.awardName === expectedAwardNames.conferenceDefensive,
    );

    nextAssignments.nationalOffensive = nationalOffensive?.playerName ?? "";
    nextAssignments.nationalDefensive = nationalDefensive?.playerName ?? "";
    nextAssignments.conferenceOffensive = conferenceOffensive?.playerName ?? "";
    nextAssignments.conferenceDefensive = conferenceDefensive?.playerName ?? "";

    setSlotAssignments(nextAssignments);
  }, [selectedWeek, currentYear, expectedAwardNames]);

  const saveSlotAssignment = (slot: WeeklyAwardSlot, playerName: string) => {
    const awardName = expectedAwardNames[slot];
    const existingAwards = getYearAwards(currentYear);

    // Duplicate prevention: treat awardName + week + year as a unique key.
    // If a match exists, replace playerName in-place instead of creating duplicates.
    const existingIndex = existingAwards.findIndex(
      (award) =>
        award.year === currentYear &&
        award.week === selectedWeek &&
        award.awardName === awardName,
    );

    let updatedAwards = [...existingAwards];

    if (!playerName) {
      updatedAwards = updatedAwards.filter(
        (award) =>
          !(
            award.year === currentYear &&
            award.week === selectedWeek &&
            award.awardName === awardName
          ),
      );
    } else if (existingIndex !== -1) {
      updatedAwards[existingIndex] = {
        ...updatedAwards[existingIndex],
        playerName,
      };
    } else {
      const award: Award = {
        id: Date.now(),
        playerName,
        awardName,
        year: currentYear,
        week: selectedWeek,
      };

      updatedAwards = [...updatedAwards, award];
    }

    setYearAwards(currentYear, updatedAwards);
    setSlotAssignments((prev) => ({ ...prev, [slot]: playerName }));
  };

  const renderPlayerSlot = (
    label: "Offensive" | "Defensive",
    slot: WeeklyAwardSlot,
    disabled = false,
  ) => {
    const selectedPlayer = slotAssignments[slot];

    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <Select
            value={selectedPlayer}
            onValueChange={(value) => saveSlotAssignment(slot, value)}
            disabled={disabled}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select Player" />
            </SelectTrigger>
            <SelectContent>
              {sortedPlayers.map((player) => (
                <SelectItem key={player.id} value={player.name}>
                  {player.name} - {player.position} #{player.jerseyNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedPlayer && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Clear ${label.toLowerCase()} weekly award`}
              onClick={() => saveSlotAssignment(slot, "")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm font-medium text-foreground">Week</p>
        <Select
          value={selectedWeek.toString()}
          onValueChange={(val) => setSelectedWeek(Number(val))}
        >
          <SelectTrigger className="w-full sm:w-48">
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

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>National Player of the Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderPlayerSlot("Offensive", "nationalOffensive")}
              {renderPlayerSlot("Defensive", "nationalDefensive")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{conference} Player of the Week</CardTitle>
            {!isConferenceResolved && (
              <p className="text-sm text-muted-foreground mt-1">
                Set up your Coach Profile to enable conference-specific awards
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderPlayerSlot("Offensive", "conferenceOffensive", !isConferenceResolved)}
              {renderPlayerSlot("Defensive", "conferenceDefensive", !isConferenceResolved)}
            </div>
          </CardContent>
        </Card>
      </div>

      {!slotAssignments.nationalOffensive &&
        !slotAssignments.nationalDefensive &&
        !slotAssignments.conferenceOffensive &&
        !slotAssignments.conferenceDefensive && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Select players for each award to record this week&apos;s honors
          </p>
        )}
    </div>
  );
}
