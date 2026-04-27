// src/components/PlayerAwardsPage.tsx

"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AwardTracker from "@/components/AwardTracker";
import WeeklyAwards from "@/components/WeeklyAwards";

/**
 * PlayerAwardsPage - Wrapper component for player awards management.
 *
 * Provides a tabbed interface to split award tracking into two categories:
 * - Season: Existing award tracker for season-long awards (All-American, etc.)
 * - Weekly: Placeholder for future weekly award tracking functionality
 *
 * Uses Radix Tabs with defaultValue="season" to show season awards by default.
 * The Season tab renders the existing AwardTracker unchanged; Weekly tab shows
 * a placeholder until the weekly awards feature is implemented.
 */
export default function PlayerAwardsPage() {
  return (
    <Tabs defaultValue="season" className="w-full">
      {/* Tab Navigation */}
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="season">Season</TabsTrigger>
        <TabsTrigger value="weekly">Weekly</TabsTrigger>
      </TabsList>

      {/* Season Awards Tab - Renders existing AwardTracker */}
      <TabsContent value="season" className="mt-6">
        <AwardTracker />
      </TabsContent>

      {/* Weekly Awards Tab - Weekly POTW assignment workflow */}
      <TabsContent value="weekly" className="mt-6">
        <WeeklyAwards />
      </TabsContent>
    </Tabs>
  );
}
