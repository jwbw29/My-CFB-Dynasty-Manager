// This file should contain type definitions relating to player stats (either stat's themselves or awards)

export interface Award {
  id: number;
  playerName: string;
  awardName: string;
  year: number;
  team?: "1st Team" | "2nd Team" | "Freshman"; // Optional field for team designation
  /** Optional week number for weekly awards (e.g., Player of the Week). Undefined for season-long awards. */
  week?: number;
}
