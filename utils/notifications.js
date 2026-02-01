import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from './storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B9D',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

const DEFAULT_MESSAGE = { title: 'SugarLog', body: 'Take a moment to log your sugar intake for today' };

/** Schedule one daily repeating notification at the given time (HH:MM). */
const scheduleOne = async (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      ...DEFAULT_MESSAGE,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: { hour: hours, minute: minutes, repeats: true },
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

/** @deprecated Use scheduleDailyNotifications. Kept for compatibility. */
export const scheduleDailyNotification = async (timeString) => {
  await scheduleDailyNotifications(timeString ? [timeString] : []);
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const initializeNotifications = async () => {
  const enabled = await getStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'false');
  if (enabled !== 'true') return;

  let timesJson = await getStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, '');
  if (!timesJson) {
    const legacy = await getStorageItem(STORAGE_KEYS.NOTIFICATION_TIME, '');
    const arr = legacy ? [legacy] : ['20:00'];
    timesJson = JSON.stringify(arr);
    await setStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, timesJson);
  }

  let times = [];
  try {
    times = JSON.parse(timesJson);
  } catch {
    times = ['20:00'];
  }
  if (!Array.isArray(times) || times.length === 0) times = ['20:00'];

  const hasPermission = await requestPermissions();
  if (hasPermission) await scheduleDailyNotifications(times);
};
