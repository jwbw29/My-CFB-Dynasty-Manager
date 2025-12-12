// src/components/Tools.tsx
"use client";

import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calculator, FileSpreadsheet, BarChart3, UserPlus } from "lucide-react";
import RecruitingCalculator from "./RecruitingCalculator";
import PlayerNameGenerator from "./PlayerNameGenerator";
import RecruitPredictor from "./RecruitingPredictor";
import DataControls from "./DataControls";
import { HeroHeader } from "@/components/ui/HeroHeader";

const Tools: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <HeroHeader title="Dynasty Tools" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
            <h3 className="text-2xl font-black text-white">
              Recruiting Predictor - @MaxPlaysCFB
            </h3>
          </div>
          <CardHeader className="hidden"></CardHeader>
          <CardContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <RecruitPredictor />
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h3 className="text-2xl font-black text-white">
              Recruiting Calculator - @MaxPlaysCFB
            </h3>
          </div>
          <CardHeader className="hidden"></CardHeader>
          <CardContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <RecruitingCalculator />
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h3 className="text-2xl font-black text-white">
              Player Name Generator
            </h3>
          </div>
          <CardHeader className="hidden"></CardHeader>
          <CardContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <PlayerNameGenerator />
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
            <h3 className="text-2xl font-black text-white">Import / Export</h3>
          </div>
          <CardHeader className="hidden"></CardHeader>
          <CardContent className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <DataControls />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tools;
