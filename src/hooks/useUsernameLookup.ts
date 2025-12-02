// src/hooks/useUsernameLookup.ts
"use client";

import { useMemo } from "react";
import { getUsers } from "@/utils/localStorage";

/**
 * Custom hook to create a memoized username lookup map
 * This prevents repeated localStorage calls for getUsernameForTeam
 * Performance optimization for components that need to look up usernames for many teams
 */
export const useUsernameLookup = () => {
  const usernameLookup = useMemo(() => {
    const users = getUsers();
    const lookup = new Map<string, string>();

    users.forEach((user) => {
      if (user.currentTeamId && user.name) {
        lookup.set(user.currentTeamId, user.name);
      }
    });

    return lookup;
  }, []); // Empty dependency array - only compute once per render cycle

  const getUsernameForTeam = (teamName: string): string | undefined => {
    return usernameLookup.get(teamName);
  };

  return { getUsernameForTeam, usernameLookup };
};
