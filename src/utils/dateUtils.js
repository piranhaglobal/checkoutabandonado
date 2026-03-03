export function toTzDate(date, tz) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(date);

    const get = (type) => parts.find(p => p.type === type)?.value;
    const year = parseInt(get('year'), 10);
    const month = parseInt(get('month'), 10) - 1;
    const day = parseInt(get('day'), 10);
    const hour = parseInt(get('hour'), 10);
    const minute = parseInt(get('minute'), 10);
    const second = parseInt(get('second'), 10);

    return new Date(Date.UTC(year, month, day, hour, minute, second));
}

export function isBusinessDay(date, tz) {
    const d = toTzDate(date, tz);
    const day = d.getUTCDay();
    return day >= 1 && day <= 5;
}

export function isWithinBusinessHours(date, tz, startHour, endHour) {
    if (!isBusinessDay(date, tz)) return false;
    const d = toTzDate(date, tz);
    const hour = d.getUTCHours();
    return hour >= startHour && hour < endHour;
}

export function isEligibleForSend(abandonedAt, now, days, tz, startHour, endHour) {
    if (!isWithinBusinessHours(now, tz, startHour, endHour)) return false;
    const nowTz = toTzDate(now, tz);
    const abandonedTz = toTzDate(abandonedAt, tz);
    const targetDate = new Date(Date.UTC(
        abandonedTz.getUTCFullYear(),
        abandonedTz.getUTCMonth(),
        abandonedTz.getUTCDate()
    ));
    targetDate.setUTCDate(targetDate.getUTCDate() + days);
    const nowDate = new Date(Date.UTC(
        nowTz.getUTCFullYear(),
        nowTz.getUTCMonth(),
        nowTz.getUTCDate()
    ));
    return nowDate >= targetDate;
}

export function getDayRangeForDaysAgo(daysAgo, tz, baseDate = new Date()) {
    const nowTz = toTzDate(baseDate, tz);
    const dayStart = new Date(Date.UTC(nowTz.getUTCFullYear(), nowTz.getUTCMonth(), nowTz.getUTCDate(), 0, 0, 0));
    dayStart.setUTCDate(dayStart.getUTCDate() - daysAgo);
    const dayEnd = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate(), 23, 59, 59));
    return {
        dateMin: dayStart.toISOString(),
        dateMax: dayEnd.toISOString()
    };
}

export function getDayRangeForDaysAgoWindow(daysAgo, windowDays, tz, baseDate = new Date()) {
    const startDaysAgo = daysAgo + Math.max(windowDays - 1, 0);
    const startRange = getDayRangeForDaysAgo(startDaysAgo, tz, baseDate);
    const endRange = getDayRangeForDaysAgo(daysAgo, tz, baseDate);
    return {
        dateMin: startRange.dateMin,
        dateMax: endRange.dateMax
    };
}
