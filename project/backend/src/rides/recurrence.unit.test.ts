import { describe, expect, it } from 'vitest'

import { formatDepartureTimeLocal, generateRideOccurrences } from './recurrence'

function asLocalParts(date: Date) {
  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
}

describe('formatDepartureTimeLocal', () => {
  it('formats the local time as HH:MM', () => {
    expect(formatDepartureTimeLocal('2026-05-10T08:05:00')).toBe('08:05')
  })
})

describe('generateRideOccurrences', () => {
  it('returns the original departure for one-time rides', () => {
    const occurrences = generateRideOccurrences({
      offerType: 'ONE_TIME',
      departureTime: '2026-05-12T08:30:00',
    })

    expect(occurrences.map(asLocalParts)).toEqual([
      [2026, 4, 12, 8, 30],
    ])
  })

  it('generates daily occurrences on consecutive days until the end date', () => {
    const occurrences = generateRideOccurrences({
      offerType: 'RECURRING',
      departureTime: '2026-05-10T08:30:00',
      recurrencePattern: 'DAILY',
      recurrenceEndDate: '2026-05-13T12:00:00',
      windowDays: 10,
    })

    expect(occurrences.map(asLocalParts)).toEqual([
      [2026, 4, 10, 8, 30],
      [2026, 4, 11, 8, 30],
      [2026, 4, 12, 8, 30],
      [2026, 4, 13, 8, 30],
    ])
  })

  it('generates weekly occurrences on the same weekday only', () => {
    const occurrences = generateRideOccurrences({
      offerType: 'RECURRING',
      departureTime: '2026-05-10T08:30:00',
      recurrencePattern: 'WEEKLY',
      windowDays: 15,
    })

    expect(occurrences.map(asLocalParts)).toEqual([
      [2026, 4, 10, 8, 30],
      [2026, 4, 17, 8, 30],
      [2026, 4, 24, 8, 30],
    ])
  })

  it('dedupes and filters invalid specific-day values', () => {
    const occurrences = generateRideOccurrences({
      offerType: 'RECURRING',
      departureTime: '2026-05-10T08:30:00',
      recurrencePattern: 'SPECIFIC_DAYS',
      recurrenceDays: [1, 1, 3, 9, -1],
      recurrenceEndDate: '2026-05-15T12:00:00',
      windowDays: 10,
    })

    expect(occurrences.map(asLocalParts)).toEqual([
      [2026, 4, 11, 8, 30],
      [2026, 4, 13, 8, 30],
    ])
  })

  it('falls back to the first departure when no recurrence day is matched', () => {
    const occurrences = generateRideOccurrences({
      offerType: 'RECURRING',
      departureTime: '2026-05-10T08:30:00',
      recurrencePattern: 'SPECIFIC_DAYS',
      recurrenceDays: [],
      recurrenceEndDate: '2026-05-10T12:00:00',
      windowDays: 3,
    })

    expect(occurrences.map(asLocalParts)).toEqual([
      [2026, 4, 10, 8, 30],
    ])
  })
})
