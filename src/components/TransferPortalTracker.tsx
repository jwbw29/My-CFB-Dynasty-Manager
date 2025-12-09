// src/components/TransferPortalTracker.tsx
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useLocalStorage from "@/hooks/useLocalStorage";
import { capitalizeName } from "@/utils";
import { fbsTeams } from "@/utils/fbsTeams";
import { Transfer, Player } from "@/types/playerTypes";
import { getTransfers, getPlayers, setPlayers } from "@/utils/localStorage";
import { generalPositions } from "@/types/playerTypes";
import {
  notifySuccess,
  notifyError,
  MESSAGES,
} from "@/utils/notification-utils";
// --- MODIFICATION START: Import TeamLogo ---
import { TeamLogo } from "./ui/TeamLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
// --- MODIFICATION END ---

const starOptions = ["5", "4", "3", "2", "1"];

// NEW: Function to sort transfers by star rating (5 to 1)
const sortTransfersByStars = (transfers: Transfer[]): Transfer[] => {
  return [...transfers].sort((a, b) => {
    // Convert star strings to numbers for comparison
    const starsA = parseInt(a.stars) || 0;
    const starsB = parseInt(b.stars) || 0;

    // Sort by stars descending (5 to 1)
    if (starsA !== starsB) {
      return starsB - starsA;
    }

    // If stars are equal, sort by transfer direction (To first, then From)
    if (a.transferDirection !== b.transferDirection) {
      return a.transferDirection === "To" ? -1 : 1;
    }

    // If everything else is equal, sort alphabetically by name
    return a.playerName.localeCompare(b.playerName);
  });
};

const TransferPortalTracker: React.FC = () => {
  const [currentYear] = useLocalStorage<number>(
    "currentYear",
    new Date().getFullYear()
  );
  const [allTransfers, setAllTransfers] = useLocalStorage<Transfer[]>(
    "allTransfers",
    []
  );
  const [players, setPlayersState] = useLocalStorage<Player[]>("players", []);
  const [newIncomingTransfer, setNewIncomingTransfer] = useState<
    Omit<Transfer, "id" | "transferYear" | "transferDirection">
  >({
    playerName: "",
    position: "",
    stars: "",
    school: "",
  });
  const [newOutgoingTransfer, setNewOutgoingTransfer] = useState<{
    playerId: string;
    school: string;
  }>({
    playerId: "",
    school: "",
  });
  const [editingOutgoingTransfer, setEditingOutgoingTransfer] = useState<{
    playerName: string;
    position: string;
    stars: string;
    school: string;
  }>({
    playerName: "",
    position: "",
    stars: "",
    school: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // NEW: Apply star rating sorting to displayed transfers
  const transfersForSelectedYear = sortTransfersByStars(
    getTransfers(selectedYear)
  );

  const addIncomingTransfer = () => {
    const transferToAdd = {
      ...newIncomingTransfer,
      id: Date.now(),
      transferYear: selectedYear,
      transferDirection: "From" as const,
      playerName: capitalizeName(newIncomingTransfer.playerName),
    };
    setAllTransfers([...allTransfers, transferToAdd]);
    setNewIncomingTransfer({
      playerName: "",
      position: "",
      stars: "",
      school: "",
    });
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  const addOutgoingTransfer = () => {
    const selectedPlayer = players.find(
      (p) => p.id.toString() === newOutgoingTransfer.playerId
    );
    if (!selectedPlayer) {
      notifyError("Please select a player");
      return;
    }

    const transferToAdd: Transfer = {
      id: Date.now(),
      transferYear: selectedYear,
      transferDirection: "To",
      playerName: selectedPlayer.name,
      position: selectedPlayer.position,
      stars: selectedPlayer.rating,
      school: newOutgoingTransfer.school,
    };

    // Add to transfers and remove from roster
    setAllTransfers([...allTransfers, transferToAdd]);
    const updatedPlayers = players.filter(
      (p) => p.id.toString() !== newOutgoingTransfer.playerId
    );
    setPlayersState(updatedPlayers);
    setPlayers(updatedPlayers);

    setNewOutgoingTransfer({
      playerId: "",
      school: "",
    });
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  const startEditing = (transfer: Transfer) => {
    setEditingId(transfer.id);
    if (transfer.transferDirection === "From") {
      setNewIncomingTransfer({
        playerName: transfer.playerName,
        position: transfer.position,
        stars: transfer.stars,
        school: transfer.school,
      });
    } else {
      setEditingOutgoingTransfer({
        playerName: transfer.playerName,
        position: transfer.position,
        stars: transfer.stars,
        school: transfer.school,
      });
    }
  };

  const saveEdit = () => {
    const transferToEdit = allTransfers.find(t => t.id === editingId);
    if (!transferToEdit) return;

    if (transferToEdit.transferDirection === "From") {
      setAllTransfers(
        allTransfers.map((transfer) =>
          transfer.id === editingId
            ? {
                ...transfer,
                playerName: capitalizeName(newIncomingTransfer.playerName),
                position: newIncomingTransfer.position,
                stars: newIncomingTransfer.stars,
                school: newIncomingTransfer.school,
              }
            : transfer
        )
      );
    } else {
      setAllTransfers(
        allTransfers.map((transfer) =>
          transfer.id === editingId
            ? {
                ...transfer,
                playerName: capitalizeName(editingOutgoingTransfer.playerName),
                position: editingOutgoingTransfer.position,
                stars: editingOutgoingTransfer.stars,
                school: editingOutgoingTransfer.school,
              }
            : transfer
        )
      );
    }

    setEditingId(null);
    setNewIncomingTransfer({
      playerName: "",
      position: "",
      stars: "",
      school: "",
    });
    setEditingOutgoingTransfer({
      playerName: "",
      position: "",
      stars: "",
      school: "",
    });
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewIncomingTransfer({
      playerName: "",
      position: "",
      stars: "",
      school: "",
    });
    setEditingOutgoingTransfer({
      playerName: "",
      position: "",
      stars: "",
      school: "",
    });
  };

  const removeTransfer = (id: number) => {
    const transferToRemove = allTransfers.find((t) => t.id === id);

    // If removing an outgoing transfer, restore player to roster
    if (transferToRemove && transferToRemove.transferDirection === "To") {
      const restoredPlayer: Player = {
        id: Date.now(), // New ID since the original was removed
        name: transferToRemove.playerName,
        position: transferToRemove.position,
        year: "TR", // Mark as transfer
        rating: transferToRemove.stars,
        jerseyNumber: "",
        devTrait: "Normal" as const,
        notes: `Restored from transfer portal (${transferToRemove.school})`,
        isRedshirted: false,
      };

      const updatedPlayers = [...players, restoredPlayer];
      setPlayersState(updatedPlayers);
      setPlayers(updatedPlayers);
    }

    setAllTransfers(allTransfers.filter((transfer) => transfer.id !== id));
    notifySuccess(MESSAGES.SAVE_SUCCESS);
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-6 md:p-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
            Transfer Portal Tracker
          </h1>
        </div>
      </div>

      {/* Edit Transfer Form - Conditional based on what's being edited */}
      {editingId && (() => {
        const transferBeingEdited = allTransfers.find(t => t.id === editingId);
        if (!transferBeingEdited) return null;

        if (transferBeingEdited.transferDirection === "To") {
          return (
            <Card>
              <CardHeader className="text-xl font-semibold">
                <div className="flex justify-between items-center">
                  <span>Edit Outgoing Transfer</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                  <Input
                    value={editingOutgoingTransfer.playerName}
                    onChange={(e) =>
                      setEditingOutgoingTransfer({ ...editingOutgoingTransfer, playerName: e.target.value })
                    }
                    placeholder="Player Name"
                  />
                  <Select
                    value={editingOutgoingTransfer.position}
                    onValueChange={(value) =>
                      setEditingOutgoingTransfer({ ...editingOutgoingTransfer, position: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {generalPositions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={editingOutgoingTransfer.stars}
                    onValueChange={(value) =>
                      setEditingOutgoingTransfer({ ...editingOutgoingTransfer, stars: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Stars" />
                    </SelectTrigger>
                    <SelectContent>
                      {starOptions.map((stars) => (
                        <SelectItem key={stars} value={stars}>
                          {stars} ⭐
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border px-3">
                    <span className="text-red-600 dark:text-red-400 font-medium">To</span>
                  </div>
                  <Select
                    value={editingOutgoingTransfer.school}
                    onValueChange={(value) =>
                      setEditingOutgoingTransfer({ ...editingOutgoingTransfer, school: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="School" />
                    </SelectTrigger>
                    <SelectContent>
                      {fbsTeams.map((team) => (
                        <SelectItem key={team.name} value={team.name}>
                          <div className="flex items-center gap-2">
                            <TeamLogo teamName={team.name} size="sm" />
                            <span>{team.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} size="sm">
                      Save
                    </Button>
                    <Button onClick={cancelEdit} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* Incoming Transfers Form - Only show when not editing outgoing transfer */}
      {(!editingId || (() => {
        const transferBeingEdited = allTransfers.find(t => t.id === editingId);
        return transferBeingEdited?.transferDirection === "From";
      })()) && (
        <Card>
          <CardHeader className="text-xl font-semibold">
            <div className="flex justify-between items-center">
              <span>{editingId ? "Edit Incoming Transfer" : `Add Incoming Transfer for Year: ${selectedYear}`}</span>
            </div>
          </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
            <Input
              value={newIncomingTransfer.playerName}
              onChange={(e) =>
                setNewIncomingTransfer({
                  ...newIncomingTransfer,
                  playerName: e.target.value,
                })
              }
              placeholder="Player Name"
            />
            <Select
              value={newIncomingTransfer.position}
              onValueChange={(value) =>
                setNewIncomingTransfer({
                  ...newIncomingTransfer,
                  position: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                {generalPositions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newIncomingTransfer.stars}
              onValueChange={(value) =>
                setNewIncomingTransfer({ ...newIncomingTransfer, stars: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Stars" />
              </SelectTrigger>
              <SelectContent>
                {starOptions.map((stars) => (
                  <SelectItem key={stars} value={stars}>
                    {stars} ⭐
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center bg-green-50 dark:bg-green-900/20 rounded border px-3">
              <span className="text-green-600 dark:text-green-400 font-medium">
                From
              </span>
            </div>
            <Select
              value={newIncomingTransfer.school}
              onValueChange={(value) =>
                setNewIncomingTransfer({
                  ...newIncomingTransfer,
                  school: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                {fbsTeams.map((team) => (
                  <SelectItem key={team.name} value={team.name}>
                    <div className="flex items-center gap-2">
                      <TeamLogo teamName={team.name} size="sm" />
                      <span>{team.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingId ? (
              <div className="flex gap-2">
                <Button onClick={saveEdit} size="sm">
                  Save
                </Button>
                <Button onClick={cancelEdit} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={addIncomingTransfer}>Add Transfer</Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Outgoing Transfers Form */}
      <Card>
        <CardHeader className="text-xl font-semibold">
          <div className="flex justify-between items-center">
            <span>Add Outgoing Transfer for Year: {selectedYear}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Select
              value={newOutgoingTransfer.playerId}
              onValueChange={(value) =>
                setNewOutgoingTransfer({
                  ...newOutgoingTransfer,
                  playerId: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Player" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id.toString()}>
                    {player.name} - {player.position} ({player.rating}⭐)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border px-3">
              <span className="text-red-600 dark:text-red-400 font-medium">
                To
              </span>
            </div>
            <Select
              value={newOutgoingTransfer.school}
              onValueChange={(value) =>
                setNewOutgoingTransfer({
                  ...newOutgoingTransfer,
                  school: value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                {fbsTeams.map((team) => (
                  <SelectItem key={team.name} value={team.name}>
                    <div className="flex items-center gap-2">
                      <TeamLogo teamName={team.name} size="sm" />
                      <span>{team.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addOutgoingTransfer}>Add Transfer</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-xl font-semibold">
          <div className="flex justify-between items-center">
            <span>Transfer Portal for {selectedYear}</span>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Sorted by Star Rating (5★ → 1★)
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th className="text-center">Stars</th>
                <th className="text-center">Name</th>
                <th className="text-center">Position</th>
                <th className="text-center">Direction</th>
                <th className="text-center">School</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfersForSelectedYear.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="text-center">{transfer.stars} ⭐</td>
                  <td className="text-center">{transfer.playerName}</td>
                  <td className="text-center">{transfer.position}</td>
                  <td className="text-center">
                    <span
                      className={`font-medium ${
                        transfer.transferDirection === "From"
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      }`}
                    >
                      {transfer.transferDirection}
                    </span>
                  </td>
                  {/* --- MODIFICATION START: Add TeamLogo --- */}
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <TeamLogo teamName={transfer.school} size="sm" />
                      <span>{transfer.school}</span>
                    </div>
                  </td>
                  {/* --- MODIFICATION END --- */}
                  <td className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditing(transfer)}
                        title="Edit"
                      >
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
                              Are you sure you want to remove{" "}
                              {transfer.playerName}?
                              {transfer.transferDirection === "To" &&
                                " This will restore them to your roster."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeTransfer(transfer.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferPortalTracker;
