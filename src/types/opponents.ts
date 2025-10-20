export type MatchResult = "WIN" | "LOSS" | "TIE";

export interface Opponent {
  id: string;
  displayName: string;
  defaultTeamId?: string | null;
  teamHistory: Record<number, string>;
  createdAt: string;
  updatedAt: string;
}

export interface OpponentMatchup {
  id: string;
  opponentId: string;
  season: number;
  weekLabel: string;
  week?: number;
  myTeamId: string;
  opponentTeamId: string;
  myScore?: number;
  opponentScore?: number;
  result?: MatchResult;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OpponentsState {
  version: number;
  opponents: Opponent[];
  matchups?: OpponentMatchup[];
  updatedAt: string;
}

export interface OpponentRecordSummary {
  wins: number;
  losses: number;
  ties: number;
}
