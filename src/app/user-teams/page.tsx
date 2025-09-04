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
  const [isLoading, setIsLoading] = useState(true);

  // Load user-controlled teams on component mount
  useEffect(() => {
    const loadUserTeams = () => {
      const teams = getUserControlledTeams();
      setUserTeams(teams.length > 0 ? teams : [""]);
      setIsLoading(false);
    };

    loadUserTeams();
  }, []);

  // Get available teams (not already selected)
  const getAvailableTeams = (currentIndex: number) => {
    const selectedTeams = userTeams.filter((team, index) => team && index !== currentIndex);
    return fbsTeams.filter(team => !selectedTeams.includes(team.name));
  };

  // Handle team selection
  const handleTeamChange = (index: number, teamName: string) => {
    const newUserTeams = [...userTeams];
    newUserTeams[index] = teamName === "unselected" ? "" : teamName;
    setUserTeams(newUserTeams);
    saveUserTeams(newUserTeams);
  };

  // Add new team slot
  const addNewTeamSlot = () => {
    setUserTeams([...userTeams, ""]);
  };

  // Remove team slot
  const removeTeamSlot = (index: number) => {
    if (userTeams.length <= 1) {
      // Always keep at least one slot, but make it empty
      const newUserTeams = [""];
      setUserTeams(newUserTeams);
      saveUserTeams(newUserTeams);
    } else {
      const newUserTeams = userTeams.filter((_, i) => i !== index);
      setUserTeams(newUserTeams);
      saveUserTeams(newUserTeams);
    }
  };

  // Save teams to localStorage
  const saveUserTeams = (teams: string[]) => {
    const validTeams = teams.filter(team => team.trim() !== "");
    setUserControlledTeams(validTeams);
    if (validTeams.length > 0) {
      toast.success(`${validTeams.length} user team(s) saved`);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">User Teams</h1>
        <p className="text-muted-foreground mt-2">
          Manage which teams are under user control. These teams will display "(User)" throughout the application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User-Controlled Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userTeams.map((team, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <Select
                    value={team || "unselected"}
                    onValueChange={(val) => handleTeamChange(index, val)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue>
                        {team ? (
                          <div className="flex items-center gap-2">
                            <TeamLogo teamName={team} size="sm" />
                            <span className="font-semibold">
                              {team}
                              <span className="text-xs text-blue-600 font-medium"> (User)</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select a team...</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="unselected">-- Select a team --</SelectItem>
                      {getAvailableTeams(index)
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
                </div>
                
                {userTeams.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeTeamSlot(index)}
                    className="h-12 w-12 p-0"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            ))}
            
            {/* Add New User Button */}
            <Button
              id="addNewUser"
              variant="outline"
              onClick={addNewTeamSlot}
              className="w-full h-12 border-dashed border-2 hover:border-solid transition-all"
              disabled={userTeams.length >= fbsTeams.length}
            >
              <Plus size={20} />
            </Button>
            
            {userTeams.length >= fbsTeams.length && (
              <p className="text-sm text-muted-foreground text-center">
                All available teams have been added
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current User Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {userTeams.filter(team => team.trim() !== "").length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {userTeams
                .filter(team => team.trim() !== "")
                .map((team, index) => (
                  <div
                    key={`${team}-${index}`}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    <TeamLogo teamName={team} size="sm" />
                    <span className="font-medium">
                      {team}
                      <span className="text-xs text-blue-600 font-medium"> (User)</span>
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No user teams selected. Add teams above to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserTeamsPage;