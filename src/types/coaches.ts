export type CoachPosition = "HC" | "OC" | "DC";

export type CoachType =
  | "Motivator"
  | "Architect"
  | "Tactician"
  | "Strategist"
  | "Recruiter"
  | "Talent Developer"
  | "Program Builder"
  | "CEO";

export type CoachPrestige =
  | "F"
  | "F+"
  | "D-"
  | "D"
  | "D+"
  | "C-"
  | "C"
  | "C+"
  | "B-"
  | "B"
  | "B+"
  | "A-"
  | "A"
  | "A+";

export interface Coach {
  name: string;
  position: CoachPosition;
  type: CoachType;
  prestige: CoachPrestige;
}

export interface CoachStaff {
  headCoach: Coach;
  offensiveCoordinator: Coach;
  defensiveCoordinator: Coach;
}
