"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverTrigger, PopoverContent } from "./popover"
import { Checkbox } from "./checkbox"
import { Button } from "./button"

/**
 * Represents a single selectable option in the multiselect dropdown.
 */
export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * Represents a logical group of options that can be toggled together.
 * Used to provide quick "select all in category" functionality.
 */
export interface MultiSelectGroup {
  label: string;
  values: string[];  // option values that belong to this group
}

export interface MultiSelectProps {
  /** Array of selectable options */
  options: MultiSelectOption[];
  /** Currently selected option values */
  selected: string[];
  /** Callback fired when selection changes */
  onChange: (selected: string[]) => void;
  /** Placeholder text used in trigger button (e.g., "Positions", "Teams") */
  placeholder: string;
  /** Optional groups for batch toggle functionality */
  groups?: MultiSelectGroup[];
}

/**
 * MultiSelect - A popover-based multiselect component with checkboxes.
 * 
 * Features:
 * - Trigger button displays selected count or labels
 * - Optional group toggle buttons for batch selection/deselection
 * - Scrollable checkbox list with full-row clickability
 * - Styling consistent with existing Select component
 * 
 * Trigger button behavior:
 * - No selections: "All {placeholder}" (e.g., "All Positions")
 * - 1-2 selections: Comma-separated labels (e.g., "QB, WR")
 * - 3+ selections: Count display (e.g., "3 selected")
 * 
 * Group toggle behavior:
 * - If ALL group values are selected → clicking deselects all
 * - If ANY group value is unselected → clicking selects all
 * 
 * @example
 * ```tsx
 * <MultiSelect
 *   options={[
 *     { value: "QB", label: "Quarterback" },
 *     { value: "RB", label: "Running Back" }
 *   ]}
 *   selected={["QB"]}
 *   onChange={setSelected}
 *   placeholder="Positions"
 *   groups={[
 *     { label: "Offense", values: ["QB", "RB", "WR"] }
 *   ]}
 * />
 * ```
 */
export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder,
  groups = [],
}) => {
  /**
   * Calculates the trigger button display text based on selection count.
   * Shows "All X" when empty, comma-separated labels for 1-2 items,
   * and count for 3+ items.
   */
  const getTriggerText = () => {
    if (selected.length === 0) {
      return `All ${placeholder}`;
    }
    if (selected.length <= 2) {
      // Map selected values to their labels and join with commas
      return selected
        .map(val => options.find(opt => opt.value === val)?.label)
        .filter(Boolean)
        .join(", ");
    }
    return `${selected.length} selected`;
  };

  /**
   * Handles individual checkbox toggle.
   * Adds value if not present, removes if already selected.
   */
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  /**
   * Handles group toggle button click.
   * Logic: If ALL group values are currently selected, deselect all of them.
   * If ANY group value is unselected, select all of them.
   * This provides intuitive "select all / deselect all" behavior per group.
   */
  const handleGroupToggle = (group: MultiSelectGroup) => {
    const allGroupValuesSelected = group.values.every(val => selected.includes(val));
    
    if (allGroupValuesSelected) {
      // Deselect all values in this group
      onChange(selected.filter(val => !group.values.includes(val)));
    } else {
      // Select all values in this group (merge with existing selections, avoid duplicates)
      const newSelected = [...selected];
      group.values.forEach(val => {
        if (!newSelected.includes(val)) {
          newSelected.push(val);
        }
      });
      onChange(newSelected);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* 
          Trigger button matches SelectTrigger styling:
          - h-10 height for consistency with Select component
          - Standard border, rounded corners, ring focus behavior
          - ChevronDown icon to indicate dropdown affordance
        */}
        <button
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <span className="line-clamp-1">{getTriggerText()}</span>
          <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      
      {/*
        PopoverContent aligned to start to match trigger width.
        Using w-full ensures the popover is as wide as the trigger button.
      */}
      <PopoverContent align="start" className="w-full p-0">
        <div className="flex flex-col">
          {/* 
            Group toggle buttons section.
            Only rendered if groups are provided.
            Buttons are displayed horizontally with wrapping support.
          */}
          {groups.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 p-3 border-b">
                {groups.map((group) => {
                  const allSelected = group.values.every(val => selected.includes(val));
                  return (
                    <Button
                      key={group.label}
                      variant={allSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleGroupToggle(group)}
                      className="text-xs"
                    >
                      {group.label}
                    </Button>
                  );
                })}
              </div>
            </>
          )}
          
          {/*
            Scrollable checkbox list.
            max-height of 250px prevents the popover from becoming too tall.
            Each row is a clickable label containing a checkbox and text.
          */}
          <div className="max-h-[250px] overflow-y-auto p-2">
              {options.map((option) => {
                const isChecked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-2 py-2 rounded-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(option.value)}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                );
              })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
