// src/components/HeadToHeadRecords.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { getUsers, getHeadToHeadRecord } from "@/utils/localStorage";
import { User, HeadToHeadRecord } from "@/types/user";
import { ChevronRight } from "lucide-react";

interface HeadToHeadRecordsProps {
  onUserSelect: (userId: string) => void;
  selectedUserId: string | null;
  refreshTrigger?: number;
}

export const HeadToHeadRecords: React.FC<HeadToHeadRecordsProps> = ({
  onUserSelect,
  selectedUserId,
  refreshTrigger,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<Map<string, HeadToHeadRecord>>(new Map());

  useEffect(() => {
    loadRecords();
  }, [refreshTrigger]);

  const loadRecords = () => {
    const allUsers = getUsers();
    setUsers(allUsers);

    const recordsMap = new Map<string, HeadToHeadRecord>();
    allUsers.forEach((user) => {
      const record = getHeadToHeadRecord(user.id);
      if (record) {
        recordsMap.set(user.id, record);
      }
    });
    setRecords(recordsMap);
  };

  const getRecordString = (record: HeadToHeadRecord | undefined): string => {
    if (!record) return "(0-0)";
    if (record.ties > 0) {
      return `(${record.wins}-${record.losses}-${record.ties})`;
    }
    return `(${record.wins}-${record.losses})`;
  };

  const getRecordColor = (record: HeadToHeadRecord | undefined): string => {
    if (!record || record.wins + record.losses + record.ties === 0) {
      return "text-muted-foreground";
    }
    
    const winPct = record.wins / (record.wins + record.losses + record.ties);
    if (winPct > 0.6) return "text-green-600 dark:text-green-400";
    if (winPct < 0.4) return "text-red-600 dark:text-red-400";
    return "text-yellow-600 dark:text-yellow-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Head-to-Head Records</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length > 0 ? (
          <div className="space-y-2">
            {users.map((user) => {
              const record = records.get(user.id);
              const isSelected = selectedUserId === user.id;
              
              return (
                <button
                  key={user.id}
                  onClick={() => onUserSelect(user.id)}
                  className={`w-full flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    isSelected
                      ? "bg-primary/10 border-primary"
                      : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <TeamLogo teamName={user.currentTeamId} size="md" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.currentTeamId}
                    </div>
                  </div>
                  <div className={`font-bold ${getRecordColor(record)}`}>
                    {getRecordString(record)}
                  </div>
                  <ChevronRight
                    size={20}
                    className={`transition-transform ${
                      isSelected ? "rotate-90" : ""
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8 text-sm">
            No users to display. Add users in the User Management section to track records.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

