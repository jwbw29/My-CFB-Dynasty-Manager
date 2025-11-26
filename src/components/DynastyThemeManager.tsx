"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useDynasty } from "@/contexts/DynastyContext";
import { getCoachProfile } from "@/utils/localStorage";
import { hexToHSL, adjustHSLLightness, getForegroundColor } from "@/utils/colorUtils";

/**
 * Default theme colors to restore when no dynasty is active
 */
const DEFAULT_THEME = {
  light: {
    primary: "222.2 47.4% 11.2%",
    primaryForeground: "210 40% 98%",
    secondary: "210 40% 96.1%",
    secondaryForeground: "222.2 47.4% 11.2%",
    accent: "210 40% 96.1%",
    accentForeground: "222.2 47.4% 11.2%",
  },
  dark: {
    primary: "210 40% 98%",
    primaryForeground: "222.2 47.4% 11.2%",
    secondary: "217.2 32.6% 17.5%",
    secondaryForeground: "210 40% 98%",
    accent: "217.2 32.6% 17.5%",
    accentForeground: "210 40% 98%",
  },
};

/**
 * DynastyThemeManager
 *
 * Automatically applies dynasty school colors to the app theme.
 * - When a dynasty is active: applies school colors to theme variables
 * - When no dynasty: uses default neutral colors
 * - Auto-adjusts colors for dark mode
 */
export function DynastyThemeManager() {
  const { currentDynastyId } = useDynasty();
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    // If no dynasty is active, reset to defaults
    if (!currentDynastyId) {
      const defaults = isDark ? DEFAULT_THEME.dark : DEFAULT_THEME.light;
      root.style.setProperty("--primary", defaults.primary);
      root.style.setProperty("--primary-foreground", defaults.primaryForeground);
      root.style.setProperty("--secondary", defaults.secondary);
      root.style.setProperty("--secondary-foreground", defaults.secondaryForeground);
      root.style.setProperty("--accent", defaults.accent);
      root.style.setProperty("--accent-foreground", defaults.accentForeground);
      return;
    }

    // Load coach profile for current dynasty
    try {
      const profile = getCoachProfile();
      if (!profile?.schoolColors) return;

      const { primary, secondary, accent } = profile.schoolColors;

      // Convert hex colors to HSL
      let primaryHSL = hexToHSL(primary);
      let secondaryHSL = hexToHSL(secondary);
      let accentHSL = hexToHSL(accent);

      // Auto-adjust for dark mode
      if (isDark) {
        // For dark mode, we want to adjust the lightness
        // If a color is too dark, lighten it; if too light, keep it or slightly darken
        const primaryLightness = parseInt(primaryHSL.split('%')[1]);
        const secondaryLightness = parseInt(secondaryHSL.split('%')[1]);
        const accentLightness = parseInt(accentHSL.split('%')[1]);

        // Adjust primary: make it lighter if it's too dark
        if (primaryLightness < 40) {
          primaryHSL = adjustHSLLightness(primaryHSL, 30);
        } else if (primaryLightness > 70) {
          primaryHSL = adjustHSLLightness(primaryHSL, -10);
        }

        // Adjust secondary: darken it for dark mode backgrounds
        if (secondaryLightness > 30) {
          secondaryHSL = adjustHSLLightness(secondaryHSL, -40);
        }

        // Adjust accent: similar to secondary
        if (accentLightness > 30) {
          accentHSL = adjustHSLLightness(accentHSL, -40);
        }
      } else {
        // For light mode, ensure colors aren't too light
        const primaryLightness = parseInt(primaryHSL.split('%')[1]);
        const secondaryLightness = parseInt(secondaryHSL.split('%')[1]);
        const accentLightness = parseInt(accentHSL.split('%')[1]);

        // Darken primary if too light (needs good contrast on light background)
        if (primaryLightness > 60) {
          primaryHSL = adjustHSLLightness(primaryHSL, -30);
        }

        // Lighten secondary/accent for light mode (used for backgrounds)
        if (secondaryLightness < 70) {
          secondaryHSL = adjustHSLLightness(secondaryHSL, 30);
        }

        if (accentLightness < 70) {
          accentHSL = adjustHSLLightness(accentHSL, 30);
        }
      }

      // Calculate appropriate foreground colors
      const primaryForeground = getForegroundColor(primaryHSL);
      const secondaryForeground = getForegroundColor(secondaryHSL);
      const accentForeground = getForegroundColor(accentHSL);

      // Apply to CSS variables
      root.style.setProperty("--primary", primaryHSL);
      root.style.setProperty("--primary-foreground", primaryForeground);
      root.style.setProperty("--secondary", secondaryHSL);
      root.style.setProperty("--secondary-foreground", secondaryForeground);
      root.style.setProperty("--accent", accentHSL);
      root.style.setProperty("--accent-foreground", accentForeground);

      // Also set the old school-specific variables for backward compatibility
      root.style.setProperty("--school-primary", primary);
      root.style.setProperty("--school-secondary", secondary);
      root.style.setProperty("--school-accent", accent);
    } catch (error) {
      console.error("Error applying dynasty theme:", error);
    }
  }, [currentDynastyId, resolvedTheme]);

  // This component doesn't render anything
  return null;
}
