// src/utils/localStorage.ts

// Import types from dedicated files
import { Recruit, Transfer, Player, DraftedPlayer } from "@/types/playerTypes";
import { Award } from "@/types/statTypes";
import { Game, YearRecord, YearStats } from "@/types/yearRecord";
import { CoachProfile } from "@/types/coachProfile";
import { getTeamByName, Team, getTeamData } from "./fbsTeams";
import { PlayerStat } from "@/types/playerStats";
import { CustomTeamManager } from "./customTeamManager";
import { RankedTeam, Top25History } from "@/hooks/useTop25Rankings";
import { CoachStaff, Coach, CoachPosition, CoachType, CoachPrestige } from "@/types/coaches";

const COACH_PROFILE_KEY = "coachProfile";
const COACHES_KEY = "coaches";
const CURRENT_YEAR_KEY = "currentYear";
const ALL_RECRUITS_KEY = "allRecruits";
const ALL_TRANSFERS_KEY = "allTransfers";
const ALL_AWARDS_KEY = "allAwards"; // Will be deprecated but kept for migration
const YEAR_RECORDS_KEY = "yearRecords";
export const PLAYERS_KEY = "players";
// export const TOP_25_RANKINGS_KEY = 'top25Rankings';
export const PLAYER_STATS_KEY = "playerStats";

// Helper for safe localStorage access
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key);
    }
  },
};

const getCurrentDynastyData = (): Record<string, any> | null => {
  const dynastyId = safeLocalStorage.getItem("currentDynastyId");
  if (!dynastyId) return null;
  const dynastyData = safeLocalStorage.getItem(`dynasty_${dynastyId}`);
  try {
    // console.log("🚀 ~ dynastyData:", dynastyData);
    return dynastyData ? JSON.parse(dynastyData) : {};
  } catch (e) {
    console.error("Failed to parse dynasty data", e);
    return {};
  }
};

const setCurrentDynastyData = (data: Record<string, any>): void => {
  const dynastyId = safeLocalStorage.getItem("currentDynastyId");
  if (!dynastyId) return;
  try {
    safeLocalStorage.setItem(`dynasty_${dynastyId}`, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save dynasty data", e);
  }
};

// --- Coach Profile ---
export const getCoachProfile = (): CoachProfile | null => {
  const profileData = safeLocalStorage.getItem(COACH_PROFILE_KEY);
  try {
    return profileData ? (JSON.parse(profileData) as CoachProfile) : null;
  } catch (error) {
    console.error("Error retrieving coach profile from localStorage:", error);
    safeLocalStorage.removeItem(COACH_PROFILE_KEY);
    return null;
  }
};

export const setCoachProfile = (profile: CoachProfile): void => {
  try {
    safeLocalStorage.setItem(COACH_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving coach profile to localStorage:", error);
  }
};

// --- Coaches ---
export const getCoaches = (): CoachStaff | null => {
  const coachesData = safeLocalStorage.getItem(COACHES_KEY);
  try {
    return coachesData ? (JSON.parse(coachesData) as CoachStaff) : null;
  } catch (error) {
    console.error("Error retrieving coaches from localStorage:", error);
    safeLocalStorage.removeItem(COACHES_KEY);
    return null;
  }
};

export const setCoaches = (coaches: CoachStaff): void => {
  try {
    safeLocalStorage.setItem(COACHES_KEY, JSON.stringify(coaches));
  } catch (error) {
    console.error("Error saving coaches to localStorage:", error);
  }
};

// --- Players ---
export const getPlayers = (): Player[] => {
  const storedPlayers = safeLocalStorage.getItem(PLAYERS_KEY);
  try {
    return storedPlayers ? JSON.parse(storedPlayers) : [];
  } catch (error) {
    console.error("Error parsing players from localStorage:", error);
    safeLocalStorage.removeItem(PLAYERS_KEY);
    return [];
  }
};
export const setPlayers = (players: Player[]): void => {
  try {
    safeLocalStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch (error) {
    console.error("Error saving players to localStorage:", error);
  }
};

// --- Player Stats ---
export const getPlayerStats = (): PlayerStat[] => {
  const storedStats = safeLocalStorage.getItem(PLAYER_STATS_KEY);
  try {
    return storedStats ? JSON.parse(storedStats) : [];
  } catch (error) {
    console.error("Error parsing playerStats from localStorage:", error);
    safeLocalStorage.removeItem(PLAYER_STATS_KEY);
    return [];
  }
};
export const setPlayerStats = (stats: PlayerStat[]): void => {
  try {
    safeLocalStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error("Error saving playerStats to localStorage:", error);
  }
};

// --- Current Year ---
export const getCurrentYear = (): number => {
  const storedYear = safeLocalStorage.getItem(CURRENT_YEAR_KEY);
  const year = storedYear ? parseInt(storedYear, 10) : NaN;
  return !isNaN(year) && year > 1900 ? year : 2024;
};
export const setCurrentYear = (year: number): void => {
  safeLocalStorage.setItem(CURRENT_YEAR_KEY, year.toString());
};

// --- Schedule ---
const getScheduleKey = (year: number) => `schedule_${year}`;
export const getSchedule = (year: number): Game[] => {
  const storedSchedule = safeLocalStorage.getItem(getScheduleKey(year));
  try {
    return storedSchedule ? (JSON.parse(storedSchedule) as Game[]) : [];
  } catch (error) {
    console.error(`Error parsing schedule for year ${year}:`, error);
    safeLocalStorage.removeItem(getScheduleKey(year));
    return [];
  }
};
export const setSchedule = (year: number, schedule: Game[]): void => {
  try {
    safeLocalStorage.setItem(getScheduleKey(year), JSON.stringify(schedule));
  } catch (error) {
    console.error(`Error saving schedule for year ${year}:`, error);
  }
};
export const removeSchedule = (year: number): void => {
  safeLocalStorage.removeItem(getScheduleKey(year));
};

// --- Year Stats ---
const getYearStatsKey = (year: number) => `yearStats_${year}`;
const defaultYearStats: YearStats = {
  wins: 0,
  losses: 0,
  conferenceWins: 0,
  conferenceLosses: 0,
  pointsScored: 0,
  pointsAgainst: 0,
  playersDrafted: 0,
  conferenceStanding: "",
  bowlGame: "",
  bowlResult: "",
};

export const calculateStats = (
  schedule: Game[],
  schoolName: string
): YearStats => {
  let wins = 0,
    losses = 0,
    pointsScored = 0,
    pointsAgainst = 0,
    conferenceWins = 0,
    conferenceLosses = 0;

  // --- USE THE NEW getTeamData FUNCTION ---
  const currentSchool = getTeamData(schoolName);

  schedule.forEach((game) => {
    if (
      !game.opponent ||
      game.opponent === "BYE" ||
      game.opponent === "NONE" ||
      game.result === "N/A" ||
      game.result === "Bye"
    ) {
      return;
    }

    // --- USE THE NEW getTeamData FUNCTION HERE TOO ---
    const opponentSchool = getTeamData(game.opponent);

    // The rest of the logic remains the same but now uses the correct conference data
    const isConferenceGame = !!(
      currentSchool &&
      opponentSchool &&
      currentSchool.conference === opponentSchool.conference
    );

    if (game.result === "Win") {
      wins++;
      if (isConferenceGame) conferenceWins++;
    } else if (game.result === "Loss") {
      losses++;
      if (isConferenceGame) conferenceLosses++;
    }

    if (game.score && game.score.includes("-")) {
      const scores = game.score.split("-");
      if (scores.length === 2) {
        const teamScore = parseInt(scores[0]) || 0;
        const oppScore = parseInt(scores[1]) || 0;
        pointsScored += teamScore;
        pointsAgainst += oppScore;
      }
    }
  });

  return {
    wins,
    losses,
    conferenceWins,
    conferenceLosses,
    pointsScored,
    pointsAgainst,
    playersDrafted: 0,
    conferenceStanding: "",
    bowlGame: "",
    bowlResult: "",
  };
};

export const getYearStats = (year: number): YearStats => {
  const storedStats = safeLocalStorage.getItem(getYearStatsKey(year));
  try {
    return storedStats
      ? (JSON.parse(storedStats) as YearStats)
      : { ...defaultYearStats };
  } catch (error) {
    console.error(`Error parsing year stats for year ${year}:`, error);
    safeLocalStorage.removeItem(getYearStatsKey(year));
    return { ...defaultYearStats };
  }
};

export const setYearStats = (year: number, stats: YearStats): void => {
  try {
    safeLocalStorage.setItem(getYearStatsKey(year), JSON.stringify(stats));
  } catch (error) {
    console.error(`Error saving year stats for year ${year}:`, error);
  }
};
export const removeYearStats = (year: number): void => {
  safeLocalStorage.removeItem(getYearStatsKey(year));
};

// --- Year Records ---
const defaultYearRecord = (year: number): YearRecord => ({
  year: year,
  overallRecord: "0-0",
  conferenceRecord: "0-0",
  bowlGame: "",
  bowlResult: "",
  pointsFor: "0",
  pointsAgainst: "0",
  natChamp: "",
  heisman: "",
  schedule: [],
  recruits: [],
  transfers: [],
  playerAwards: [],
  recruitingClassPlacement: "",
  playersDrafted: [] as DraftedPlayer[],
});

export const setYearRecord = (year: number, record: YearRecord): void => {
  try {
    const storedRecords = safeLocalStorage.getItem(YEAR_RECORDS_KEY);
    let records: YearRecord[] = storedRecords ? JSON.parse(storedRecords) : [];
    const existingIndex = records.findIndex((r) => r.year === year);
    if (existingIndex !== -1) {
      records[existingIndex] = record;
    } else {
      records.push(record);
      records.sort((a, b) => a.year - b.year);
    }
    safeLocalStorage.setItem(YEAR_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error(`Error setting year record for year ${year}:`, error);
  }
};

export const getYearRecord = (year: number): YearRecord => {
  try {
    const storedRecords = safeLocalStorage.getItem(YEAR_RECORDS_KEY);
    let records: YearRecord[] = storedRecords ? JSON.parse(storedRecords) : [];
    const record = records.find((r) => r.year === year);
    return record || defaultYearRecord(year);
  } catch (error) {
    console.error(`Error getting year record for year ${year}:`, error);
    return defaultYearRecord(year);
  }
};
export const getAllYearRecords = (): YearRecord[] => {
  try {
    const storedRecords = safeLocalStorage.getItem(YEAR_RECORDS_KEY);
    return storedRecords ? JSON.parse(storedRecords) : [];
  } catch (error) {
    console.error(`Error getting all year records:`, error);
    safeLocalStorage.removeItem(YEAR_RECORDS_KEY);
    return [];
  }
};
export const removeAllYearRecords = (): void => {
  safeLocalStorage.removeItem(YEAR_RECORDS_KEY);
};

// --- Trophies ---
export const getRivalTrophiesForYear = (year: number): string[] => {
  try {
    const storedTrophies = safeLocalStorage.getItem("allTrophies");
    if (!storedTrophies) return [];

    const allTrophies = JSON.parse(storedTrophies);
    return allTrophies
      .filter(
        (trophy: any) => trophy.year === year && trophy.category === "rivalry"
      )
      .map((trophy: any) => trophy.name || trophy.type);
  } catch (error) {
    console.error(`Error getting rival trophies for year ${year}:`, error);
    return [];
  }
};

export const getBowlTrophiesForYear = (year: number): string[] => {
  try {
    const storedTrophies = safeLocalStorage.getItem("allTrophies");
    if (!storedTrophies) return [];

    const allTrophies = JSON.parse(storedTrophies);
    return allTrophies
      .filter(
        (trophy: any) => trophy.year === year && trophy.category === "bowl"
      )
      .map((trophy: any) => trophy.name || trophy.type);
  } catch (error) {
    console.error(`Error getting bowl trophies for year ${year}:`, error);
    return [];
  }
};

export const getConferenceTrophiesForYear = (year: number): string[] => {
  try {
    const storedTrophies = safeLocalStorage.getItem("allTrophies");
    if (!storedTrophies) return [];

    const allTrophies = JSON.parse(storedTrophies);
    return allTrophies
      .filter(
        (trophy: any) => trophy.year === year && trophy.category === "conference"
      )
      .map((trophy: any) => trophy.name || trophy.type);
  } catch (error) {
    console.error(`Error getting conference trophies for year ${year}:`, error);
    return [];
  }
};

// --- Recruits ---
export const getAllRecruits = (): Recruit[] => {
  const storedRecruits = safeLocalStorage.getItem(ALL_RECRUITS_KEY);
  try {
    return storedRecruits ? JSON.parse(storedRecruits) : [];
  } catch (error) {
    console.error(`Error parsing all recruits:`, error);
    safeLocalStorage.removeItem(ALL_RECRUITS_KEY);
    return [];
  }
};
export const getRecruits = (year: number): Recruit[] =>
  getAllRecruits().filter((recruit) => recruit.recruitedYear === year);

// --- Transfers ---
export const getAllTransfers = (): Transfer[] => {
  const storedTransfers = safeLocalStorage.getItem(ALL_TRANSFERS_KEY);
  try {
    return storedTransfers ? JSON.parse(storedTransfers) : [];
  } catch (error) {
    console.error(`Error parsing all transfers:`, error);
    safeLocalStorage.removeItem(ALL_TRANSFERS_KEY);
    return [];
  }
};
export const getTransfers = (year: number): Transfer[] =>
  getAllTransfers().filter((transfer) => transfer.transferYear === year);

// MODIFICATION START: Update Award functions
// --- Awards ---
export const getYearAwards = (year: number): Award[] => {
  // The single source of truth for awards is now within the year's record.
  const record = getYearRecord(year);
  return record.playerAwards || [];
};

export const setYearAwards = (year: number, awards: Award[]): void => {
  // This function will now update the awards within the specific year's record.
  const record = getYearRecord(year);
  const updatedRecord = { ...record, playerAwards: awards };
  setYearRecord(year, updatedRecord);
};
// The old getAllAwards and setAllAwards are no longer needed for data integrity.
// We can leave them for migration purposes or remove them if confident.
// For now, let's leave them but not use them in new code.
export const getAllAwards = (): Award[] => {
  const storedAwards = safeLocalStorage.getItem(ALL_AWARDS_KEY);
  try {
    return storedAwards ? JSON.parse(storedAwards) : [];
  } catch (error) {
    console.error(`Error parsing all awards:`, error);
    safeLocalStorage.removeItem(ALL_AWARDS_KEY);
    return [];
  }
};
// MODIFICATION END

export const clearActiveSessionData = (): void => {
  console.log("Clearing active session data from localStorage...");

  const keysToRemove = [
    COACH_PROFILE_KEY,
    COACHES_KEY,
    CURRENT_YEAR_KEY,
    ALL_RECRUITS_KEY,
    ALL_TRANSFERS_KEY,
    ALL_AWARDS_KEY, // This key is deprecated but we clear it for safety
    YEAR_RECORDS_KEY,
    PLAYERS_KEY,
    //TOP_25_RANKINGS_KEY,
    PLAYER_STATS_KEY,
    "allTrophies", // Add any other session-specific keys here
  ];

  keysToRemove.forEach((key) => safeLocalStorage.removeItem(key));

  // Also remove any dynamic schedule, year stats, recruiting needs, and dynasty-specific keys from the previous session
  // IMPORTANT: Dynasty-specific keys (records_, teamStats_, teamLeaders_) are cleared here
  // to prevent old dynasty data from lingering when switching dynasties
  if (typeof window !== "undefined") {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("schedule_") ||
          key.startsWith("yearStats_") ||
          key.startsWith("offensiveNeeds_") ||
          key.startsWith("defensiveNeeds_") ||
          key.startsWith("records_") ||
          key.startsWith("teamStats_") ||
          key.startsWith("teamLeaders_") ||
          key.startsWith("userTeamMappings_"))
      ) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => safeLocalStorage.removeItem(key));
  }

  console.log("Active session data cleared.");
};

// --- Generate Year Record ---
export const generateYearRecord = (
  year: number,
  stats: YearStats,
  schedule: Game[],
  coachProfile: CoachProfile | null
): YearRecord => {
  const ovrRecord = `${stats.wins}-${stats.losses}`;
  const confRecord = `${stats.conferenceWins}-${stats.conferenceLosses}`;
  const yearTransfers = getTransfers(year);
  const yearRecruits = getRecruits(year);

  // Use the new getYearAwards function which pulls from the correct source
  const yearAwards = getYearAwards(year);

  const natChamp = "";
  const heisman = "";
  const classPlacement = "";
  const playersDrafted: DraftedPlayer[] = [];

  return {
    year: year,
    overallRecord: ovrRecord,
    conferenceRecord: confRecord,
    bowlGame: stats.bowlGame || "",
    bowlResult: stats.bowlResult || "",
    pointsFor: String(stats.pointsScored),
    pointsAgainst: String(stats.pointsAgainst),
    natChamp: natChamp,
    heisman: heisman,
    schedule: schedule,
    recruits: yearRecruits,
    transfers: yearTransfers,
    playerAwards: yearAwards,
    recruitingClassPlacement: classPlacement,
    playersDrafted: playersDrafted,
  };
};

export const getTop25History = (): Top25History => {
  const dynastyData = getCurrentDynastyData();
  // Data is now stored under a 'top25History' key within the dynasty object

  // console.log("🚀 ~ getTop25History ~ dynastyData?.top25History:", dynastyData?.top25History)
  return dynastyData?.top25History || {};
};

export const setTop25History = (history: Top25History): void => {
  const dynastyData = getCurrentDynastyData() || {};
  dynastyData.top25History = history;
  setCurrentDynastyData(dynastyData);
};

/**
 * Gets the ranking for a specific team for a given week of a year.
 * Returns the rank number (1-25) or null if the team is not ranked.
 */
export const getTeamRankForWeek = (
  teamName: string,
  year: number,
  week: number
): number | null => {
  const history = getTop25History();
  const yearData = history[year];

  if (!yearData) return null;

  // Find the most recent poll data available up to the requested week
  let weekToCheck = week;
  let pollData: RankedTeam[] | undefined = undefined;

  while (weekToCheck >= 1) {
    if (yearData[weekToCheck]) {
      pollData = yearData[weekToCheck];
      break;
    }
    weekToCheck--;
  }

  if (!pollData) return null;

  const rankIndex = pollData.findIndex((t) => t.name === teamName);

  return rankIndex !== -1 ? rankIndex + 1 : null;
};

export const progressRosterForNewSeason = (endedYear: number): void => {
  try {
    const currentPlayers = getPlayers();
    const allRecruits = getAllRecruits();
    const allTransfers = getAllTransfers();

    // Remove players marked as transferring before processing the roster
    const playersAfterTransfers = currentPlayers.filter(
      (player) => !player.isTransferring
    );

    // 1. Progress the roster: Graduate, Age Up, and Handle Redshirts
    const progressedPlayers = playersAfterTransfers
      .map((player) => {
        const isRedshirtedThisSeason = player.isRedshirted;
        const hasRedshirtHistory = player.year.includes("(RS)");
        const updatedPlayer = { ...player, isRedshirted: false }; // Reset redshirt status for the new season

        // Graduation Logic: A player graduates if they are a Redshirt Senior,
        // OR if they are a regular Senior who was NOT redshirted this season.
        if (
          player.year === "SR (RS)" ||
          (player.year === "SR" && !isRedshirtedThisSeason)
        ) {
          return null; // Mark for removal (graduation)
        }

        let newYear = player.year;

        // --- START OF THE NEW, CORRECTED LOGIC ---
        if (isRedshirtedThisSeason) {
          // The player used their redshirt THIS season. Add (RS) to their current year.
          // This establishes their redshirt history.
          switch (player.year) {
            case "FR":
              newYear = "FR (RS)";
              break;
            case "SO":
              newYear = "SO (RS)";
              break;
            case "JR":
              newYear = "JR (RS)";
              break;
            case "SR":
              newYear = "SR (RS)";
              break; // The senior redshirt edge case
          }
        } else {
          // The player played this season. Now we advance their class.
          if (hasRedshirtHistory) {
            // If they have a redshirt history, they advance to the next redshirt class.
            switch (player.year) {
              case "FR (RS)":
                newYear = "SO (RS)";
                break;
              case "SO (RS)":
                newYear = "JR (RS)";
                break;
              case "JR (RS)":
                newYear = "SR (RS)";
                break;
            }
          } else {
            // If they have no redshirt history, it's a standard progression.
            switch (player.year) {
              case "FR":
                newYear = "SO";
                break;
              case "SO":
                newYear = "JR";
                break;
              case "JR":
                newYear = "SR";
                break;
            }
          }
        }
        // --- END OF THE NEW LOGIC ---

        updatedPlayer.year = newYear;
        return updatedPlayer;
      })
      .filter((player): player is Player => player !== null); // Filter out the graduated players

    // 2. Add Incoming Recruits (This logic remains the same)
    const newPlayersFromRecruits = allRecruits
      .filter((recruit) => recruit.recruitedYear === endedYear)
      .map(
        (recruit, index): Player => ({
          id: Date.now() + index,
          name: recruit.name,
          position: recruit.position,
          year: "FR",
          rating: recruit.stars,
          jerseyNumber: "",
          devTrait: recruit.potential as Player["devTrait"],
          notes: `Recruited in the class of ${endedYear}.`,
          isRedshirted: false,
        })
      );

    // 3. Add Incoming Transfers (This logic remains the same)
    const newPlayersFromTransfers = allTransfers
      .filter(
        (transfer) =>
          transfer.transferYear === endedYear &&
          transfer.transferDirection === "From"
      )
      .map(
        (transfer, index): Player => ({
          id: Date.now() + 1000 + index,
          name: transfer.playerName,
          position: transfer.position,
          year: "TR",
          rating: transfer.stars,
          jerseyNumber: "",
          devTrait: "Normal",
          notes: `Transferred from ${transfer.school} in ${endedYear}.`,
          isRedshirted: false,
        })
      );

    // 4. Combine and Save the New Roster (This logic remains the same)
    const newRoster = [
      ...progressedPlayers,
      ...newPlayersFromRecruits,
      ...newPlayersFromTransfers,
    ];
    setPlayers(newRoster);

    // --- FIX: REMOVED THE STATS FILTERING LOGIC ---
    // The playerStats data will no longer be filtered. It will persist for all players.
  } catch (error) {
    console.error("Error progressing roster for new season:", error);
  }
};

export const prepareNextSeason = (year: number): void => {
  try {
    // THIS IS THE FIX: Update the global current year
    setCurrentYear(year);

    // 1. Create a fresh schedule for the new year
    const newSchedule: Game[] = Array.from({ length: 21 }, (_, i) => ({
      id: i,
      week: i,
      location: "vs",
      opponent: "",
      result: "N/A",
      score: "",
    }));
    setSchedule(year, newSchedule);

    // 2. Create empty year stats for the new year
    const initialYearStats: YearStats = {
      wins: 0,
      losses: 0,
      conferenceWins: 0,
      conferenceLosses: 0,
      pointsScored: 0,
      pointsAgainst: 0,
      playersDrafted: 0,
      conferenceStanding: "",
      bowlGame: "",
      bowlResult: "",
    };
    setYearStats(year, initialYearStats);

    // 3. Create an empty YearRecord for the new year so it can be edited immediately
    const newYearRecord = getYearRecord(year); // This will create a default one
    setYearRecord(year, newYearRecord);

    // 4. Initialize the Top 25 poll for the new year
    const currentHistory = getTop25History();
    const newYearHistory = {
      [year]: {
        0: Array.from({ length: 25 }, () => ({ name: "" })), // Start with a poll for Week 0
      },
    };
    setTop25History({ ...currentHistory, ...newYearHistory });
  } catch (error) {
    console.error(`Error preparing next season for year ${year}:`, error);
  }
};

/**
 * Wipes all active session data and replaces it with the contents of a dynasty data object.
 * This is the core function for loading a dynasty.
 * @param data - The complete data object for a dynasty.
 */
export const restoreDynastyFromSnapshot = (data: Record<string, any>): void => {
  // CRITICAL: Back up records before clearing to prevent data loss
  // Records should NEVER be lost - they persist for the life of the dynasty
  const recordsBackup: Record<string, string> = {};
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("records_")) {
        const value = localStorage.getItem(key);
        if (value) {
          recordsBackup[key] = value;
        }
      }
    }
  }

  // 1. Clear out all potentially conflicting keys from the previous session.
  clearActiveSessionData();

  // 2. Iterate over the imported data and set each item in localStorage.
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (key && value !== undefined && value !== null) {
      try {
        safeLocalStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to restore key "${key}" from snapshot`, error);
      }
    }
  });

  // 3. SAFETY MECHANISM: If records keys are missing from the snapshot but existed before,
  // restore them from backup. This prevents records from being lost if an older dynasty
  // save file doesn't include records yet.
  Object.keys(recordsBackup).forEach((key) => {
    // Only restore if the key is not in the snapshot data
    if (!data[key]) {
      console.warn(
        `Records key "${key}" was missing from dynasty snapshot. Restoring from backup.`
      );
      safeLocalStorage.setItem(key, recordsBackup[key]);
    }
  });
};

// --- USER CONTROLLED TEAMS MANAGEMENT ---

const USER_CONTROLLED_TEAMS_KEY = "userControlledTeams";

/**
 * Get the list of user-controlled teams for the current dynasty
 */
export const getUserControlledTeams = (): string[] => {
  const dynastyData = getCurrentDynastyData();
  return dynastyData?.[USER_CONTROLLED_TEAMS_KEY] || [];
};

/**
 * Set the list of user-controlled teams for the current dynasty
 */
export const setUserControlledTeams = (teams: string[]): void => {
  const dynastyId = safeLocalStorage.getItem("currentDynastyId");
  if (!dynastyId) return;

  const dynastyData = getCurrentDynastyData() || {};
  dynastyData[USER_CONTROLLED_TEAMS_KEY] = teams;

  safeLocalStorage.setItem(`dynasty_${dynastyId}`, JSON.stringify(dynastyData));
};

/**
 * Add a team to the user-controlled teams list
 */
export const addUserControlledTeam = (teamName: string): void => {
  const currentTeams = getUserControlledTeams();
  if (!currentTeams.includes(teamName)) {
    setUserControlledTeams([...currentTeams, teamName]);
  }
};

/**
 * Remove a team from the user-controlled teams list
 */
export const removeUserControlledTeam = (teamName: string): void => {
  const currentTeams = getUserControlledTeams();
  setUserControlledTeams(currentTeams.filter((team) => team !== teamName));
};

// --- TEAM STATS MANAGEMENT ---

/**
 * Get team stats for a specific dynasty and year
 */
export const getTeamStats = (
  dynastyId: string,
  year: number
): import("@/types/yearRecord").TeamStatsData => {
  const key = `teamStats_${dynastyId}_${year}`;
  const stored = safeLocalStorage.getItem(key);

  const defaultStats = {
    gamesPlayed: 0,
    totalOffense: 0,
    passYards: 0,
    rushYards: 0,
    points: 0,
    totalDefense: 0,
    defPassYards: 0,
    defRushYards: 0,
    defPoints: 0,
  };

  try {
    return stored ? JSON.parse(stored) : defaultStats;
  } catch (error) {
    console.error(`Error parsing team stats for ${dynastyId}_${year}:`, error);
    return defaultStats;
  }
};

/**
 * Get team leaders for a specific dynasty and year
 */
export const getTeamLeaders = (
  dynastyId: string,
  year: number
): import("@/types/yearRecord").TeamLeaderStats => {
  const key = `teamLeaders_${dynastyId}_${year}`;
  const stored = safeLocalStorage.getItem(key);

  const defaultLeaders = {
    passingLeaders: [],
    rushingLeaders: [],
    receivingLeaders: [],
    tackleLeaders: [],
    tflLeaders: [],
    sackLeaders: [],
    intLeaders: [],
  };

  try {
    return stored ? JSON.parse(stored) : defaultLeaders;
  } catch (error) {
    console.error(
      `Error parsing team leaders for ${dynastyId}_${year}:`,
      error
    );
    return defaultLeaders;
  }
};

// --- USER VS USER TRACKING ---

const USERS_KEY = "users";

/**
 * Get all users for the current dynasty
 */
export const getUsers = (): import("@/types/user").User[] => {
  const dynastyData = getCurrentDynastyData();
  return dynastyData?.[USERS_KEY] || [];
};

/**
 * Set all users for the current dynasty
 */
export const setUsers = (users: import("@/types/user").User[]): void => {
  const dynastyId = safeLocalStorage.getItem("currentDynastyId");
  if (!dynastyId) return;

  const dynastyData = getCurrentDynastyData() || {};
  dynastyData[USERS_KEY] = users;

  safeLocalStorage.setItem(`dynasty_${dynastyId}`, JSON.stringify(dynastyData));
};

/**
 * Add a new user to the current dynasty
 */
export const addUser = (
  name: string,
  teamId: string
): import("@/types/user").User => {
  const currentYear = getCurrentYear();
  const newUser: import("@/types/user").User = {
    id: Date.now().toString(),
    name,
    currentTeamId: teamId,
    teamHistory: [
      {
        teamId,
        startYear: currentYear,
      },
    ],
  };

  const users = getUsers();
  users.push(newUser);
  setUsers(users);

  return newUser;
};

/**
 * Update a user's team assignment
 */
export const updateUserTeam = (userId: string, newTeamId: string): void => {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);

  if (!user) return;

  const currentYear = getCurrentYear();

  // If the team is different from current, update history
  if (user.currentTeamId !== newTeamId) {
    // End the current team assignment
    const currentAssignment = user.teamHistory.find((th) => !th.endYear);
    if (currentAssignment) {
      currentAssignment.endYear = currentYear - 1;
    }

    // Add new team assignment
    user.teamHistory.push({
      teamId: newTeamId,
      startYear: currentYear,
    });

    user.currentTeamId = newTeamId;
    setUsers(users);
  }
};

/**
 * Delete a user from the current dynasty
 */
export const deleteUser = (userId: string): void => {
  const users = getUsers();
  const filteredUsers = users.filter((u) => u.id !== userId);
  setUsers(filteredUsers);
};

/**
 * Get a user by ID
 */
export const getUserById = (
  userId: string
): import("@/types/user").User | undefined => {
  const users = getUsers();
  return users.find((u) => u.id === userId);
};

/**
 * Get the team a user controlled during a specific year
 */
export const getUserTeamForYear = (
  userId: string,
  year: number
): string | undefined => {
  const user = getUserById(userId);
  if (!user) return undefined;

  const assignment = user.teamHistory.find(
    (th) => th.startYear <= year && (!th.endYear || th.endYear >= year)
  );

  return assignment?.teamId;
};

/**
 * Check if a team is currently assigned to any user
 */
export const isTeamAssignedToUser = (
  teamId: string,
  excludeUserId?: string
): boolean => {
  const users = getUsers();
  return users.some(
    (u) => u.currentTeamId === teamId && u.id !== excludeUserId
  );
};

/**
 * Get the user who currently controls a specific team
 */
export const getUserForTeam = (
  teamName: string
): import("@/types/user").User | undefined => {
  if (!teamName) return undefined;
  const users = getUsers();
  return users.find((user) => user.currentTeamId === teamName);
};

/**
 * Get the username for a team (returns undefined if team is not user-controlled)
 */
export const getUsernameForTeam = (teamName: string): string | undefined => {
  const user = getUserForTeam(teamName);
  return user?.name;
};

/**
 * Check if a team is user-controlled (assigned to any user)
 * This function uses the User vs User tracking system to determine if a team
 * is currently assigned to any user. It's kept for backward compatibility
 * with existing code that displays "(User)" tags throughout the app.
 */
export const isTeamUserControlled = (teamName: string): boolean => {
  if (!teamName) return false;
  return isTeamAssignedToUser(teamName);
};

// --- YEAR-BASED USER-TO-TEAM MAPPINGS ---

/**
 * Store user-to-team mappings for a specific year
 * This preserves which users controlled which teams during a season
 */
export const saveUserTeamMappingsForYear = (year: number): void => {
  const users = getUsers();
  const mappings: Record<string, string> = {}; // teamName -> userId

  users.forEach((user) => {
    if (user.currentTeamId) {
      mappings[user.currentTeamId] = user.id;
    }
  });

  const key = `userTeamMappings_${year}`;
  safeLocalStorage.setItem(key, JSON.stringify(mappings));
};

/**
 * Get user-to-team mappings for a specific year
 * Returns a map of teamName -> userId for that year
 */
export const getUserTeamMappingsForYear = (
  year: number
): Record<string, string> => {
  const key = `userTeamMappings_${year}`;
  const stored = safeLocalStorage.getItem(key);

  if (!stored) return {};

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error(`Error parsing user team mappings for year ${year}:`, error);
    return {};
  }
};

/**
 * Get the user who controlled a specific team in a specific year
 * This checks both the year-based mappings and the user's team history
 */
export const getUserForTeamInYear = (
  teamName: string,
  year: number
): import("@/types/user").User | undefined => {
  if (!teamName) return undefined;

  // First check year-based mappings (more reliable)
  const mappings = getUserTeamMappingsForYear(year);
  const userId = mappings[teamName];

  if (userId) {
    return getUserById(userId);
  }

  // Fallback to checking user team history
  const users = getUsers();
  return users.find((user) => {
    const assignment = user.teamHistory.find(
      (th) => th.startYear <= year && (!th.endYear || th.endYear >= year)
    );
    return assignment?.teamId === teamName;
  });
};

/**
 * Calculate head-to-head record against a specific user
 */
export const getHeadToHeadRecord = (
  userId: string
): import("@/types/user").HeadToHeadRecord | null => {
  const user = getUserById(userId);
  if (!user) return null;

  const coachProfile = getCoachProfile();
  const dynastyTeam = coachProfile?.schoolName || "";

  const allRecords = getAllYearRecords();
  const games: import("@/types/user").HeadToHeadGame[] = [];
  let wins = 0;
  let losses = 0;
  let ties = 0;

  // Iterate through all year records
  allRecords.forEach((record) => {
    const year = record.year;
    const userTeamForYear = getUserTeamForYear(userId, year);

    if (!userTeamForYear) return;

    // Load the schedule for this year (schedules are stored separately)
    const schedule = getSchedule(year);

    // Check each game in the schedule
    schedule.forEach((game) => {
      // Check if this game was against the user's team
      if (game.opponentUserId === userId || game.opponent === userTeamForYear) {
        // Skip if game hasn't been played yet
        if (game.result === "N/A" || game.result === "Bye") {
          return;
        }

        // Parse the score
        const scoreParts = game.score.split("-").map((s) => parseInt(s.trim()));
        if (
          scoreParts.length !== 2 ||
          isNaN(scoreParts[0]) ||
          isNaN(scoreParts[1])
        ) {
          return; // Skip if score is invalid
        }

        // Score format is always "Your Score - Opponent Score" from dynasty team's perspective
        const myScore = scoreParts[0];
        const theirScore = scoreParts[1];

        // Use the stored result (already from dynasty team's perspective)
        const result = game.result as "Win" | "Loss" | "Tie";

        // Update counters
        if (result === "Win") {
          wins++;
        } else if (result === "Loss") {
          losses++;
        } else if (result === "Tie") {
          ties++;
        }

        games.push({
          year,
          week: game.week,
          myTeam: dynastyTeam,
          theirTeam: userTeamForYear,
          myScore,
          theirScore,
          result,
          location: game.location as "@" | "vs" | "neutral",
        });
      }
    });
  });

  // Sort games by year and week (oldest first - ascending order)
  games.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  });

  return {
    userId,
    userName: user.name,
    wins,
    losses,
    ties,
    games,
  };
};
