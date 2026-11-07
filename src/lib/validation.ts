const PERSON_NAME_PATTERN = /^[\p{L}\p{M}]+$/u;

export function isValidPersonName(value: string) {
  return PERSON_NAME_PATTERN.test(value);
}

export function isValidContactName(value: string) {
  return isValidPersonName(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value);
}

export function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isNotFutureDate(value: string) {
  return isValidIsoDate(value) && value <= todayIso();
}

export function isValidLanguageTestDates(testDate: string, expiryDate?: string) {
  if (!isNotFutureDate(testDate)) return false;
  return !expiryDate || (isValidIsoDate(expiryDate) && expiryDate >= testDate);
}

export function isValidDueDate(value: string) {
  return isValidIsoDate(value) && value >= todayIso();
}

function steppedScores(min: number, max: number, step: number) {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, index) => {
    const value = min + index * step;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  });
}

export function languageScoreOptions(testType: string, testDate: string) {
  switch (testType) {
    case "IELTS":
      return steppedScores(0, 9, 0.5);
    case "TOEFL iBT":
      if (!testDate) return [];
      return testDate >= "2026-01-21" ? steppedScores(1, 6, 0.5) : steppedScores(0, 120, 1);
    case "Duolingo English Test":
      return steppedScores(10, 160, 5);
    case "CELPIP":
      return steppedScores(1, 12, 1);
    case "PTE Academic":
      return steppedScores(10, 90, 1);
    default:
      return [];
  }
}

export function isValidLanguageScore(testType: string, score: string, testDate: string) {
  return languageScoreOptions(testType, testDate).includes(score);
}
