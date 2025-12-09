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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-6 md:p-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
            User vs User Tracking
          </h1>
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mt-2">
            Track head-to-head records against your friends
          </p>
        </div>
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
              onGameAdded={handleUsersChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTeamsPage;
