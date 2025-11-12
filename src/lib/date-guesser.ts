
"use strict";

// This code was provided by the user to implement a "best-guess" date format detection.

type ParsedDate = {
  original: string;
  date: Date;
};

export type GuessResult = {
  format: string | null;
  score: number;
  parsed: ParsedDate[];
};

const CANDIDATE_FORMATS = [
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy",
  "MM/dd/yyyy HH:mm:ss",
  "MM/dd/yyyy HH:mm",
  "MM/dd/yyyy",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "yyyy-MM-dd",
  "dd-MM-yyyy HH:mm:ss",
  "dd-MM-yyyy HH:mm",
  "dd-MM-yyyy",
  "dd.MM.yyyy HH:mm:ss",
  "dd.MM.yyyy",
  "yyyy/MM/dd HH:mm:ss",
  "yyyy/MM/dd",
  "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  "yyyy-MM-dd'T'HH:mm:ss'Z'",
  "yyyy-MM-dd'T'HH:mm:ss", // ISO without timezone
];

function tryParseWithFormat(value: string, format: string): Date | null {
  let regexStr = "^";
  const groups: { token: string; index: number }[] = [];

  for (let i = 0; i < format.length; ) {
    if (format[i] === "'") {
      let j = i + 1;
      let literal = "";
      while (j < format.length && format[j] !== "'") {
        literal += format[j];
        j++;
      }
      regexStr += literal.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      i = j + 1;
      continue;
    }

    const fourChar = format.slice(i, i + 4);
    const threeChar = format.slice(i, i + 3);
    const twoChar = format.slice(i, i + 2);

    if (fourChar === "yyyy") {
      regexStr += "(\\d{4})";
      groups.push({ token: "yyyy", index: groups.length + 1 });
      i += 4;
    } else if (threeChar === "SSS") {
      // milliseconds 1–3 digits to be tolerant
      regexStr += "(\\d{1,3})";
      groups.push({ token: "SSS", index: groups.length + 1 });
      i += 3;
    } else if (twoChar === "dd") {
      regexStr += "(\\d{1,2})";
      groups.push({ token: "dd", index: groups.length + 1 });
      i += 2;
    } else if (twoChar === "MM") {
      regexStr += "(\\d{1,2})";
      groups.push({ token: "MM", index: groups.length + 1 });
      i += 2;
    } else if (twoChar === "HH") {
      regexStr += "(\\d{1,2})";
      groups.push({ token: "HH", index: groups.length + 1 });
      i += 2;
    } else if (twoChar === "mm") {
      regexStr += "(\\d{1,2})";
      groups.push({ token: "mm", index: groups.length + 1 });
      i += 2;
    } else if (twoChar === "ss") {
      regexStr += "(\\d{1,2})";
      groups.push({ token: "ss", index: groups.length + 1 });
      i += 2;
    } else if (twoChar === "yy") {
      regexStr += "(\\d{2})";
      groups.push({ token: "yy", index: groups.length + 1 });
      i += 2;
    } else {
      regexStr += format[i].replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      i += 1;
    }
  }

  regexStr += "$";

  const re = new RegExp(regexStr);
  const match = re.exec(value.trim());
  if (!match) return null;

  let day = 1,
    month = 1,
    year = 1970,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0;

  for (const g of groups) {
    const strVal = match[g.index];
    const numVal = parseInt(strVal, 10);
    switch (g.token) {
      case "dd":
        day = numVal;
        break;
      case "MM":
        month = numVal;
        break;
      case "yyyy":
        year = numVal;
        break;
      case "yy":
        year = numVal >= 70 ? 1900 + numVal : 2000 + numVal;
        break;
      case "HH":
        hour = numVal;
        break;
      case "mm":
        minute = numVal;
        break;
      case "ss":
        second = numVal;
        break;
      case "SSS":
        ms = numVal;
        break;
    }
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  if (second < 0 || second > 59) return null;

  const isUTC = /'Z'$/.test(format);

  let d: Date;
  if (isUTC) {
    d = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  } else {
    d = new Date(year, month - 1, day, hour, minute, second, ms);
  }

  // Check if the constructed date is valid (e.g. not Feb 30)
  const checkDay = isUTC ? d.getUTCDate() : d.getDate();
  const checkMonth = isUTC ? d.getUTCMonth() + 1 : d.getMonth() + 1;
  const checkYear = isUTC ? d.getUTCFullYear() : d.getFullYear();

  // Handle yy case where year can be 2-digits
  const expectedYear = g => g.token === 'yy' ? year : (g.token === 'yyyy' ? year : (isUTC ? d.getUTCFullYear() : d.getFullYear()));

  if(checkDay !== day || checkMonth !== month || checkYear % 100 !== year % 100) {
      if (checkYear !== year && groups.some(expectedYear)) return null
  }
  
  return d;
}

function scoreFormat(samples: string[], format: string): GuessResult {
  const parsed: ParsedDate[] = [];
  let score = 0;

  for (const s of samples) {
    if(!s) continue;
    const dt = tryParseWithFormat(s, format);
    if (dt) {
      const y = dt.getUTCFullYear();
      if (y >= 1990 && y <= new Date().getFullYear() + 5) {
        score++;
        parsed.push({ original: s, date: dt });
      }
    }
  }

  return { format, score, parsed };
}

export function guessDateFormat(samples: string[]): GuessResult {
  let best: GuessResult = { format: null, score: -1, parsed: [] };

  for (const fmt of CANDIDATE_FORMATS) {
    const res = scoreFormat(samples, fmt);
    if (res.score > best.score) {
      best = res;
    }
  }

  if (best.score <= 0) {
    return { format: null, score: 0, parsed: [] };
  }

  return best;
}
