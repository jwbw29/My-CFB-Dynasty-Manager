// src/contexts/DynastyContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  getTop25History,
  getSchedule,
  getUserControlledTeams,
} from "@/utils/localStorage"; // <-- Import getSchedule and getUserControlledTeams
import { RankedTeam, Top25History } from "@/hooks/useTop25Rankings";

interface DynastyContextType {
  currentDynastyId: string | null;
  isDynastyLoaded: boolean;
  dataVersion: number;
  refreshData: () => void;
  setCurrentDynastyId: (id: string | null) => void;
  saveDynastyData: () => void;
  latestUnlockedWeek: number;

  // --- NEW STATE & ACTIONS ---
  activeWeek: number;
  top25History: Top25History;
  setActiveWeek: (week: number) => void;
  advanceWeek: () => void;
  updateRankingsForWeek: (
    year: number,
    week: number,
    rankings: RankedTeam[]
  ) => void;
  getRankingsForWeek: (year: number, week: number) => RankedTeam[];

  // --- OTHERS RECEIVING VOTES ---
  updateOthersReceivingVotes: (
    year: number,
    week: number,
    text: string
  ) => void;
  getOthersReceivingVotes: (year: number, week: number) => string;

  // --- ADVANCE SCHEDULE FIELDS ---
  readyToAdvance: boolean;
  nextAdvance: string;
  setReadyToAdvance: (ready: boolean) => void;
  setNextAdvance: (date: string) => void;
}

const DynastyContext = createContext<DynastyContextType | undefined>(undefined);

export const useDynasty = () => {
  const context = useContext(DynastyContext);
  if (context === undefined) {
    throw new Error("useDynasty must be used within a DynastyProvider");
  }
  return context;
};

interface DynastyProviderProps {
  children: ReactNode;
}

export const DynastyProvider: React.FC<DynastyProviderProps> = ({
  children,
}) => {
  const [currentDynastyId, setCurrentDynastyId] = useState<string | null>(null);
  const [isDynastyLoaded, setIsDynastyLoaded] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [latestUnlockedWeek, setLatestUnlockedWeek] = useState(0);

  // --- NEW CENTRALIZED STATE ---
  const [activeWeek, setActiveWeekState] = useState(0);
  const [top25History, setTop25HistoryState] = useState<Top25History>({});
  const [othersReceivingVotes, setOthersReceivingVotes] = useState<{
    [year: number]: { [week: number]: string };
  }>({});

  // --- ADVANCE SCHEDULE STATE ---
  const [readyToAdvance, setReadyToAdvanceState] = useState(false);
  const [nextAdvance, setNextAdvanceState] = useState("");

  const refreshData = () => setDataVersion((v) => v + 1);

  // Load data when a dynasty is selected
  useEffect(() => {
    if (currentDynastyId) {
      const history = getTop25History();
      setTop25HistoryState(history);

      // Load advance schedule fields and others receiving votes
      const dynastyData = localStorage.getItem(`dynasty_${currentDynastyId}`);
      if (dynastyData) {
        try {
          const data = JSON.parse(dynastyData);
          setReadyToAdvanceState(data.readyToAdvance || false);
          setNextAdvanceState(data.nextAdvance || "");
          setOthersReceivingVotes(data.othersReceivingVotes || {});
        } catch (e) {
          console.error("Error loading dynasty data:", e);
          setReadyToAdvanceState(false);
          setNextAdvanceState("");
          setOthersReceivingVotes({});
        }
      } else {
        setReadyToAdvanceState(false);
        setNextAdvanceState("");
        setOthersReceivingVotes({});
      }

      // Calculate the correct active week based on schedule progress
      const currentYear = parseInt(
        localStorage.getItem("currentYear") || "2025"
      );
      const schedule = getSchedule(currentYear);

      if (schedule && schedule.length > 0) {
        // Find the last completed game
        const lastCompletedGame = [...schedule]
          .reverse()
          .find((g) => g.result !== "N/A");

        const calculatedActiveWeek = lastCompletedGame
          ? Math.min(lastCompletedGame.week + 1, 21)
          : 0;

        setActiveWeekState(calculatedActiveWeek);
        setLatestUnlockedWeek(calculatedActiveWeek);
      } else {
        setActiveWeekState(0);
      }

      setIsDynastyLoaded(true);
      refreshData();
    } else {
      setIsDynastyLoaded(false);
    }
  }, [currentDynastyId]);

  const setActiveWeek = (week: number) => {
    const newWeek = Math.max(0, Math.min(week, 21));
    setActiveWeekState(newWeek);

    // When we set the active week based on game progression,
    // it also becomes our new "latest unlocked week".
    // We only want to increase this, never decrease it.
    if (newWeek > latestUnlockedWeek) {
      setLatestUnlockedWeek(newWeek);
    }
  };

  const advanceWeek = () => {
    setActiveWeekState((prev) => Math.min(prev + 1, 21));
  };

  const setReadyToAdvance = (ready: boolean) => {
    setReadyToAdvanceState(ready);
    refreshData();
  };

  const setNextAdvance = (date: string) => {
    setNextAdvanceState(date);
    refreshData();
  };

  const updateRankingsForWeek = useCallback(
    (year: number, week: number, newRankings: RankedTeam[]) => {
      setTop25HistoryState((prevHistory) => {
        const newHistory = {
          ...prevHistory,
          [year]: {
            ...(prevHistory[year] || {}),
            [week]: newRankings,
          },
        };
        // No longer calls setTop25History. Only updates state.
        return newHistory;
      });
      refreshData();
    },
    []
  );

  const getRankingsForWeek = useCallback(
    (year: number, week: number): RankedTeam[] => {
      const yearData = top25History[year] || {};
      // Find the latest rankings at or before the given week
      let weekToSearch = week;
      while (weekToSearch >= 0) {
        if (yearData[weekToSearch]) {
          return yearData[weekToSearch];
        }
        weekToSearch--;
      }
      // Return empty rankings if none are found
      return Array.from({ length: 25 }, () => ({ name: "" }));
    },
    [top25History]
  );

  const updateOthersReceivingVotes = useCallback(
    (year: number, week: number, text: string) => {
      setOthersReceivingVotes((prev) => ({
        ...prev,
        [year]: {
          ...(prev[year] || {}),
          [week]: text,
        },
      }));
      refreshData();
    },
    []
  );

  const getOthersReceivingVotes = useCallback(
    (year: number, week: number): string => {
      const yearData = othersReceivingVotes[year] || {};
      return yearData[week] || "";
    },
    [othersReceivingVotes]
  );

  const saveDynastyData = useCallback(() => {
    if (!currentDynastyId) return;

    try {
      // This object will be built to represent the entire state of the dynasty.
      const dynastyData: Record<string, any> = {};

      // 1. Define the list of standard data keys to read from localStorage.
      // NOTE: 'top25History' is intentionally REMOVED from this list.
      const keysToReadFromStorage = [
        "coachProfile",
        "currentYear",
        "players",
        "playerStats",
        "allRecruits",
        "allTransfers",
        "allAwards",
        "yearRecords",
        "allTrophies",
      ];

      // 2. Read the standard keys from localStorage. These are managed by other components.
      keysToReadFromStorage.forEach((key) => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            dynastyData[key] = JSON.parse(data);
          } catch (e) {
            console.error(`Error parsing key ${key} from localStorage`, e);
          }
        }
      });

      // 3. **THE CRITICAL FIX**: Get the 'top25History' directly from the context's state.
      // This ensures the most up-to-date version is saved, preventing data loss.
      dynastyData.top25History = top25History;

      // 3.1. Add advance schedule fields, others receiving votes, user controlled teams, and users
      dynastyData.readyToAdvance = readyToAdvance;
      dynastyData.nextAdvance = nextAdvance;
      dynastyData.othersReceivingVotes = othersReceivingVotes;
      dynastyData.userControlledTeams = getUserControlledTeams();

      // Get users data from the dynasty data (it's already stored there by localStorage utils)
      const currentDynastyData = localStorage.getItem(
        `dynasty_${currentDynastyId}`
      );
      if (currentDynastyData) {
        try {
          const parsed = JSON.parse(currentDynastyData);
          if (parsed.users) {
            dynastyData.users = parsed.users;
          }
        } catch (e) {
          console.error("Error parsing users from dynasty data", e);
        }
      }

      // 4. Gather dynamic, year-specific and dynasty-specific keys from localStorage.
      Object.keys(localStorage).forEach((key) => {
        if (
          key &&
          (key.startsWith("schedule_") ||
            key.startsWith("yearStats_") ||
            key.startsWith(`records_${currentDynastyId}`) ||
            key.startsWith(`teamStats_${currentDynastyId}`) ||
            key.startsWith(`teamLeaders_${currentDynastyId}`) ||
            key.startsWith(`offensiveNeeds_${currentDynastyId}`) ||
            key.startsWith(`defensiveNeeds_${currentDynastyId}`))
        ) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              dynastyData[key] = JSON.parse(data);
            } catch (e) {
              console.error(`Error parsing dynamic key ${key}`, e);
            }
          }
        }
      });

      // 5. Write the complete, authoritative dynasty object to its dedicated storage slot.
      localStorage.setItem(
        `dynasty_${currentDynastyId}`,
        JSON.stringify(dynastyData)
      );

      // 6. Update the main 'dynasties' list with the latest metadata for the launch screen.
      const dynastiesListData = localStorage.getItem("dynasties");
      if (
        dynastiesListData &&
        dynastyData.coachProfile &&
        dynastyData.currentYear
      ) {
        const dynastiesList = JSON.parse(dynastiesListData);
        const updatedDynastiesList = dynastiesList.map((dynasty: any) =>
          dynasty.id === currentDynastyId
            ? {
                ...dynasty,
                coachName:
                  dynastyData.coachProfile.coachName || dynasty.coachName,
                schoolName:
                  dynastyData.coachProfile.schoolName || dynasty.schoolName,
                currentYear: dynastyData.currentYear || dynasty.currentYear,
                lastPlayed: new Date().toISOString(),
              }
            : dynasty
        );
        localStorage.setItem("dynasties", JSON.stringify(updatedDynastiesList));
      }
    } catch (error) {
      console.error("Error saving dynasty data:", error);
    }
  }, [
    currentDynastyId,
    top25History,
    readyToAdvance,
    nextAdvance,
    othersReceivingVotes,
  ]);

  const value: DynastyContextType = {
    currentDynastyId,
    isDynastyLoaded,
    setCurrentDynastyId,
    saveDynastyData,
    dataVersion,
    refreshData,
    latestUnlockedWeek,
    // --- EXPOSE NEW VALUES ---
    activeWeek,
    top25History,
    setActiveWeek,
    advanceWeek,
    updateRankingsForWeek,
    getRankingsForWeek,
    // --- OTHERS RECEIVING VOTES VALUES ---
    updateOthersReceivingVotes,
    getOthersReceivingVotes,
    // --- ADVANCE SCHEDULE VALUES ---
    readyToAdvance,
    nextAdvance,
    setReadyToAdvance,
    setNextAdvance,
  };

  return (
    <DynastyContext.Provider value={value}>{children}</DynastyContext.Provider>
  );
};
