// src/utils/gameStatsConstants.ts
// Constants for per-game stats: field definitions, position filters, and category list.
// Maps GameStatCategory to stat fields and eligible positions for filtering.

import { GameStatCategory, StatField } from "@/types/gameStats";

/**
 * Maps each game stat category to its displayable stat fields.
 * Keys match GameStatEntry.stats Record keys and are used for UI column rendering.
 * Values are displayed in the order defined here.
 *
 * Note: These keys must align with PlayerLeaderStat fields in yearRecord.ts
 * for proper accumulation during season summary generation.
 */
export const STAT_FIELDS: Record<GameStatCategory, StatField[]> = {
  Passing: [
    { key: "completions", label: "Comp" },
    { key: "attempts", label: "Att" },
    { key: "yards", label: "YDS" },
    { key: "tds", label: "TD" },
    { key: "ints", label: "INT" },
  ],
  Rushing: [
    { key: "carries", label: "CAR" },
    { key: "yards", label: "YDS" },
    { key: "tds", label: "TD" },
  ],
  Receiving: [
    { key: "receptions", label: "REC" },
    { key: "yards", label: "YDS" },
    { key: "tds", label: "TD" },
  ],
  Defense: [
    { key: "tackles", label: "TCKL" },
    { key: "tfl", label: "TFL" },
    { key: "sacks", label: "SCK" },
    { key: "ints", label: "INT" },
  ],
};

/**
 * Maps each game stat category to the positions eligible to record stats in that category.
 * Used for filtering roster entries when entering per-game stats.
 * A player's position must be in this list to appear in the category's stat entry form.
 */
export const POSITION_FILTERS: Record<GameStatCategory, string[]> = {
  Passing: ["QB"],
  Rushing: ["QB", "RB", "FB", "WR"],
  Receiving: ["WR", "TE", "RB", "FB"],
  Defense: ["CB", "FS", "SS", "OLB", "MLB", "ILB", "DE", "DT", "NT", "S", "LB", "DB", "DL", "LEDGE", "REDGE", "SAM", "MIKE", "WILL"],
};

/**
 * Ordered list of all game stat categories.
 * Used for iteration, UI tab ordering, and validation.
 */
export const GAME_STAT_CATEGORIES: GameStatCategory[] = [
  "Passing",
  "Rushing",
  "Receiving",
  "Defense",
];
