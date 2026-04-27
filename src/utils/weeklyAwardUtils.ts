// src/utils/weeklyAwardUtils.ts
// Utilities for managing weekly player awards (National and Conference Player of the Week)

import type { Award } from '@/types/statTypes';

/**
 * National Offensive Player of the Week award name.
 * Used for season-long tracking and display.
 */
export const NATIONAL_OFFENSIVE_POTW = 'National Offensive Player of the Week';

/**
 * National Defensive Player of the Week award name.
 * Used for season-long tracking and display.
 */
export const NATIONAL_DEFENSIVE_POTW = 'National Defensive Player of the Week';

/**
 * Suffix for conference-specific Offensive Player of the Week awards.
 * Conference name is prepended at save time (e.g., "ACC Offensive Player of the Week").
 */
export const CONF_OFFENSIVE_POTW_SUFFIX = 'Offensive Player of the Week';

/**
 * Suffix for conference-specific Defensive Player of the Week awards.
 * Conference name is prepended at save time (e.g., "ACC Defensive Player of the Week").
 */
export const CONF_DEFENSIVE_POTW_SUFFIX = 'Defensive Player of the Week';

/**
 * Array of national-level weekly Player of the Week awards.
 * Conference awards are dynamically generated based on team conference.
 */
export const WEEKLY_AWARD_TYPES = [
  NATIONAL_OFFENSIVE_POTW,
  NATIONAL_DEFENSIVE_POTW,
] as const;

/**
 * All possible weekly POTW label categories for UI display and filtering.
 * Includes both national and conference award types.
 */
export const ALL_WEEKLY_POTW_LABELS = [
  'National Offensive',
  'National Defensive',
  'Conference Offensive',
  'Conference Defensive',
] as const;

/**
 * Determines if an award is a weekly Player of the Week award.
 * Weekly awards are identified by the presence of a week number.
 *
 * @param award - The award to check
 * @returns true if the award has a week number defined, false otherwise
 */
export const isWeeklyAward = (award: Award): boolean => {
  return award.week !== undefined;
};

/**
 * Builds a conference-specific Player of the Week award name.
 * Combines conference name with the appropriate side (Offensive/Defensive).
 *
 * @param conference - The conference abbreviation (e.g., "ACC", "Big Ten")
 * @param side - The award side: "Offensive" or "Defensive"
 * @returns Formatted award name (e.g., "ACC Offensive Player of the Week")
 */
export const buildConferenceAwardName = (
  conference: string,
  side: 'Offensive' | 'Defensive'
): string => {
  return `${conference} ${side} Player of the Week`;
};

/**
 * Determines the display priority for a weekly award.
 * Lower numbers display first. Used for sorting awards in UI.
 *
 * Priority order:
 * - National awards (Offensive/Defensive): 4
 * - Conference awards (ends with "Player of the Week" but not "National"): 5
 * - Other awards: 10
 *
 * @param awardName - The name of the award to prioritize
 * @returns Priority number (lower = higher priority)
 */
export const getWeeklyAwardPriority = (awardName: string): number => {
  // National awards get highest priority (4)
  if (
    awardName === NATIONAL_OFFENSIVE_POTW ||
    awardName === NATIONAL_DEFENSIVE_POTW
  ) {
    return 4;
  }

  // Conference awards (ends with "Player of the Week" but doesn't start with "National") get priority 5
  if (
    awardName.endsWith('Player of the Week') &&
    !awardName.startsWith('National')
  ) {
    return 5;
  }

  // Default priority for non-weekly awards
  return 10;
};
