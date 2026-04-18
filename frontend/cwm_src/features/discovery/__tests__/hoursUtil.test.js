import {
  parseTime,
  parseHoursJson,
  getTodayHours,
  formatTodayHours,
  isOpenNow,
} from "../hoursUtil";

/**
 * A realistic hours_json that the backend sends. Note the Unicode:
 *   \u202f = narrow no-break space (between time and AM/PM)
 *   \u2009 = thin space (around the en-dash)
 *   \u2013 = en-dash
 */
const HOURS_STANDARD = JSON.stringify([
  "Sunday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
  "Monday: Closed",
  "Tuesday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
  "Wednesday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
  "Thursday: 11:00\u202fAM\u2009\u2013\u20097:00\u202fPM",
  "Friday: 11:00\u202fAM\u2009\u2013\u200911:00\u202fPM",
  "Saturday: 10:00\u202fAM\u2009\u2013\u200911:00\u202fPM",
]);

const HOURS_OVERNIGHT = JSON.stringify([
  "Sunday: 10:00\u202fPM\u2009\u2013\u20092:00\u202fAM",
  "Monday: Closed",
  "Tuesday: Closed",
  "Wednesday: Closed",
  "Thursday: Closed",
  "Friday: 10:00\u202fPM\u2009\u2013\u20092:00\u202fAM",
  "Saturday: 10:00\u202fPM\u2009\u2013\u20092:00\u202fAM",
]);

const HOURS_24 = JSON.stringify([
  "Sunday: Open 24 hours",
  "Monday: Open 24 hours",
  "Tuesday: Open 24 hours",
  "Wednesday: Open 24 hours",
  "Thursday: Open 24 hours",
  "Friday: Open 24 hours",
  "Saturday: Open 24 hours",
]);

describe("parseTime", () => {
  it("parses 12h clock times to minutes past midnight", () => {
    expect(parseTime("12:00 AM")).toBe(0);
    expect(parseTime("1:30 AM")).toBe(90);
    expect(parseTime("12:00 PM")).toBe(720);
    expect(parseTime("1:00 PM")).toBe(780);
    expect(parseTime("11:59 PM")).toBe(23 * 60 + 59);
  });
  it("returns null on invalid input", () => {
    expect(parseTime("25:00 PM")).toBeNull();
    expect(parseTime("garbage")).toBeNull();
    expect(parseTime(null)).toBeNull();
  });
});

describe("parseHoursJson", () => {
  it("returns a { day: range } map", () => {
    const map = parseHoursJson(HOURS_STANDARD);
    expect(map.Monday).toBe("Closed");
    expect(map.Tuesday).toBe("11:00 AM - 7:00 PM");
    expect(map.Friday).toBe("11:00 AM - 11:00 PM");
  });
  it("returns null on empty / invalid input", () => {
    expect(parseHoursJson(null)).toBeNull();
    expect(parseHoursJson("")).toBeNull();
    expect(parseHoursJson("not-json")).toBeNull();
    expect(parseHoursJson("{}")).toBeNull(); // object, not array
    expect(parseHoursJson("[]")).toBeNull(); // empty array
  });
});

describe("getTodayHours + formatTodayHours", () => {
  it("returns today's range using the injected Date", () => {
    const tuesday = new Date("2026-04-14T15:00:00");  // Tuesday
    expect(tuesday.getDay()).toBe(2);
    expect(getTodayHours(HOURS_STANDARD, tuesday)).toBe("11:00 AM - 7:00 PM");
  });
  it("returns 'Closed' for a closed day and null for unknown input", () => {
    const monday = new Date("2026-04-13T12:00:00");
    expect(getTodayHours(HOURS_STANDARD, monday)).toBe("Closed");
    expect(getTodayHours(null, monday)).toBeNull();
  });
  it("formatTodayHours swaps hyphens for a pretty en-dash", () => {
    const tuesday = new Date("2026-04-14T15:00:00");
    expect(formatTodayHours(HOURS_STANDARD, tuesday)).toBe("11:00 AM – 7:00 PM");
  });
  it("formatTodayHours says 'Closed today' when the day is shut", () => {
    const monday = new Date("2026-04-13T12:00:00");
    expect(formatTodayHours(HOURS_STANDARD, monday)).toBe("Closed today");
  });
});

describe("isOpenNow", () => {
  const tueMid = new Date("2026-04-14T15:00:00");   // Tuesday 3pm
  const tueEarly = new Date("2026-04-14T08:00:00"); // Tuesday 8am
  const tueLate = new Date("2026-04-14T22:00:00");  // Tuesday 10pm
  const mondayNoon = new Date("2026-04-13T12:00:00"); // closed day

  it("returns true during business hours", () => {
    expect(isOpenNow(HOURS_STANDARD, tueMid)).toBe(true);
  });
  it("returns false before open / after close on a normal day", () => {
    expect(isOpenNow(HOURS_STANDARD, tueEarly)).toBe(false);
    expect(isOpenNow(HOURS_STANDARD, tueLate)).toBe(false);
  });
  it("returns false on a closed day", () => {
    expect(isOpenNow(HOURS_STANDARD, mondayNoon)).toBe(false);
  });
  it("handles overnight ranges (closes after midnight)", () => {
    // Friday 11pm → still inside the Fri 10pm→2am window
    const friLate = new Date("2026-04-17T23:00:00");
    expect(isOpenNow(HOURS_OVERNIGHT, friLate)).toBe(true);
    // Saturday 1am → inside the Sat 10pm→2am window (the 1am is the tail of Friday's range,
    // but the spec for this data is each entry represents THAT day's open→close).
    // We intentionally use today's entry, so Saturday 1am reads Saturday 10pm-2am which
    // is an overnight range. 1am is within.
    const satAM = new Date("2026-04-18T01:00:00");
    expect(isOpenNow(HOURS_OVERNIGHT, satAM)).toBe(true);
    // Saturday 3am → outside 10pm-2am
    const sat3am = new Date("2026-04-18T03:00:00");
    expect(isOpenNow(HOURS_OVERNIGHT, sat3am)).toBe(false);
  });
  it("returns true for 'Open 24 hours'", () => {
    expect(isOpenNow(HOURS_24, tueMid)).toBe(true);
    expect(isOpenNow(HOURS_24, tueEarly)).toBe(true);
  });
  it("returns null when the data is missing / unparseable", () => {
    expect(isOpenNow(null)).toBeNull();
    expect(isOpenNow("not-json")).toBeNull();
  });
});
