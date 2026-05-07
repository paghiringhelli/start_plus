export function parseDurationHours(rawText) {
  const text = rawText.replace(/\u00a0/g, ' ').trim()
  const match = text.match(/^(-?\d+)h\s*(\d+)min$/i)
  if (!match) {
    return null
  }

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  const sign = hours < 0 ? -1 : 1
  return hours + sign * (minutes / 60)
}

export function formatHoursToHm(value) {
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const totalMinutes = Math.round(abs * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${sign}${hours}h ${minutes}min`
}

export function normalizeTimeDisplay(rawTime) {
  const match = String(rawTime || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?$/)
  if (!match) {
    return rawTime
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function parseTimeParts(rawTime) {
  const match = String(rawTime || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d{1,3})?)?$/)
  if (!match) {
    return null
  }

  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2], 10)
  const seconds = Number.parseInt(match[3] || '0', 10)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null
  }

  return { hours, minutes, seconds }
}

export function normalizeDateDisplay(rawDate) {
  return rawDate.replace(/(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?/g, '$1')
}

export function splitDateAndTime(rawDate) {
  const trimmed = rawDate.trim()
  const match = trimmed.match(/^(.*?)(?:\s+(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?)?$/)
  if (!match) {
    return {
      datePart: trimmed,
      timePart: '',
    }
  }

  return {
    datePart: (match[1] || '').trim(),
    timePart: (match[2] || '').trim(),
  }
}

export function parseTimeToSeconds(rawTime) {
  const timeParts = parseTimeParts(rawTime)
  if (!timeParts) {
    return null
  }

  return (timeParts.hours * 3600) + (timeParts.minutes * 60) + timeParts.seconds
}

export function sanitizeSubtitleDisplay(text) {
  return text.replace(/(\d{1,2}:\d{2})(?::\d{2}(?:[.,]\d{1,3})?)?/g, '$1')
}

export function parseDateDisplayParts(dateDisplay) {
  const match = String(dateDisplay || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) {
    return null
  }

  const day = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const year = Number.parseInt(match[3], 10)
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null
  }

  return { day, month, year }
}

export function parseDateTimeToMs(dateDisplay, timeRaw) {
  const dateParts = parseDateDisplayParts(dateDisplay)
  if (!dateParts) {
    return null
  }

  const timeParts = parseTimeParts(timeRaw || '00:00')
  if (!timeParts) {
    return null
  }

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
    timeParts.seconds,
    0,
  ).getTime()
}

export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

export function getHoursInYear(year) {
  return isLeapYear(year) ? 8784 : 8760
}

export function computeThresholdHours(durationMinutes, periodYear, yearlyTargetHours) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return 0
  }

  const durationHours = durationMinutes / 60
  return (yearlyTargetHours * durationHours) / getHoursInYear(periodYear)
}
