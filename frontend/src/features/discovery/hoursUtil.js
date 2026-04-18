/**
 * Parse Google Places `hours_json` into something the card can render.
 *
 * The backend stores a JSON-encoded array of human-readable day strings
 * like:
 *     ["Monday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
 *      "Tuesday: Closed", ...]
 *
 * The whitespace / em-dash characters vary depending on Google's locale
 * formatting, so we normalize before matching.
 */

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

/** Replace fancy whitespace / dashes with ASCII equivalents. */
function normalize(str) {
  return String(str || "")
    .replace(/[\u202f\u2009\u00a0]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turn "11:00 AM" or "7:00 PM" into minutes-since-midnight (0..1440). */
export function parseTime(s) {
  const m = normalize(s).match(/^(\d{1,2}):(\d{2})\s*([AP]M)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ap = (m[3] || "").toUpperCase();
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + mm;
}

/** Parse the raw hours_json into a { "Monday": "11:00 AM - 7:00 PM", ... } map. */
export function parseHoursJson(hoursJson) {
  if (!hoursJson) return null;
  let arr;
  try {
    arr = typeof hoursJson === "string" ? JSON.parse(hoursJson) : hoursJson;
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  const byDay = {};
  arr.forEach((raw) => {
    const entry = normalize(raw);
    const colonAt = entry.indexOf(":");
    if (colonAt < 0) return;
    const day = entry.slice(0, colonAt).trim();
    const rest = entry.slice(colonAt + 1).trim();
    if (DAY_NAMES.includes(day)) byDay[day] = rest;
  });
  return Object.keys(byDay).length ? byDay : null;
}

/** Return today's hours string, or null. `now` injectable for tests. */
export function getTodayHours(hoursJson, now = new Date()) {
  const byDay = parseHoursJson(hoursJson);
  if (!byDay) return null;
  const today = DAY_NAMES[now.getDay()];
  return byDay[today] || null;
}

/**
 * Return a human-friendly today-hours string with Unicode en-dash
 * ("11:00 AM – 7:00 PM") or "Closed" if shut today, or null if unknown.
 */
export function formatTodayHours(hoursJson, now = new Date()) {
  const h = getTodayHours(hoursJson, now);
  if (h == null) return null;
  if (/^closed\b/i.test(h)) return "Closed today";
  return h.replace(/\s*-\s*/, " – ");
}

/**
 * true  = open right now
 * false = closed right now (either "Closed" for today, or outside range)
 * null  = unknown (no hours data, unparseable entry, 24hr "Open 24 hours")
 *
 * Handles overnight ranges like "10:00 PM – 2:00 AM" (close < open).
 */
export function isOpenNow(hoursJson, now = new Date()) {
  const entry = getTodayHours(hoursJson, now);
  if (entry == null) return null;
  if (/^closed\b/i.test(entry)) return false;
  if (/open\s*24/i.test(entry)) return true;

  const normalized = normalize(entry);
  const match = normalized.match(
    /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i
  );
  if (!match) return null;

  const open  = parseTime(match[1]);
  const close = parseTime(match[2]);
  if (open == null || close == null) return null;

  const minsNow = now.getHours() * 60 + now.getMinutes();
  if (close <= open) {
    // Overnight — closes the next day
    return minsNow >= open || minsNow <= close;
  }
  return minsNow >= open && minsNow <= close;
}
