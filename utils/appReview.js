/**
 * In-app review prompt: show native "rate the app" at milestones (5, 10, 15 unique days with a save).
 * Cap at 3 prompt attempts per install. Uses expo-store-review (iOS/Android).
 */
import * as StoreReview from 'expo-store-review';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storage';

const DAYS_MILESTONE = 5;       // prompt at 5th, 10th, 15th unique day
const MAX_PROMPT_ATTEMPTS = 3;

/**
 * Normalize a Date or date string to "YYYY-MM-DD" for storage.
 * @param {Date|string} date - Date object or toDateString() result (e.g. "Mon Jan 15 2026")
 * @returns {string} "YYYY-MM-DD"
 */
function toDateKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Call after a successful entry save for the given date.
 * Counts unique calendar days; at 5th, 10th, 15th day (and attempts < 3) requests the native review.
 * Same day never counts twice. Safe to call from every save path.
 * @param {Date|string} date - The calendar date of the entry that was just saved
 */
export async function maybePromptReview(date) {
  const dateKey = toDateKey(date);
  try {
    const countedJson = await getStorageItem(STORAGE_KEYS.REVIEW_COUNTED_DATES, '[]');
    let counted = [];
    try {
      counted = JSON.parse(countedJson);
    } catch {
      counted = [];
    }
    if (!Array.isArray(counted)) counted = [];

    if (counted.includes(dateKey)) return;
    counted.push(dateKey);
    counted.sort();
    await setStorageItem(STORAGE_KEYS.REVIEW_COUNTED_DATES, JSON.stringify(counted));

    const attempts = parseInt(await getStorageItem(STORAGE_KEYS.REVIEW_PROMPT_ATTEMPTS, '0'), 10) || 0;
    if (attempts >= MAX_PROMPT_ATTEMPTS) return;

    const nextMilestone = DAYS_MILESTONE * (attempts + 1);
    if (counted.length < nextMilestone) return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    await StoreReview.requestReview();
    await setStorageItem(STORAGE_KEYS.REVIEW_PROMPT_ATTEMPTS, String(attempts + 1));
  } catch (e) {
    console.warn('App review prompt:', e?.message || e);
  }
}
