// src/components/TeamInfoDisplay.tsx
// Component to display team info with custom team support
import React from "react";
import { CustomTeamManager } from "@/utils/customTeamManager";
import { getUsernameForTeam } from "@/utils/localStorage";

interface TeamInfoDisplayProps {
  teamName: string;
  showConference?: boolean;
  showStadium?: boolean;
  className?: string;
}

export const TeamInfoDisplay: React.FC<TeamInfoDisplayProps> = ({
  teamName,
  showConference = false,
  showStadium = false,
  className = "",
}) => {
  const teamInfo = CustomTeamManager.getEffectiveTeam(teamName);
  const isCustom = CustomTeamManager.isCustomTeam(teamName);

  if (!teamInfo) {
    const username = getUsernameForTeam(teamName);
    return (
      <span className={className}>
        {teamName}
        {username && (
          <span className="text-xs text-blue-600 font-medium">
            {" "}
            ({username})
          </span>
        )}
      </span>
    );
  }

  const username = getUsernameForTeam(teamInfo.name);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="font-semibold">
          {teamInfo.name}
          {username && (
            <span className="text-xs text-blue-600 font-medium">
              {" "}
              ({username})
            </span>
          )}
        </span>
        {isCustom && (
          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
            Custom
          </span>
        )}
      </div>
      {teamInfo.nickName && (
        <div className="text-sm text-gray-600">{teamInfo.nickName}</div>
      )}
      {showConference && (
        <div className="text-sm text-gray-500">{teamInfo.conference}</div>
      )}
      {showStadium && (
        <div className="text-sm text-gray-500">{teamInfo.stadium}</div>
      )}
    </div>
  );
};
