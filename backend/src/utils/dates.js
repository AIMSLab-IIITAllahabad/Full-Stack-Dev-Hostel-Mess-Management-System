// Day-granular date helpers.
// CONVENTION: any "calendar date" (rebate date, attendance date,
// subscription start/end) is stored as UTC MIDNIGHT of that day.
// This makes the stored day identical no matter the server's or
// phone's timezone.

// UTC midnight of the calendar day the given input refers to.
// Accepts "2026-07-17" or full ISO strings.
const normalizeDateUTC = (input) => {
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

// UTC midnight of TODAY according to the server's local calendar.
// (Server runs in India, so "today" means today in IST.)
const todayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

// UTC midnight N days after today.
const daysFromTodayUTC = (n) => {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

module.exports = { normalizeDateUTC, todayUTC, daysFromTodayUTC };