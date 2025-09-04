// src/app/user-teams/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { fbsTeams } from "@/utils/fbsTeams";
import {
  getUserControlledTeams,
  setUserControlledTeams,
} from "@/utils/localStorage";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { toast } from "react-hot-toast";

const UserTeamsPage: React.FC = () => {
  const [userTeams, setUserTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Load user-controlled teams on component mount
  useEffect(() => {
    const loadUserTeams = () => {
      const teams = getUserControlledTeams();
      setUserTeams(teams);
      setIsLoading(false);
    };

    loadUserTeams();
  }, []);

  // Get available teams (not already selected)
  const getAvailableTeams = () => {
    return fbsTeams.filter((team) => !userTeams.includes(team.name));
  };

  // Handle team selection in dropdown
  const handleTeamSelection = (teamName: string) => {
    setSelectedTeam(teamName === "unselected" ? "" : teamName);
  };

  // Add new team
  const addNewUser = () => {
    if (selectedTeam && !userTeams.includes(selectedTeam)) {
      const newUserTeams = [...userTeams, selectedTeam];
      setUserTeams(newUserTeams);
      saveUserTeams(newUserTeams);
      setSelectedTeam(""); // Clear dropdown
    }
  };

  // Remove team
  const removeUserTeam = (teamToRemove: string) => {
    const newUserTeams = userTeams.filter((team) => team !== teamToRemove);
    setUserTeams(newUserTeams);
    saveUserTeams(newUserTeams);
  };

  // Save teams to localStorage
  const saveUserTeams = (teams: string[]) => {
    setUserControlledTeams(teams);
    if (teams.length > 0) {
      toast.success(`${teams.length} user team(s) saved`);
    } else {
      toast.success("User teams cleared");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-lg">Loading user teams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">User Teams</h1>
        <p className="text-muted-foreground mt-2">
          Manage which teams are under user control. These teams will display
          "(User)" throughout the application.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Add Team */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedTeam || "unselected"}
              onValueChange={handleTeamSelection}
            >
              <SelectTrigger className="h-12">
                <SelectValue>
                  {selectedTeam ? (
                    <div className="flex items-center gap-2">
                      <TeamLogo teamName={selectedTeam} size="sm" />
                      <span className="font-semibold">{selectedTeam}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Select a team...
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="unselected">
                  -- Select a team --
                </SelectItem>
                {getAvailableTeams()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((fbsTeam) => (
                    <SelectItem key={fbsTeam.name} value={fbsTeam.name}>
                      <div className="flex items-center gap-2">
                        <TeamLogo teamName={fbsTeam.name} size="sm" />
                        {fbsTeam.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              id="addNewUser"
              onClick={addNewUser}
              className="w-full h-12"
              disabled={!selectedTeam || userTeams.includes(selectedTeam)}
            >
              <Plus size={20} className="mr-2" />
              Add Team
            </Button>

            {userTeams.length >= fbsTeams.length && (
              <p className="text-sm text-muted-foreground text-center">
                All available teams have been added
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Current User Teams */}
        <Card>
          <CardHeader>
            <CardTitle>Current User Teams</CardTitle>
          </CardHeader>
          <CardContent>
            {userTeams.length > 0 ? (
              <div className="space-y-3">
                {userTeams.map((team) => (
                  <div
                    key={team}
                    className="relative flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <TeamLogo teamName={team} size="sm" />
                    <span className="font-medium flex-1">
                      {team}
                      <span className="text-xs text-blue-600 font-medium">
                        {" "}
                        (User)
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUserTeam(team)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No user teams selected. Use the dropdown on the left to add teams.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserTeamsPage;
