// src/types/customTeam.ts
export interface CustomTeamConfig {
  id: string;
  customName: string;
  customLocation: string;
  customStadium: string;
  customNickName: string;
  customAbbrev: string;
  replacedTeam: string; // Name of the original FBS team being replaced
  createdAt: string;
}