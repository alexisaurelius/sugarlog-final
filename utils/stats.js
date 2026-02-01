import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from './storage';

export const updateStreakAndSuccess = async (todayIntake, dailyGoal) => {
  try {
    const today = new Date().toDateString();
    const lastDate = await getStorageItem(STORAGE_KEYS.LAST_DATE);
    const currentStreak = parseInt(await getStorageItem(STORAGE_KEYS.STREAK, '0'));
    const successDays = parseInt(await getStorageItem(STORAGE_KEYS.SUCCESS_DAYS, '0'));

    if (lastDate !== today) {
      // New day - check yesterday's success
      if (lastDate) {
        const yesterdayIntake = parseFloat(await getStorageItem(`intake_${lastDate}`, '0'));
        const yesterdayGoal = parseFloat(await getStorageItem(STORAGE_KEYS.DAILY_GOAL, '10'));

        if (yesterdayIntake <= yesterdayGoal) {
          // Yesterday was successful - continue streak
          const newStreak = currentStreak + 1;
          await setStorageItem(STORAGE_KEYS.STREAK, newStreak.toString());
          await setStorageItem(STORAGE_KEYS.SUCCESS_DAYS, (successDays + 1).toString());
        } else {
          // Yesterday failed - reset streak
          await setStorageItem(STORAGE_KEYS.STREAK, '0');
        }
      }

      // Update today's date
      await setStorageItem(STORAGE_KEYS.LAST_DATE, today);
      
      // Check if today is successful and update streak
      if (todayIntake <= dailyGoal) {
        const newStreak = parseInt(await getStorageItem(STORAGE_KEYS.STREAK, '0')) + 1;
        await setStorageItem(STORAGE_KEYS.STREAK, newStreak.toString());
        const updatedSuccessDays = parseInt(await getStorageItem(STORAGE_KEYS.SUCCESS_DAYS, '0'));
        // Only increment if we haven't already counted today
        if (lastDate !== today) {
          await setStorageItem(STORAGE_KEYS.SUCCESS_DAYS, (updatedSuccessDays + 1).toString());
        }
      } else {
        // Today failed - reset streak
        await setStorageItem(STORAGE_KEYS.STREAK, '0');
      }
    } else {
      // Same day - recalculate streak based on current intake
      if (todayIntake <= dailyGoal) {
        // Today is successful - check if we need to update streak
        // If streak was 0, start a new one
        if (currentStreak === 0) {
          await setStorageItem(STORAGE_KEYS.STREAK, '1');
          // Check if we already counted this success day
          const currentSuccessDays = parseInt(await getStorageItem(STORAGE_KEYS.SUCCESS_DAYS, '0'));
          // Only add if this is the first time today is successful
          const todaySuccessKey = `success_${today}`;
          const alreadyCounted = await getStorageItem(todaySuccessKey, 'false');
          if (alreadyCounted === 'false') {
            await setStorageItem(STORAGE_KEYS.SUCCESS_DAYS, (currentSuccessDays + 1).toString());
            await setStorageItem(todaySuccessKey, 'true');
          }
        }
      } else {
        // Today failed - reset streak
        await setStorageItem(STORAGE_KEYS.STREAK, '0');
      }
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }
};

const FREEZES_PER_MONTH = 2;

function monthKeyFromDateString(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function freezesUsedInMonth(freezeDates, dateStr) {
  const mk = monthKeyFromDateString(dateStr);
  return freezeDates.filter((d) => monthKeyFromDateString(d) === mk).length;
}

export const getStreak = async () => {
  try {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    const dailyGoal = parseFloat(await getStorageItem(STORAGE_KEYS.DAILY_GOAL, '10'));
    let foundFirstSuccess = false;

    let freezeDates = [];
    try {
      const raw = await getStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, '[]');
      freezeDates = JSON.parse(raw || '[]');
      if (!Array.isArray(freezeDates)) freezeDates = [];
    } catch {
      freezeDates = [];
    }

    for (let i = 0; i < 1000; i++) {
      const dateKey = currentDate.toDateString();
      let intake = await getStorageItem(`intake_${dateKey}`, null);
      const entriesKey = `entries_${dateKey}`;
      const entriesJson = await getStorageItem(entriesKey, '[]');
      const entries = JSON.parse(entriesJson);
      const hasEntries = entries.length > 0;

      if (intake === null && hasEntries) {
        intake = entries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0).toString();
      }

      if (intake !== null || hasEntries) {
        const intakeValue = parseFloat(intake || '0');
        if (intakeValue <= dailyGoal) {
          streak++;
          foundFirstSuccess = true;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          if (foundFirstSuccess) break;
          currentDate.setDate(currentDate.getDate() - 1);
        }
      } else {
        if (!foundFirstSuccess) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        if (freezeDates.includes(dateKey)) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error getting streak:', error);
    return 0;
  }
};

/** Returns { used, limit } for the given month (default current). */
export const getFreezeUsageForMonth = async (year, month) => {
  try {
    const raw = await getStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, '[]');
    let freezeDates = [];
    try {
      freezeDates = JSON.parse(raw || '[]');
      if (!Array.isArray(freezeDates)) freezeDates = [];
    } catch {
      freezeDates = [];
    }
    const y = year ?? new Date().getFullYear();
    const m = month ?? new Date().getMonth();
    const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
    const used = freezeDates.filter((d) => monthKeyFromDateString(d) === mk).length;
    return { used, limit: FREEZES_PER_MONTH };
  } catch (error) {
    console.error('Error getting freeze usage:', error);
    return { used: 0, limit: FREEZES_PER_MONTH };
  }
};

/** Returns { isFrozen, canUseFreeze, used, limit } for the given date. */
export const getFreezeStatusForDate = async (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const dateKey = d.toDateString();
  const { used, limit } = await getFreezeUsageForMonth(d.getFullYear(), d.getMonth());
  const raw = await getStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, '[]');
  let freezeDates = [];
  try {
    freezeDates = JSON.parse(raw || '[]');
    if (!Array.isArray(freezeDates)) freezeDates = [];
  } catch {
    freezeDates = [];
  }
  const isFrozen = freezeDates.includes(dateKey);
  const canUseFreeze = !isFrozen && used < limit;
  return { isFrozen, canUseFreeze, used, limit };
};

/** Manually use a freeze for the given date (toDateString). Returns { ok, error? }. */
export const useFreezeForDate = async (dateStr) => {
  try {
    const raw = await getStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, '[]');
    let freezeDates = [];
    try {
      freezeDates = JSON.parse(raw || '[]');
      if (!Array.isArray(freezeDates)) freezeDates = [];
    } catch {
      freezeDates = [];
    }
    if (freezeDates.includes(dateStr)) {
      return { ok: false, error: 'already_frozen' };
    }
    const used = freezesUsedInMonth(freezeDates, dateStr);
    if (used >= FREEZES_PER_MONTH) {
      return { ok: false, error: 'limit_reached' };
    }
    freezeDates = [...freezeDates, dateStr];
    await setStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, JSON.stringify(freezeDates));
    return { ok: true };
  } catch (error) {
    console.error('Error using freeze:', error);
    return { ok: false, error: 'unknown' };
  }
};

/** Release (refund) a freeze for the given date when user adds data to that day. Call after saving intake/entries. */
export const releaseFreezeForDate = async (dateKey) => {
  try {
    const raw = await getStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, '[]');
    let freezeDates = [];
    try {
      freezeDates = JSON.parse(raw || '[]');
      if (!Array.isArray(freezeDates)) freezeDates = [];
    } catch {
      freezeDates = [];
    }
    if (!freezeDates.includes(dateKey)) return;
    freezeDates = freezeDates.filter((d) => d !== dateKey);
    await setStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, JSON.stringify(freezeDates));
  } catch (error) {
    console.error('Error releasing freeze for date:', error);
  }
};

/** Returns all-time count of days under limit, computed from actual intake/entries data (matches calendar). */
export const getSuccessDays = async () => {
  try {
    const dailyGoal = parseFloat(await getStorageItem(STORAGE_KEYS.DAILY_GOAL, '10'));
    const allKeys = await AsyncStorage.getAllKeys();
    const dateKeys = new Set();
    allKeys.forEach((k) => {
      if (k.startsWith('intake_')) dateKeys.add(k.replace('intake_', ''));
      if (k.startsWith('entries_')) dateKeys.add(k.replace('entries_', ''));
    });
    let successCount = 0;
    for (const dateKey of dateKeys) {
      let intake = await getStorageItem(`intake_${dateKey}`, null);
      const entriesJson = await getStorageItem(`entries_${dateKey}`, '[]');
      const entries = JSON.parse(entriesJson || '[]');
      const hasEntries = Array.isArray(entries) && entries.length > 0;
      if (intake === null && hasEntries) {
        intake = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0).toString();
      }
      const intakeValue = parseFloat(intake || '0');
      // Count day if it has data and intake <= goal (same logic as calendar)
      if ((intake !== null || hasEntries) && intakeValue <= dailyGoal) {
        successCount++;
      }
    }
    return successCount;
  } catch (error) {
    console.error('Error getting success days:', error);
    return 0;
  }
};

/** Returns the set of dateKeys (toDateString()) that have at least one sugar entry. Used for free-tier day limit. */
export const getDaysWithEntriesSet = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const entryKeys = allKeys.filter(key => key.startsWith('entries_'));
    const dateSet = new Set();
    for (const key of entryKeys) {
      const json = await getStorageItem(key, '[]');
      let arr = [];
      try {
        arr = JSON.parse(json || '[]');
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      if (arr.length > 0) {
        const dateKey = key.replace('entries_', '');
        dateSet.add(dateKey);
      }
    }
    return dateSet;
  } catch (error) {
    console.error('Error getting days with entries:', error);
    return new Set();
  }
};

// Get total days tracked (regardless of success)
export const getTotalTrackingDays = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const intakeKeys = allKeys.filter(key => key.startsWith('intake_'));
    
    // Count days that have been tracked (have intake data, even if 0)
    let trackedDays = 0;
    for (const key of intakeKeys) {
      const intake = await getStorageItem(key, '0');
      // If there's an entry or intake > 0, it was tracked
      const dateKey = key.replace('intake_', '');
      const entriesKey = `entries_${dateKey}`;
      const entries = await getStorageItem(entriesKey, '[]');
      const hasEntries = JSON.parse(entries).length > 0;
      
      if (parseFloat(intake) > 0 || hasEntries) {
        trackedDays++;
      }
    }
    
    return trackedDays;
  } catch (error) {
    console.error('Error getting total tracking days:', error);
    return 0;
  }
};

// Get consecutive tracking days (tracking every day, regardless of success)
export const getTrackingStreak = async () => {
  try {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check backwards from today
    for (let i = 0; i < 1000; i++) { // Check up to 1000 days back
      const dateKey = currentDate.toDateString();
      const intake = await getStorageItem(`intake_${dateKey}`, null);
      const entriesKey = `entries_${dateKey}`;
      const entries = await getStorageItem(entriesKey, '[]');
      const hasEntries = JSON.parse(entries).length > 0;
      
      // If we have intake data or entries, this day was tracked
      if (intake !== null || hasEntries) {
        streak++;
        // Go to previous day
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // No data for this day, streak ends
        break;
      }
    }
    
    return streak;
  } catch (error) {
    console.error('Error getting tracking streak:', error);
    return 0;
  }
};
