// src/components/GameStatsModal.tsx
// Modal UI for entering, editing, and deleting per-game player stats by category.
// This persists week-scoped entries to localStorage-backed gameStats so TeamStats can aggregate from a single source of truth.

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { getGameStats, setGameStats } from "@/utils/localStorage";
import {
  STAT_FIELDS,
  POSITION_FILTERS,
  GAME_STAT_CATEGORIES,
} from "@/utils/gameStatsConstants";
import { getWeekDisplayName } from "@/utils/weekUtils";
import {
  GameStatCategory,
  GameStatEntry,
  GameStatsData,
} from "@/types/gameStats";

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

interface GameStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameWeek: number;
  opponent: string;
  rosterPlayers: RosterPlayer[];
  dynastyId: string;
  currentYear: number;
}

/**
 * Builds a normalized stat value object for the active category.
 *
 * We explicitly fill every configured key so table rendering and storage remain
 * stable even if users leave some form fields untouched.
 *
 * @param category - Active stat category that defines the required field keys.
 * @param values - Current form values keyed by stat field name.
 * @returns A complete Record keyed by STAT_FIELDS[category] with numeric values.
 */
const buildCategoryStatValues = (
  category: GameStatCategory,
  values: Record<string, number>,
): Record<string, number> => {
  return STAT_FIELDS[category].reduce<Record<string, number>>((acc, field) => {
    acc[field.key] = Number.isFinite(values[field.key]) ? values[field.key] : 0;
    return acc;
  }, {});
};

/**
 * Creates a default form value map for the provided category.
 *
 * Using category-scoped defaults avoids stale values carrying across tabs with
 * different fields (for example Passing INT vs Defense INT semantics).
 *
 * @param category - The currently selected stats category.
 * @returns Zero-initialized stat values for each configured field in that category.
 */
const createDefaultStatValues = (
  category: GameStatCategory,
): Record<string, number> => {
  return STAT_FIELDS[category].reduce<Record<string, number>>((acc, field) => {
    acc[field.key] = 0;
    return acc;
  }, {});
};

export const GameStatsModal: React.FC<GameStatsModalProps> = ({
  open,
  onOpenChange,
  gameWeek,
  opponent,
  rosterPlayers,
  dynastyId,
  currentYear,
}) => {
  const [gameStatsData, setGameStatsData] = useState<GameStatsData>({});
  const [activeCategory, setActiveCategory] =
    useState<GameStatCategory>("Passing");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GameStatEntry | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [statValues, setStatValues] = useState<Record<string, number>>(
    createDefaultStatValues("Passing"),
  );

  const weekLabel = useMemo(() => getWeekDisplayName(gameWeek), [gameWeek]);

  /**
   * Keeps local state in sync with persisted game stats whenever modal context changes.
   *
   * This intentionally re-reads from storage on open/year/dynasty/week changes so the
   * modal reflects latest saved data if other views updated stats earlier.
   */
  useEffect(() => {
    if (!open) return;
    setGameStatsData(getGameStats(dynastyId, currentYear));
  }, [open, dynastyId, currentYear, gameWeek]);

  /**
   * Resets form state when category changes to prevent cross-category field leakage.
   *
   * Category tabs have different field schemas; carrying values across categories
   * would lead to confusing UI and accidental persistence of irrelevant keys.
   */
  useEffect(() => {
    setIsFormOpen(false);
    setEditingEntry(null);
    setSelectedPlayer("");
    setStatValues(createDefaultStatValues(activeCategory));
  }, [activeCategory]);

  const categoryEntries = useMemo(() => {
    const weekEntries = gameStatsData[gameWeek] || [];
    return weekEntries.filter((entry) => entry.category === activeCategory);
  }, [gameStatsData, gameWeek, activeCategory]);

  const eligiblePlayers = useMemo(() => {
    const allowedPositions = POSITION_FILTERS[activeCategory] || [];
    return [...rosterPlayers]
      .filter((player) => allowedPositions.includes(player.position))
      .sort((a, b) => {
        const aJersey = Number.parseInt(a.jerseyNumber, 10);
        const bJersey = Number.parseInt(b.jerseyNumber, 10);
        return (
          (Number.isNaN(aJersey) ? Number.MAX_SAFE_INTEGER : aJersey) -
          (Number.isNaN(bJersey) ? Number.MAX_SAFE_INTEGER : bJersey)
        );
      });
  }, [rosterPlayers, activeCategory]);

  /**
   * Clears all transient form/edit state after save or cancel.
   */
  const resetFormState = () => {
    setIsFormOpen(false);
    setEditingEntry(null);
    setSelectedPlayer("");
    setStatValues(createDefaultStatValues(activeCategory));
  };

  /**
   * Opens the inline form pre-populated for editing an existing entry.
   *
   * @param entry - The persisted entry selected from the table row action.
   */
  const startEditing = (entry: GameStatEntry) => {
    setEditingEntry(entry);
    setSelectedPlayer(entry.playerName);
    setStatValues(buildCategoryStatValues(entry.category, entry.stats));
    setIsFormOpen(true);
  };

  /**
   * Handles add or edit persistence for the active category.
   *
   * Side effects:
   * - Reads and writes localStorage via getGameStats/setGameStats
   * - Updates component state to immediately refresh table view
   * - Emits success toasts for user feedback
   */
  const handleSave = () => {
    if (!selectedPlayer) {
      toast.error("Please select a player before saving stats.");
      return;
    }

    const latestData = getGameStats(dynastyId, currentYear);
    const weekEntries = [...(latestData[gameWeek] || [])];

    // Duplicate prevention: each player should only have one entry per category per week.
    // If a duplicate is found while adding, switch to edit mode so users intentionally
    // overwrite existing values instead of silently creating conflicting rows.
    if (!editingEntry) {
      const duplicateEntry = weekEntries.find(
        (entry) =>
          entry.category === activeCategory &&
          entry.playerName === selectedPlayer,
      );

      if (duplicateEntry) {
        setEditingEntry(duplicateEntry);
        setSelectedPlayer(duplicateEntry.playerName);
        setStatValues(
          buildCategoryStatValues(activeCategory, duplicateEntry.stats),
        );
        setIsFormOpen(true);
        toast("Existing entry found. Edit the stats and save to update.");
        return;
      }
    }

    const normalizedStats = buildCategoryStatValues(activeCategory, statValues);

    const nextEntry: GameStatEntry = editingEntry
      ? {
          ...editingEntry,
          category: activeCategory,
          stats: normalizedStats,
        }
      : {
          id: Date.now().toString(),
          playerName: selectedPlayer,
          category: activeCategory,
          stats: normalizedStats,
        };

    const updatedWeekEntries = editingEntry
      ? weekEntries.map((entry) =>
          entry.id === editingEntry.id ? nextEntry : entry,
        )
      : [...weekEntries, nextEntry];

    const updatedData: GameStatsData = {
      ...latestData,
      [gameWeek]: updatedWeekEntries,
    };

    setGameStats(dynastyId, currentYear, updatedData);
    setGameStatsData(updatedData);
    resetFormState();
    toast.success(`Stats saved for ${nextEntry.playerName}`);
  };

  /**
   * Removes an existing entry after user confirmation.
   *
   * @param entry - The row entry selected for deletion.
   */
  const handleDelete = (entry: GameStatEntry) => {
    const latestData = getGameStats(dynastyId, currentYear);
    const weekEntries = latestData[gameWeek] || [];
    const updatedWeekEntries = weekEntries.filter(
      (item) => item.id !== entry.id,
    );

    const updatedData: GameStatsData = {
      ...latestData,
      [gameWeek]: updatedWeekEntries,
    };

    setGameStats(dynastyId, currentYear, updatedData);
    setGameStatsData(updatedData);

    // If the deleted row was currently in edit mode, reset to avoid dangling references.
    if (editingEntry?.id === entry.id) {
      resetFormState();
    }

    toast.success(`Stats deleted for ${entry.playerName}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Dialog Header */}
        <DialogHeader>
          <DialogTitle>{`${weekLabel} vs ${opponent} — Player Stats`}</DialogTitle>
          <DialogDescription>
            Enter individual player statistics for this game.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Category Tabs */}
        <Tabs
          value={activeCategory}
          onValueChange={(value) =>
            setActiveCategory(value as GameStatCategory)
          }
          defaultValue="Passing"
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
            {GAME_STAT_CATEGORIES.map((category) => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {GAME_STAT_CATEGORIES.map((category) => {
            const fields = STAT_FIELDS[category];
            const rows =
              category === activeCategory
                ? categoryEntries
                : (gameStatsData[gameWeek] || []).filter(
                    (entry) => entry.category === category,
                  );

            return (
              <TabsContent
                key={category}
                value={category}
                forceMount
                className="flex flex-col w-full space-y-4 mt-4 data-[state=inactive]:hidden"
              >
                {/* Add Player Stats Button */}
                <div className="flex justify-end items-center">
                  <Button
                    type="button"
                    variant={isFormOpen ? "outline" : "default"}
                    onClick={() => {
                      if (isFormOpen) {
                        resetFormState();
                        return;
                      }
                      setIsFormOpen(true);
                      setEditingEntry(null);
                      setSelectedPlayer("");
                      setStatValues(createDefaultStatValues(activeCategory));
                    }}
                  >
                    {isFormOpen ? (
                      "Cancel"
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Player Stats
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex flex-col w-full rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">
                          Player Name
                        </TableHead>
                        {fields.map((field) => (
                          <TableHead key={field.key}>{field.label}</TableHead>
                        ))}
                        <TableHead className="text-right min-w-[120px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={fields.length + 2}
                            className="text-center text-muted-foreground py-8"
                          >
                            No stats entered yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">
                              {entry.playerName}
                            </TableCell>
                            {fields.map((field) => (
                              <TableCell key={field.key}>
                                {entry.stats[field.key] ?? 0}
                              </TableCell>
                            ))}
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditing(entry)}
                                  title="Edit Stats"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Delete Stats"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete stats for {entry.playerName}?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(entry)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                {/* Stats Table with Actions */}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {isFormOpen && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-muted/20">
                    {/* Inline Add/Edit Form */}
                    <div className="space-y-2">
                      <Label>Player</Label>
                      {editingEntry ? (
                        <div className="h-10 px-3 rounded-md border border-input bg-background flex items-center text-sm">
                          {editingEntry.playerName}
                        </div>
                      ) : (
                        <Select
                          value={selectedPlayer}
                          onValueChange={setSelectedPlayer}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Player" />
                          </SelectTrigger>
                          <SelectContent>
                            {eligiblePlayers.map((player) => (
                              <SelectItem key={player.id} value={player.name}>
                                {`${player.name} - ${player.position} #${player.jerseyNumber}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {STAT_FIELDS[activeCategory].map((field) => {
                        const isHalfStep =
                          field.key === "tfl" || field.key === "sacks";
                        return (
                          <div key={field.key} className="space-y-2">
                            <Label
                              htmlFor={`stat-${activeCategory}-${field.key}`}
                            >
                              {field.label}
                            </Label>
                            <Input
                              id={`stat-${activeCategory}-${field.key}`}
                              type="number"
                              step={isHalfStep ? 0.5 : 1}
                              value={statValues[field.key] ?? 0}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setStatValues((prev) => ({
                                  ...prev,
                                  [field.key]: Number.isNaN(value) ? 0 : value,
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetFormState}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
