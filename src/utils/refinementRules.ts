/* Praise Kier */
export const TREMOR_THRESHOLD = 70;
export const CONNECTIVITY = 8;
export const BIN_ORDER = ["WO", "FC", "DR", "MA"] as const;
export type BinCode = (typeof BIN_ORDER)[number];

export function binForGroup(digitSum: number): BinCode {
  const idx = digitSum % 4;
  return BIN_ORDER[idx];
}

export function groupDigitSum(values: string[]): number {
  let sum = 0;
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

export function isNoise(size: number, min: number, max: number): boolean {
  return size < min || size > max;
}
