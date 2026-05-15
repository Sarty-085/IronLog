// Unit conversion. All weights are PERSISTED in the user's preferred units
// as recorded; for display we convert through these helpers.
export type Units = "lbs" | "kg";

export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 2.2046226218;

export function convertWeight(value: number, from: Units, to: Units): number {
  if (from === to) return value;
  return from === "lbs" ? value * KG_PER_LB : value * LB_PER_KG;
}

/** Round to display precision: kg .25, lbs whole. */
export function roundForUnits(value: number, units: Units): number {
  if (units === "kg") return Math.round(value * 4) / 4;
  return Math.round(value);
}

export function formatWeight(value: number, units: Units): string {
  return `${roundForUnits(value, units).toLocaleString(undefined, {
    maximumFractionDigits: units === "kg" ? 2 : 0,
  })} ${units}`;
}
