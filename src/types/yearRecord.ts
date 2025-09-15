// This file should contain type definitions for types pertaining to year records (I.E stats, schedules, records)

import { DraftedPlayer, Recruit, Transfer } from "./playerTypes";
import { Award } from "./statTypes";

// Team Stats interfaces for season review
export interface TeamStatsData {
  gamesPlayed: number;
  // Offense
  totalOffense: number;
  passYards: number;
  rushYards: number;
  points: number;
  // Defense
  totalDefense: number;
  defPassYards: number;
  defRushYards: number;
  defPoints: number;
}

export interface PlayerLeaderStat {
  name: string;
  // Passing
  yards?: number;
  completions?: number;
  attempts?: number;
  touchdowns?: number;
  interceptions?: number;
  // Rushing
  carries?: number;
  // Receiving
  receptions?: number;
  // Defense
  total?: number;
  perGame?: number;
}

export interface TeamLeaderStats {
  passingLeaders: PlayerLeaderStat[];
  rushingLeaders: PlayerLeaderStat[];
  receivingLeaders: PlayerLeaderStat[];
  tackleLeaders: PlayerLeaderStat[];
  tflLeaders: PlayerLeaderStat[];
  sackLeaders: PlayerLeaderStat[];
  intLeaders: PlayerLeaderStat[];
}

export interface YearRecord {
  year: number;
  overallRecord: string;
  conferenceRecord: string;
  bowlGame: string;
  bowlResult: string;
  pointsFor: string;
  pointsAgainst: string;
  natChamp: string;
  heisman: string;
  schedule: Game[];
  recruits?: Recruit[];
  transfers?: Transfer[];
  playerAwards: Award[];
  recruitingClassPlacement: string;
  playersDrafted: DraftedPlayer[];
  finalRanking?: string;
  conferenceFinish?: string;
  rivalTrophies?: string[];
  // Team Stats
  teamStats?: TeamStatsData;
  teamLeaders?: TeamLeaderStats;
}

export interface YearStats {
  wins: number;
  losses: number;
  conferenceWins: number;
  conferenceLosses: number;
  pointsScored: number;
  pointsAgainst: number;
  playersDrafted: number;
  conferenceStanding: string;
  bowlGame: string;
  bowlResult: "Win" | "Loss" | "CFP" | "DNP" | "";
}

export interface Game {
  id: number;
  week: number;
  location: "@" | "vs" | "neutral" | " ";
  opponent: string;
  result: "Win" | "Loss" | "Tie" | "Bye" | "N/A";
  score: string;
  isUserControlled?: boolean;
}

export type AllRecords = {
  [year: number]: YearRecord;
};
