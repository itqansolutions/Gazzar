export const CHECKIN_METRICS = {
  WEIGHT: "WEIGHT",
  BODY_MEASUREMENTS: "BODY_MEASUREMENTS",
  PROGRESS_PHOTOS: "PROGRESS_PHOTOS",
  CURRENT_ISSUES: "CURRENT_ISSUES",
  GENERAL_FEEDBACK: "GENERAL_FEEDBACK",
} as const;

export type CheckInMetric = typeof CHECKIN_METRICS[keyof typeof CHECKIN_METRICS];

export const ALL_CHECKIN_METRICS: readonly CheckInMetric[] = Object.values(CHECKIN_METRICS);

/**
 * Validates an array of check-in metric strings against allowed values.
 * Throws an error if any unknown metric is provided.
 */
export function validateCheckInMetrics(input: unknown): CheckInMetric[] {
  if (!Array.isArray(input)) {
    throw new Error("requestedMetrics must be an array of strings");
  }

  const validSet = new Set<string>(ALL_CHECKIN_METRICS);
  const result: CheckInMetric[] = [];

  for (const item of input) {
    if (typeof item !== "string" || !validSet.has(item)) {
      throw new Error(`Invalid check-in metric: ${String(item)}`);
    }
    if (!result.includes(item as CheckInMetric)) {
      result.push(item as CheckInMetric);
    }
  }

  return result;
}
