// src/components/UserManagement.tsx
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, X, Check } from "lucide-react";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { fbsTeams } from "@/utils/fbsTeams";
import {
  getUsers,
  addUser,
  updateUserTeam,
  deleteUser,
  isTeamAssignedToUser,
  getCoachProfile,
} from "@/utils/localStorage";
import { User } from "@/types/user";
import { toast } from "react-hot-toast";

interface UserManagementProps {
  onUsersChange?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onUsersChange }) => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [newUserName, setNewUserName] = useState("");
  const [newUserTeam, setNewUserTeam] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState("");

  const coachProfile = getCoachProfile();
  const dynastyTeam = coachProfile?.schoolName || "";

  const refreshUsers = () => {
    setUsers(getUsers());
    onUsersChange?.();
  };

  // Get available teams for new user (exclude dynasty team and assigned teams)
  const getAvailableTeamsForNew = () => {
    return fbsTeams.filter(
      (team) =>
        team.name !== dynastyTeam && !isTeamAssignedToUser(team.name)
    );
  };

  // Get available teams for editing (exclude dynasty team and other users' teams)
  const getAvailableTeamsForEdit = (userId: string) => {
    return fbsTeams.filter(
      (team) =>
        team.name !== dynastyTeam && !isTeamAssignedToUser(team.name, userId)
    );
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) {
      toast.error("Please enter a user name");
      return;
    }
    if (!newUserTeam) {
      toast.error("Please select a team");
      return;
    }

    try {
      addUser(newUserName.trim(), newUserTeam);
      setNewUserName("");
      setNewUserTeam("");
      refreshUsers();
      toast.success(`Added user: ${newUserName}`);
    } catch (error) {
      toast.error("Failed to add user");
      console.error(error);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditingTeam(user.currentTeamId);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingTeam("");
  };

  const handleSaveEdit = (userId: string) => {
    if (!editingTeam) {
      toast.error("Please select a team");
      return;
    }

    try {
      updateUserTeam(userId, editingTeam);
      setEditingUserId(null);
      setEditingTeam("");
      refreshUsers();
      toast.success("User updated");
    } catch (error) {
      toast.error("Failed to update user");
      console.error(error);
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete ${userName}?`)) {
      try {
        deleteUser(userId);
        refreshUsers();
        toast.success(`Deleted user: ${userName}`);
      } catch (error) {
        toast.error("Failed to delete user");
        console.error(error);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New User Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <h3 className="font-semibold text-sm">Add New User</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">User Name</label>
              <Input
                placeholder="Enter user name..."
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUser();
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Team</label>
              <Select
                value={newUserTeam || "unselected"}
                onValueChange={(value) =>
                  setNewUserTeam(value === "unselected" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {newUserTeam ? (
                      <div className="flex items-center gap-2">
                        <TeamLogo teamName={newUserTeam} size="sm" />
                        <span>{newUserTeam}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Select a team...
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="unselected">-- Select a team --</SelectItem>
                  {getAvailableTeamsForNew()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((team) => (
                      <SelectItem key={team.name} value={team.name}>
                        <div className="flex items-center gap-2">
                          <TeamLogo teamName={team.name} size="sm" />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddUser}
              className="w-full"
              disabled={!newUserName.trim() || !newUserTeam}
            >
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Current Users</h3>
          
          {users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  {editingUserId === user.id ? (
                    // Edit Mode
                    <>
                      <div className="flex-1 space-y-2">
                        <div className="font-medium text-sm">{user.name}</div>
                        <Select
                          value={editingTeam}
                          onValueChange={setEditingTeam}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue>
                              {editingTeam ? (
                                <div className="flex items-center gap-2">
                                  <TeamLogo teamName={editingTeam} size="sm" />
                                  <span className="text-sm">{editingTeam}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  Select a team...
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {getAvailableTeamsForEdit(user.id)
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((team) => (
                                <SelectItem key={team.name} value={team.name}>
                                  <div className="flex items-center gap-2">
                                    <TeamLogo teamName={team.name} size="sm" />
                                    {team.name}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(user.id)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <TeamLogo teamName={user.currentTeamId} size="md" />
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.currentTeamId}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(user)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No users added yet. Add a user above to start tracking head-to-head records.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

