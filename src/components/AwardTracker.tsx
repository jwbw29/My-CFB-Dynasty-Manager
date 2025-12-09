// src/components/AwardTracker.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useLocalStorage from "@/hooks/useLocalStorage";
import { Player } from "@/types/playerTypes";
import { Award } from "@/types/statTypes";
import { toast } from "react-hot-toast";
import {
  getCoachProfile,
  getYearRecord,
  setYearRecord,
  getCoaches,
} from "@/utils/localStorage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { AlertDialogFooter, AlertDialogHeader } from "./ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";

const predefinedAwards = [
  "All-American",
  "All-Conference",
  "Bear Bryant Coach of the Year Award",
  "Biletnikoff Award",
  "Bronco Nagurksi Trophy",
  "Broyles Award",
  "Butkus Award",
  "Chuck Bednarik Award",
  "Davey O'Brien Award",
  "Doak Walker Award",
  "Edge Rusher of the Year",
  "Hesiman Memorial Trophy",
  "Jim Thorpe Award",
  "John Mackey Award",
  "Lombardi Award",
  "Lou Groza Award",
  "Maxwell Award",
  "Outland Trophy",
  "Ray Guy Award",
  "Returner of the Year",
  "Rimington Trophy",
  "Unitas Golden Arm Award",
  "Walter Camp Award",
];

const teamAwards = ["All-American", "All-Conference"];

const AwardTracker: React.FC = () => {
  const [currentYear] = useLocalStorage<number>(
    "currentYear",
    new Date().getFullYear()
  );
  const [players] = useLocalStorage<Player[]>("players", []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [awardsForSelectedYear, setAwardsForSelectedYear] = useState<Award[]>(
    []
  );

  useEffect(() => {
    const record = getYearRecord(selectedYear);
    setAwardsForSelectedYear(record.playerAwards || []);
  }, [selectedYear]);

  const [selectedAwardName, setSelectedAwardName] = useState("");
  const [selectedPlayerName, setSelectedPlayerName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<
    "1st Team" | "2nd Team" | "Freshman" | undefined
  >(undefined);
  const [broylesName, setBroylesName] = useState("");
  const [broylesPosition, setBroylesPosition] = useState<"OC" | "DC">("OC");

  const coachProfile = getCoachProfile();
  const coaches = getCoaches();

  const resetForm = () => {
    setSelectedAwardName("");
    setSelectedPlayerName("");
    setSelectedTeam(undefined);
    setBroylesName("");
    setBroylesPosition("OC");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!selectedAwardName) {
      toast.error("Please select an award");
      return;
    }

    let finalPlayerName = selectedPlayerName;
    if (selectedAwardName === "Bear Bryant Coach of the Year Award") {
      finalPlayerName = coachProfile?.coachName || "Head Coach";
    } else if (selectedAwardName === "Broyles Award") {
      // Get coordinator name from coaches roster
      const coordinatorName = broylesPosition === "OC"
        ? coaches?.offensiveCoordinator.name
        : coaches?.defensiveCoordinator.name;

      if (!coordinatorName || !coordinatorName.trim()) {
        toast.error(`Please add the ${broylesPosition} name in the Roster Management page first.`);
        return;
      }
      finalPlayerName = `${coordinatorName} - ${broylesPosition}`;
    }

    if (!finalPlayerName) {
      toast.error("Please select a player or enter a name.");
      return;
    }

    if (teamAwards.includes(selectedAwardName) && !selectedTeam) {
      toast.error("Please select a team (1st, 2nd, or Freshman).");
      return;
    }

    const awardData: Omit<Award, "id"> = {
      playerName: finalPlayerName,
      awardName: selectedAwardName,
      year: selectedYear,
      team: selectedTeam,
    };

    let updatedAwards: Award[];
    if (editingId) {
      updatedAwards = awardsForSelectedYear.map((award) =>
        award.id === editingId ? { ...awardData, id: editingId } : award
      );
      toast.success("Award updated successfully");
    } else {
      updatedAwards = [
        ...awardsForSelectedYear,
        { ...awardData, id: Date.now() },
      ];
      toast.success("Award added successfully");
    }

    const record = getYearRecord(selectedYear);
    setYearRecord(selectedYear, { ...record, playerAwards: updatedAwards });
    setAwardsForSelectedYear(updatedAwards);

    resetForm();
  };

  const startEditing = (award: Award) => {
    setEditingId(award.id);
    setSelectedAwardName(award.awardName);
    setSelectedTeam(award.team);

    if (
      award.awardName === "Broyles Award" &&
      award.playerName.includes(" - ")
    ) {
      const [name, pos] = award.playerName.split(" - ");
      setBroylesName(name);
      setBroylesPosition(pos as "OC" | "DC");
      setSelectedPlayerName("");
    } else {
      setSelectedPlayerName(award.playerName);
      setBroylesName("");
    }
  };

  const removeAward = (id: number) => {
    const updatedAwards = awardsForSelectedYear.filter(
      (award) => award.id !== id
    );
    const record = getYearRecord(selectedYear);
    setYearRecord(selectedYear, { ...record, playerAwards: updatedAwards });
    setAwardsForSelectedYear(updatedAwards);
    toast.success("Award removed successfully");
  };

  const isTeamAwardSelected = teamAwards.includes(selectedAwardName);
  const isCoachAward = selectedAwardName === "Bear Bryant Coach of the Year Award";
  const isBroylesAward = selectedAwardName === "Broyles Award";
  const isPlayerAward = !isCoachAward && !isBroylesAward;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-6 md:p-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
            Award Tracker
          </h1>
        </div>
      </div>

      <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-black text-white">
              {editingId ? "Edit" : "Add New"} Award for Year: {selectedYear}
            </span>
          </div>
        </div>
        <CardHeader className="hidden"></CardHeader>
        <CardContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-4`}>
            {isPlayerAward && (
              <Select
                value={selectedPlayerName}
                onValueChange={setSelectedPlayerName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Player" />
                </SelectTrigger>
                <SelectContent>
                  {[...players]
                    .sort(
                      (a, b) =>
                        parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber)
                    )
                    .map((player) => (
                      <SelectItem key={player.id} value={player.name}>
                        {player.name} - {player.position} #{player.jerseyNumber}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {isCoachAward && (
              <Input value={coachProfile?.coachName || ""} readOnly disabled />
            )}

            {isBroylesAward && (
              <>
                <Select
                  value={broylesPosition}
                  onValueChange={(value: "OC" | "DC") =>
                    setBroylesPosition(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Coordinator Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OC">Offensive Coordinator</SelectItem>
                    <SelectItem value="DC">Defensive Coordinator</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={
                    broylesPosition === "OC"
                      ? coaches?.offensiveCoordinator.name || "OC Name not set"
                      : coaches?.defensiveCoordinator.name || "DC Name not set"
                  }
                  readOnly
                  disabled
                  placeholder="Coordinator Name"
                />
              </>
            )}

            <Select
              value={selectedAwardName}
              onValueChange={setSelectedAwardName}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Award" />
              </SelectTrigger>
              <SelectContent>
                {predefinedAwards.map((award) => (
                  <SelectItem key={award} value={award}>
                    {award}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isTeamAwardSelected && (
              <Select
                value={selectedTeam}
                onValueChange={(value: any) => setSelectedTeam(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Team">1st Team</SelectItem>
                  <SelectItem value="2nd Team">2nd Team</SelectItem>
                  <SelectItem value="Freshman">Freshman</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex space-x-2">
              <Button onClick={handleSave}>
                {editingId ? "Save" : "Add Award"}
              </Button>
              {editingId && (
                <Button onClick={resetForm} variant="outline">
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-xl font-semibold">
          <div className="flex justify-between items-center">
            <span>Awards for {selectedYear}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Player/Coach Name</TableHead>
                <TableHead className="text-center">Award</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awardsForSelectedYear.map((award) => (
                <TableRow key={award.id}>
                  <TableCell className="text-center">
                    {award.playerName}
                  </TableCell>
                  <TableCell className="text-center">
                    {award.awardName}
                    {award.team && (
                      <span className="ml-2 font-semibold text-gray-600 dark:text-gray-400">
                        ({award.team})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(award)}
                        title="Edit"
                      >
                        {" "}
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Remove Player"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Player</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {award.awardName}{" "}
                              from this player?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeAward(award.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AwardTracker;
