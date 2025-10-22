// src/types/user.ts
// Type definitions for User vs User tracking feature

/**
 * Represents a user (friend/opponent) in the dynasty
 */
export interface User {
  id: string; // Unique identifier (timestamp-based)
  name: string; // Display name of the user
  currentTeamId: string; // Current team they control (team name)
  teamHistory: TeamAssignment[]; // History of team assignments
}

/**
 * Tracks when a user controlled a specific team
 */
export interface TeamAssignment {
  teamId: string; // Team name
  startYear: number; // Year they started controlling this team
  endYear?: number; // Year they stopped (undefined if current)
}

/**
 * Head-to-head record between dynasty owner and a user
 */
export interface HeadToHeadRecord {
  userId: string;
  userName: string;
  wins: number;
  losses: number;
  ties: number;
  games: HeadToHeadGame[];
}

/**
 * Individual game in head-to-head history
 */
export interface HeadToHeadGame {
  year: number;
  week: number;
  myTeam: string; // Dynasty owner's team at the time
  theirTeam: string; // Opponent user's team at the time
  myScore: number;
  theirScore: number;
  result: 'Win' | 'Loss' | 'Tie';
  location: '@' | 'vs' | 'neutral';
}

