export type CoachPosition = "HC" | "OC" | "DC";

export type CoachType =
  | "Recruiter"
  | "Elite Recruiter"
  | "Motivator"
  | "Master Motivator"
  | "Tactician"
  | "Scheme Guru"
  | "Architect"
  | "Talent Developer"
  | "Strategist"
  | "Program Builder"
  | "CEO";

export type CoachPrestige =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "D-"
  | "F";

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
