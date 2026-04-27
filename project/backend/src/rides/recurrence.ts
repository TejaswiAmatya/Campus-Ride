export type RideOfferType = "ONE_TIME" | "RECURRING";
export type RideRecurrencePattern = "NONE" | "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";

type GenerateRideOccurrencesInput = {
  offerType: RideOfferType;
  departureTime: string;
  recurrencePattern?: RideRecurrencePattern;
  recurrenceDays?: number[];
  recurrenceEndDate?: string | null;
  windowDays?: number;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function combineDateWithTime(baseDate: Date, sourceDateTime: Date) {
  const value = new Date(baseDate);
  value.setHours(
    sourceDateTime.getHours(),
    sourceDateTime.getMinutes(),
    sourceDateTime.getSeconds(),
    sourceDateTime.getMilliseconds(),
  );
  return value;
}

function dedupeSortedDays(days: number[]) {
  return Array.from(new Set(days))
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

export function formatDepartureTimeLocal(isoDateTime: string) {
  const value = new Date(isoDateTime);
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function generateRideOccurrences({
  offerType,
  departureTime,
  recurrencePattern = "NONE",
  recurrenceDays = [],
  recurrenceEndDate,
  windowDays = 30,
}: GenerateRideOccurrencesInput): Date[] {
  const firstDeparture = new Date(departureTime);

  if (offerType === "ONE_TIME" || recurrencePattern === "NONE") {
    return [firstDeparture];
  }

  const windowStart = startOfDay(firstDeparture);
  const windowEnd = addDays(windowStart, windowDays);
  const endDate = recurrenceEndDate ? startOfDay(new Date(recurrenceEndDate)) : null;
  const results: Date[] = [];
  const normalizedDays = dedupeSortedDays(recurrenceDays);

  for (
    let cursor = new Date(windowStart);
    cursor <= windowEnd;
    cursor = addDays(cursor, 1)
  ) {
    if (endDate && cursor > endDate) {
      break;
    }

    const weekday = cursor.getDay();
    const include =
      recurrencePattern === "DAILY"
        ? true
        : recurrencePattern === "WEEKLY"
          ? weekday === firstDeparture.getDay()
          : normalizedDays.includes(weekday);

    if (!include) {
      continue;
    }

    const instance = combineDateWithTime(cursor, firstDeparture);
    if (instance < firstDeparture) {
      continue;
    }

    results.push(instance);
  }

  return results.length > 0 ? results : [firstDeparture];
}
