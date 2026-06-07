export function formatHeight(inches: number | undefined): string {
  if (!inches) return "—";
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}
