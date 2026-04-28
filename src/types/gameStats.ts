// src/types/gameStats.ts
// Per-game statistics data layer for tracking individual game performance by category.
// Designed to accumulate into PlayerLeaderStat fields for season/career summaries.

/**
 * Game stat categories supported for per-game tracking.
 * Narrower than StatCategory (playerStats.ts) — excludes Kicking, Punting, Returns.
 * Each category maps to specific positions and stat fields defined in gameStatsConstants.ts.
 */
export type GameStatCategory = "Passing" | "Rushing" | "Receiving" | "Defense";

/**
 * Defines a single stat field within a category.
 * Used to render UI columns and map incoming data to the stats Record.
 */
export interface StatField {
  /** Unique key for this stat within its category (e.g., 'completions', 'yards', 'tackles') */
  key: string;
  /** Display label for UI rendering (e.g., 'Comp', 'YDS', 'TCKL') */
  label: string;
}

/**
 * A single player's stats for one game in a specific category.
 * The stats Record uses category-scoped keys (e.g., 'yards' means passing yards for Passing category).
 * Week is stored as the key in GameStatsData, not here, to avoid duplication.
 */
export interface GameStatEntry {
  /** Unique identifier for this stat entry */
  id: string;
  /** Player name (matches roster entry) */
  playerName: string;
  /** Category this entry belongs to (Passing, Rushing, Receiving, or Defense) */
  category: GameStatCategory;
  /** Category-scoped stat values. Keys match StatField.key from STAT_FIELDS[category] */
  stats: Record<string, number>;
}

/**
 * All game stats for a season, keyed by game week number.
 * Each week contains an array of GameStatEntry objects across all categories and players.
 * Example: gameStatsData[1] = [QB stats, RB stats, WR stats, etc. for week 1]
 */
export type GameStatsData = Record<number, GameStatEntry[]>;
