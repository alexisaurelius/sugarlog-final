import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storage';
import { DEFAULTS } from '../app.config';

let notificationHandlerSet = false;
function ensureNotificationHandler() {
  if (notificationHandlerSet) return;
  notificationHandlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const requestPermissions = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
      });
    }

    ensureNotificationHandler();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Notification requestPermissions error:', e?.message || e);
    return false;
  }
};

const DEFAULT_MESSAGE = { title: 'SugarLog', body: 'Take a moment to log your sugar intake for today' };

/** Schedule one daily notification at the given time (HH:MM). Uses expo daily trigger type. */
const scheduleOne = async (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const trigger = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: hours,
    minute: minutes,
  };
  if (Platform.OS === 'android') {
    trigger.channelId = 'default';
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      ...DEFAULT_MESSAGE,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
};

/** Schedule daily notifications at each given time (HH:MM). Replaces all existing. */
export const scheduleDailyNotifications = async (timeStrings) => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const times = Array.isArray(timeStrings) ? timeStrings : [];
    for (const t of times) {
      if (t && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(t).trim())) {
        await scheduleOne(String(t).trim());
      }
    }
  } catch (error) {
    console.error('Error scheduling notifications:', error);
  }
};

/** Schedule a one-time preview notification in 15 seconds. Use after reminder setup so the user sees notifications work. */
export const schedulePreviewNotification = async () => {
  try {
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15,
      repeats: false,
    };
    if (Platform.OS === 'android') trigger.channelId = 'default';
    await Notifications.scheduleNotificationAsync({
      content: {
        ...DEFAULT_MESSAGE,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });
  } catch (e) {
    console.warn('Preview notification schedule failed:', e?.message || e);
  }
};

/** @deprecated Use scheduleDailyNotifications. Kept for compatibility. */
export const scheduleDailyNotification = async (timeString) => {
  await scheduleDailyNotifications(timeString ? [timeString] : []);
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const initializeNotifications = async () => {
  ensureNotificationHandler();
  const enabled = await getStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'false');
  if (enabled !== 'true') return;

  let timesJson = await getStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, '');
  if (!timesJson) {
    const legacy = await getStorageItem(STORAGE_KEYS.NOTIFICATION_TIME, '');
    const arr = legacy ? [legacy] : [DEFAULTS.defaultNotificationTime];
    timesJson = JSON.stringify(arr);
    await setStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, timesJson);
  }

  let times = [];
  try {
    times = JSON.parse(timesJson);
  } catch {
    times = [DEFAULTS.defaultNotificationTime];
  }
  if (!Array.isArray(times) || times.length === 0) times = [DEFAULTS.defaultNotificationTime];

  const hasPermission = await requestPermissions();
  if (hasPermission) await scheduleDailyNotifications(times);
};
