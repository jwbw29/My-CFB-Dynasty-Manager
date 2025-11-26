/**
 * Color utility functions for theme management
 */

/**
 * Convert hex color to HSL format used by CSS variables
 * @param hex - Hex color string (e.g., "#3B82F6" or "3B82F6")
 * @returns HSL string without hsl() wrapper (e.g., "222.2 47.4% 11.2%")
 */
export function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${hDeg} ${sPercent}% ${lPercent}%`;
}

/**
 * Adjust lightness of HSL color for dark mode
 * @param hsl - HSL string (e.g., "222 47% 11%")
 * @param lightnessAdjustment - Amount to adjust lightness (-100 to 100)
 * @returns Adjusted HSL string
 */
export function adjustHSLLightness(hsl: string, lightnessAdjustment: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;

  const [, h, s, l] = parts;
  const newL = Math.max(0, Math.min(100, parseInt(l) + lightnessAdjustment));

  return `${h} ${s}% ${newL}%`;
}

/**
 * Check if a color is light or dark based on HSL lightness
 * @param hsl - HSL string (e.g., "222 47% 11%")
 * @returns true if color is light (lightness > 50%)
 */
export function isLightColor(hsl: string): boolean {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return false;

  const lightness = parseInt(parts[3]);
  return lightness > 50;
}

/**
 * Get appropriate foreground color (text color) for a background color
 * @param hsl - HSL string of background color
 * @returns HSL string for foreground color (white or near-black)
 */
export function getForegroundColor(hsl: string): string {
  return isLightColor(hsl) ? '222.2 84% 4.9%' : '210 40% 98%';
}
