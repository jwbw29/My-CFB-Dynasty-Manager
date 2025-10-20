"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDynasty } from "@/contexts/DynastyContext";
import {
  deriveUserControlledTeamsFromOpponents,
  getAllYearRecords,
  getCoachProfile,
  getCurrentYear,
  getOpponentsState,
  getSchedule,
  setOpponentsState,
  syncUserControlledTeamsFromOpponents,
} from "@/utils/localStorage";
import { Game } from "@/types/yearRecord";
import {
  MatchResult,
  Opponent,
  OpponentMatchup,
  OpponentRecordSummary,
  OpponentsState,
} from "@/types/opponents";

export interface OpponentWithDetails extends Opponent {
  record: OpponentRecordSummary;
  lastMatchup?: OpponentMatchup;
  matchups: OpponentMatchup[];
}

const createId = (prefix: string) => {
  const cryptoRef =
    typeof globalThis !== "undefined" ? (globalThis as any).crypto : null;
  if (cryptoRef?.randomUUID) {
    return `${prefix}_${cryptoRef.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

const withTimestamp = (state: OpponentsState): OpponentsState => ({
  ...state,
  updatedAt: new Date().toISOString(),
});

const computeRecord = (matchups: OpponentMatchup[]): OpponentRecordSummary => {
  return matchups.reduce<OpponentRecordSummary>(
    (acc, matchup) => {
      switch (matchup.result) {
        case "WIN":
          acc.wins += 1;
          break;
        case "LOSS":
          acc.losses += 1;
          break;
        case "TIE":
          acc.ties += 1;
          break;
        default:
          break;
      }
      return acc;
    },
    { wins: 0, losses: 0, ties: 0 }
  );
};

const normalizeResult = (result?: string | null): MatchResult | undefined => {
  if (!result) return undefined;
  const normalized = result.trim().toLowerCase();
  if (normalized === "win") return "WIN";
  if (normalized === "loss") return "LOSS";
  if (normalized === "tie") return "TIE";
  return undefined;
};

const parseScore = (
  score?: string | null
): { myScore: number; opponentScore: number } | null => {
  if (!score) return null;
  const [mine, theirs] = score.split("-").map((value) => parseInt(value, 10));
  if (Number.isNaN(mine) || Number.isNaN(theirs)) {
    return null;
  }
  return { myScore: mine, opponentScore: theirs };
};

const buildWeekLabel = (game: Game): string => `W${game.week}`;

const buildMatchupsByOpponent = (
  opponents: Opponent[],
  scheduleBySeason: Map<number, Game[]>,
  myTeamName: string
) => {
  const map = new Map<string, OpponentMatchup[]>();

  opponents.forEach((opponent) => {
    const derived: OpponentMatchup[] = [];

    scheduleBySeason.forEach((games, season) => {
      const assignedTeam =
        opponent.teamHistory?.[season] ?? opponent.defaultTeamId ?? null;
      if (!assignedTeam) return;

      games.forEach((game) => {
        if (!game.opponent || game.opponent === "BYE") return;
        if (game.opponent !== assignedTeam) return;

        const normalized = normalizeResult(game.result);
        const parsedScore = parseScore(game.score);

        const matchup: OpponentMatchup = {
          id: `${opponent.id}-${season}-${game.week}`,
          opponentId: opponent.id,
          season,
          week: game.week,
          weekLabel: buildWeekLabel(game),
          myTeamId: myTeamName,
          opponentTeamId: assignedTeam,
          result: normalized,
        };

        if (parsedScore) {
          matchup.myScore = parsedScore.myScore;
          matchup.opponentScore = parsedScore.opponentScore;
        }

        derived.push(matchup);
      });
    });

    derived.sort((a, b) => {
      if ((b.season ?? 0) !== (a.season ?? 0)) {
        return (b.season ?? 0) - (a.season ?? 0);
      }
      return (b.week ?? 0) - (a.week ?? 0);
    });

    map.set(opponent.id, derived);
  });

  return map;
};

export const useOpponents = () => {
  const [state, setState] = useState<OpponentsState>(() => getOpponentsState());
  const [isInitialized, setIsInitialized] = useState(false);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const { dataVersion } = useDynasty();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hydrate = () => {
      const nextState = getOpponentsState();
      setState(nextState);
      setScheduleVersion((version) => version + 1);
      setIsInitialized(true);
    };

    hydrate();

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        event.key.startsWith("dynasty_") &&
        typeof event.newValue === "string"
      ) {
        hydrate();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const applyStateUpdate = useCallback(
    (updater: (current: OpponentsState) => OpponentsState) => {
      setState((current) => {
        const next = withTimestamp(updater(current));
        setOpponentsState(next);
        syncUserControlledTeamsFromOpponents(next);
        setScheduleVersion((version) => version + 1);
        return next;
      });
    },
    []
  );

  const addOpponent = useCallback(
    (displayName: string, initialTeamId?: string | null) => {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        return;
      }

      applyStateUpdate((current) => {
        const now = new Date().toISOString();
        const newOpponent: Opponent = {
          id: createId("opp"),
          displayName: trimmedName,
          defaultTeamId: initialTeamId || null,
          teamHistory: {},
          createdAt: now,
          updatedAt: now,
        };

        return {
          ...current,
          opponents: [...current.opponents, newOpponent],
        };
      });
    },
    [applyStateUpdate]
  );

  const updateOpponent = useCallback(
    (opponentId: string, updates: Partial<Omit<Opponent, "id">>) => {
      applyStateUpdate((current) => ({
        ...current,
        opponents: current.opponents.map((opponent) =>
          opponent.id === opponentId
            ? {
                ...opponent,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : opponent
        ),
      }));
    },
    [applyStateUpdate]
  );

  const removeOpponent = useCallback(
    (opponentId: string) => {
      applyStateUpdate((current) => ({
        ...current,
        opponents: current.opponents.filter(
          (opponent) => opponent.id !== opponentId
        ),
      }));
    },
    [applyStateUpdate]
  );

  const setOpponentTeamForSeason = useCallback(
    (opponentId: string, season: number, teamId: string | null) => {
      applyStateUpdate((current) => ({
        ...current,
        opponents: current.opponents.map((opponent) => {
          if (opponent.id !== opponentId) return opponent;
          const updatedHistory = { ...opponent.teamHistory };
          if (teamId) {
            updatedHistory[season] = teamId;
          } else {
            delete updatedHistory[season];
          }

          return {
            ...opponent,
            teamHistory: updatedHistory,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [applyStateUpdate]
  );

  const setOpponentDefaultTeam = useCallback(
    (opponentId: string, teamId: string | null) => {
      applyStateUpdate((current) => ({
        ...current,
        opponents: current.opponents.map((opponent) =>
          opponent.id === opponentId
            ? {
                ...opponent,
                defaultTeamId: teamId,
                updatedAt: new Date().toISOString(),
              }
            : opponent
        ),
      }));
    },
    [applyStateUpdate]
  );

  const scheduleBySeason = useMemo(() => {
    const map = new Map<number, Game[]>();
    const allRecords = getAllYearRecords();

    allRecords.forEach((record) => {
      if (Array.isArray(record.schedule)) {
        map.set(record.year, record.schedule);
      }
    });

    const currentYear = getCurrentYear();
    const liveSchedule = getSchedule(currentYear);
    if (liveSchedule.length || !map.has(currentYear)) {
      map.set(currentYear, liveSchedule);
    }

    return map;
  }, [dataVersion, scheduleVersion]);

  const coachProfile = useMemo(() => getCoachProfile(), [dataVersion]);

  const matchupsByOpponent = useMemo(
    () =>
      buildMatchupsByOpponent(
        state.opponents,
        scheduleBySeason,
        coachProfile?.schoolName || "My Team"
      ),
    [state.opponents, scheduleBySeason, coachProfile?.schoolName]
  );

  const opponentsWithDetails = useMemo<OpponentWithDetails[]>(() => {
    return state.opponents
      .map((opponent) => {
        const matchups = matchupsByOpponent.get(opponent.id) || [];
        const record = computeRecord(matchups);
        const lastMatchup = matchups.find((item) => item.result) || matchups[0];
        return {
          ...opponent,
          record,
          lastMatchup,
          matchups,
        };
      })
      .sort((a, b) => {
        const gamesDiff = b.matchups.length - a.matchups.length;
        if (gamesDiff !== 0) return gamesDiff;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [state.opponents, matchupsByOpponent]);

  const controlledTeams = useMemo(
    () => deriveUserControlledTeamsFromOpponents(state),
    [state]
  );

  const opponentAssignmentLookup = useMemo(() => {
    const map = new Map<string, Opponent>();
    state.opponents.forEach((opponent) => {
      if (opponent.defaultTeamId) {
        map.set(`default:${opponent.defaultTeamId}`, opponent);
      }

      Object.entries(opponent.teamHistory || {}).forEach(([season, team]) => {
        if (team) {
          map.set(`${season}:${team}`, opponent);
        }
      });
    });
    return map;
  }, [state.opponents]);

  const getOpponentForTeam = useCallback(
    (season: number, teamId?: string | null) => {
      if (!teamId) return null;
      return (
        opponentAssignmentLookup.get(`${season}:${teamId}`) ||
        opponentAssignmentLookup.get(`default:${teamId}`) ||
        null
      );
    },
    [opponentAssignmentLookup]
  );

  const refresh = useCallback(() => {
    const nextState = getOpponentsState();
    setState(nextState);
    setScheduleVersion((version) => version + 1);
    setIsInitialized(true);
  }, []);

  return {
    state,
    opponents: state.opponents,
    opponentsWithDetails,
    controlledTeams,
    isInitialized,
    matchupsByOpponent,
    getOpponentForTeam,
    refresh,
    addOpponent,
    updateOpponent,
    removeOpponent,
    setOpponentTeamForSeason,
    setOpponentDefaultTeam,
  };
};

export type UseOpponentsReturn = ReturnType<typeof useOpponents>;
