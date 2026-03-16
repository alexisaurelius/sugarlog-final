import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  DAILY_GOAL: 'dailyGoal',
  TODAY_INTAKE: 'todayIntake',
  STREAK: 'streak',
  LAST_DATE: 'lastDate',
  TOTAL_DAYS: 'totalDays',
  UNIT_SYSTEM: 'unitSystem', // 'metric' or 'imperial'
  GOAL_SET: 'goalSet', // boolean - has user set initial goal
  ACHIEVEMENTS: 'achievements', // array of unlocked achievement IDs
  SUCCESS_DAYS: 'successDays', // total days under goal
  CURRENT_STREAK_START: 'currentStreakStart', // date when current streak started
  NOTIFICATION_ENABLED: 'notificationEnabled', // boolean
  NOTIFICATION_TIME: 'notificationTime', // legacy; single "HH:MM"
  NOTIFICATION_TIMES: 'notificationTimes', // JSON array of "HH:MM" strings
  STREAK_FREEZE_DATES: 'streakFreezeDates', // JSON array of date strings (e.g. "Mon Jan 20 2025") freezes used for
  CUSTOM_QUICK_ADD_ITEMS: 'customQuickAddItems', // JSON array of { id, name, sugarGrams }
  THEME: 'theme', // theme id: default | dark | yellowish | blueish | greenish
  ENTRY_HISTORY: 'entryHistory', // object with date keys and arrays of entries
  ONBOARDING_COMPLETED: 'onboardingCompleted', // boolean - has user completed onboarding
  REMINDER_SETUP_COMPLETED: 'reminderSetupCompleted', // boolean - has user completed reminder setup screen
  QUIT_REASONS_SCREEN_SEEN: 'quitReasonsScreenSeen', // boolean - user skipped or saved quit reasons
  ONBOARDING_NAME_COMPLETED: 'onboardingNameCompleted', // boolean - user completed last onboarding (name) screen
  QUIT_SUGAR_REASONS: 'quitSugarReasons', // JSON array of strings, max 3 - why user wants to reduce sugar
  WEEK_START_DAY: 'weekStartDay', // '0' for Sunday, '1' for Monday
  USER_NAME: 'userName', // display name for the user
  REVIEW_COUNTED_DATES: 'reviewCountedDates', // JSON array of "YYYY-MM-DD" that have contributed toward review prompt
  REVIEW_PROMPT_ATTEMPTS: 'reviewPromptAttempts', // number of times we've called requestReview (cap at 3)
};

export const getStorageItem = async (key, defaultValue = null) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return defaultValue;
  }
};

export const setStorageItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value.toString());
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
  }
};
