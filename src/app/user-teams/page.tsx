// src/app/user-teams/page.tsx

"use client";

import React, { useState } from "react";
import { UserManagement } from "@/components/UserManagement";
import { HeadToHeadRecords } from "@/components/HeadToHeadRecords";
import { GameHistoryDetail } from "@/components/GameHistoryDetail";

const UserTeamsPage: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUsersChange = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId === selectedUserId ? null : userId);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">User vs User Tracking</h1>
        <p className="text-muted-foreground mt-2">
          Track head-to-head records against your friends
        </p>
      </div>

      <div className="space-y-6 mt-6">
        {/* User Management Section */}
        <UserManagement onUsersChange={handleUsersChange} />

        {/* Head-to-Head Records and Game History */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: User List with Records */}
          <div className="lg:col-span-2">
            <HeadToHeadRecords
              onUserSelect={handleUserSelect}
              selectedUserId={selectedUserId}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Right: Game History Detail */}
          <div className="lg:col-span-3">
            <GameHistoryDetail
              userId={selectedUserId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTeamsPage;
