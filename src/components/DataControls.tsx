// src/components/DataControls.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { DynastyExporter } from "@/utils/dynasty-export";
import { toast } from "react-hot-toast";
import { useDynasty } from "@/contexts/DynastyContext";

const DataControls = () => {
  const { saveDynastyData, currentDynastyId } = useDynasty();

  const handleExport = () => {
    try {
      // Save immediately before export so the canonical dynasty_<id> snapshot includes in-memory edits.
      saveDynastyData();
      DynastyExporter.downloadDynastyBackup();
      toast.success("Current dynasty exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export dynasty"
      );
    }
  };

  const handleExportAllDynasties = () => {
    try {
      if (currentDynastyId) {
        saveDynastyData();
      }
      DynastyExporter.downloadAllDynastiesBackup();
      toast.success("All dynasties exported successfully");
    } catch (error) {
      console.error("Export all error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export all dynasties"
      );
    }
  };

  return (
    <div className="flex gap-4">
      <Button
        onClick={handleExport}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Download className="h-4 w-4" />
        Export Current Dynasty
      </Button>
      <Button
        onClick={handleExportAllDynasties}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Download className="h-4 w-4" />
        Export All Dynasties
      </Button>
      {/* The dangerous import button has been removed from this component */}
    </div>
  );
};

export default DataControls;
