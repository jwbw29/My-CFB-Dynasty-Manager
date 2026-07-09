/**
 * Formats a full player name ("First Last") into abbreviated display format ("Last, F.").
 * Handles suffixes (Jr., II, III, etc.), single-word names, and edge cases.
 * Storage format stays "First Last" — this is display-only.
 */
export function formatDisplayName(fullName: string): string {
  if (!fullName || !fullName.trim()) return fullName;

  const parts = fullName.trim().split(/\s+/);

  // Single name — return as-is since we can't split it
  if (parts.length === 1) return parts[0];

  // Suffixes that should stay attached to the last name
  const suffixes = new Set([
    "Jr",
    "Jr.",
    "Sr",
    "Sr.",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
  ]);

  const firstName = parts[0];
  const initial = firstName[0].toUpperCase();

  // Check if the final part is a suffix (e.g., "John Smith III")
  let lastName: string;
  let suffix = "";

  if (parts.length > 2 && suffixes.has(parts[parts.length - 1])) {
    suffix = " " + parts[parts.length - 1];
    lastName = parts.slice(1, -1).join(" ");
  } else {
    lastName = parts.slice(1).join(" ");
  }

  return `${lastName}${suffix}, ${initial}.`;
}

export function capitalizeName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      // Preserve initials like "TJ", "AJ", "JR"
      if (/^[A-Z]{2,}$/.test(word)) {
        return word.toUpperCase();
      }

      // Handle known prefixes
      if (/^Mc[A-Z]/i.test(word)) {
        return "Mc" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      if (/^Mac[A-Z]/i.test(word)) {
        return "Mac" + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
      }
      if (/^O'/.test(word)) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }

      // Handle apostrophes for names like De'Andre
      if (/^[A-Za-z]+['’][A-Za-z]+$/.test(word)) {
        const parts = word.split(/['’]/);
        return parts
          .map((part, index) => {
            if (index === 0) {
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            } else {
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
          })
          .join("'");
      }

      // Keep suffixes like "II", "III", "IV", "V", etc. uppercase
      if (/^(II|III|IV|V|VI|VII|VIII|IX|X)$/i.test(word)) {
        return word.toUpperCase();
      }

      // Handle hyphenated last names (e.g., Smith-Johnson)
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join("-");
      }

      // Default capitalization (first letter uppercase, rest lowercase)
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
