/**
 * Pure aggregation utilities that transform per-game stat entries into season-level
 * Team Leader arrays for the year record view.
 *
 * This module intentionally performs no I/O (no localStorage, no network, no mutation
 * of inputs) so callers can safely reuse it in UI rendering, selectors, and tests.
 */

import { GameStatsData, GameStatEntry, GameStatCategory } from "@/types/gameStats";
import { TeamLeaderStats, PlayerLeaderStat } from "@/types/yearRecord";

/**
 * Counts distinct weeks where a player has at least one entry in a given category.
 *
 * Per-game defensive leader metrics divide accumulated totals by this value so players
 * with different game counts remain comparable. The return value is clamped to a
 * minimum of 1 to prevent division-by-zero in downstream perGame calculations when this
 * helper is called for already-accumulated players.
 *
 * @param gameStats - Full season game stats keyed by week number.
 * @param playerName - Exact player name used in GameStatEntry records.
 * @param category - Category to scope counting (Passing, Rushing, Receiving, Defense).
 * @returns Number of distinct weeks where the player appears in that category, minimum 1.
 */
export function getGamesPlayedByPlayer(
  gameStats: GameStatsData,
  playerName: string,
  category: GameStatCategory,
): number {
  let gamesPlayed = 0;

  for (const [, entries] of Object.entries(gameStats)) {
    const playedThisWeek = entries.some(
      (entry) => entry.playerName === playerName && entry.category === category,
    );

    if (playedThisWeek) {
      gamesPlayed += 1;
    }
  }

  return Math.max(gamesPlayed, 1);
}

/**
 * Aggregates per-game player stat rows into TeamLeaderStats arrays.
 *
 * Key mapping notes:
 * - Passing uses `stats.tds -> touchdowns` and `stats.ints -> interceptions` because
 *   team leader output fields are semantic names instead of abbreviated stat keys.
 * - Rushing/Receiving use `stats.tds -> touchdowns`.
 * - Defense uses one accumulated entry per player to populate FOUR leader arrays
 *   (tackles, TFL, sacks, interceptions), because the source defense row contains
 *   all four stats in one category payload.
 *
 * Sorting behavior:
 * - Passing/Rushing/Receiving sort by `yards` descending.
 * - Defensive leader arrays sort by `total` descending.
 *
 * Purity guarantee:
 * - No mutation of `gameStats`
 * - No side effects (no storage reads/writes, no external calls)
 *
 * @param gameStats - Full season game stats keyed by week number.
 * @returns Team leaders split into offense and defense arrays, with empty arrays when no input exists.
 */
export function accumulateGameStats(gameStats: GameStatsData): TeamLeaderStats {
  const emptyLeaders: TeamLeaderStats = {
    passingLeaders: [],
    rushingLeaders: [],
    receivingLeaders: [],
    tackleLeaders: [],
    tflLeaders: [],
    sackLeaders: [],
    intLeaders: [],
  };

  const allEntries = Object.values(gameStats).flat();

  if (allEntries.length === 0) {
    return emptyLeaders;
  }

  const groupedEntries = new Map<
    string,
    { playerName: string; category: GameStatCategory; stats: Record<string, number> }
  >();

  for (const entry of allEntries) {
    const key = `${entry.playerName}__${entry.category}`;
    const existing = groupedEntries.get(key);

    if (!existing) {
      groupedEntries.set(key, {
        playerName: entry.playerName,
        category: entry.category,
        stats: { ...entry.stats },
      });
      continue;
    }

    for (const [statKey, statValue] of Object.entries(entry.stats)) {
      existing.stats[statKey] = (existing.stats[statKey] ?? 0) + statValue;
    }
  }

  const passingLeaders: PlayerLeaderStat[] = [];
  const rushingLeaders: PlayerLeaderStat[] = [];
  const receivingLeaders: PlayerLeaderStat[] = [];
  const tackleLeaders: PlayerLeaderStat[] = [];
  const tflLeaders: PlayerLeaderStat[] = [];
  const sackLeaders: PlayerLeaderStat[] = [];
  const intLeaders: PlayerLeaderStat[] = [];

  for (const { playerName, category, stats } of groupedEntries.values()) {
    if (category === "Passing") {
      passingLeaders.push({
        name: playerName,
        yards: stats.yards ?? 0,
        completions: stats.completions ?? 0,
        attempts: stats.attempts ?? 0,
        touchdowns: stats.tds ?? 0,
        interceptions: stats.ints ?? 0,
      });
      continue;
    }

    if (category === "Rushing") {
      rushingLeaders.push({
        name: playerName,
        yards: stats.yards ?? 0,
        carries: stats.carries ?? 0,
        touchdowns: stats.tds ?? 0,
      });
      continue;
    }

    if (category === "Receiving") {
      receivingLeaders.push({
        name: playerName,
        yards: stats.yards ?? 0,
        receptions: stats.receptions ?? 0,
        touchdowns: stats.tds ?? 0,
      });
      continue;
    }

    if (category === "Defense") {
      const gamesPlayed = getGamesPlayedByPlayer(gameStats, playerName, category);
      const tacklesTotal = stats.tackles ?? 0;
      const tflTotal = stats.tfl ?? 0;
      const sacksTotal = stats.sacks ?? 0;
      const intsTotal = stats.ints ?? 0;

      tackleLeaders.push({
        name: playerName,
        total: tacklesTotal,
        perGame: tacklesTotal / gamesPlayed,
      });

      tflLeaders.push({
        name: playerName,
        total: tflTotal,
        perGame: tflTotal / gamesPlayed,
      });

      sackLeaders.push({
        name: playerName,
        total: sacksTotal,
        perGame: sacksTotal / gamesPlayed,
      });

      intLeaders.push({
        name: playerName,
        total: intsTotal,
        perGame: intsTotal / gamesPlayed,
      });
    }
  }

  passingLeaders.sort((a, b) => (b.yards ?? 0) - (a.yards ?? 0));
  rushingLeaders.sort((a, b) => (b.yards ?? 0) - (a.yards ?? 0));
  receivingLeaders.sort((a, b) => (b.yards ?? 0) - (a.yards ?? 0));
  tackleLeaders.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  tflLeaders.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  sackLeaders.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  intLeaders.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  return {
    passingLeaders,
    rushingLeaders,
    receivingLeaders,
    tackleLeaders,
    tflLeaders,
    sackLeaders,
    intLeaders,
  };
}
