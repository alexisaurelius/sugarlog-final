import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedModal from '../../utils/AnimatedModal';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../../utils/storage';
import { UNIT_SYSTEMS, formatValue, getUnitLabel } from '../../utils/units';
import { requestPermissions, scheduleDailyNotifications, cancelAllNotifications } from '../../utils/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeContext } from '../../utils/ThemeContext';
import { getThemeList, THEME_IDS } from '../../utils/themes';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../contexts/LanguageContext';
import * as Linking from 'expo-linking';
import { isSubscribed, presentPaywall, getSubscriptionManagementURL, restorePurchases } from '../../utils/purchases';
import QuitReasonsScreen from '../quit-reasons';
import { DEFAULTS, LIMITS } from '../../app.config';

function dateFromTimeString(hhmm) {
  const match = (hhmm || DEFAULTS.defaultNotificationTime).match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  const h = match ? parseInt(match[1], 10) : 20;
  const m = match ? parseInt(match[2], 10) : 0;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function timeStringFromDate(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function SettingsScreen() {
  const { theme, themeId, setTheme } = useThemeContext();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, getLanguageName, supportedLanguages } = useLanguage();
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);
  const [dailyGoal, setDailyGoal] = useState(DEFAULTS.dailyGoalGrams);
  const [unitSystem, setUnitSystem] = useState(UNIT_SYSTEMS.METRIC);
  const [goalInput, setGoalInput] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationTimes, setNotificationTimes] = useState([DEFAULTS.defaultNotificationTime]);
  const [weekStartDay, setWeekStartDay] = useState(0); // 0 = Sunday, 1 = Monday
  const [editingTimeIndex, setEditingTimeIndex] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerValue, setTimePickerValue] = useState(() => new Date());
  const [showSugarInfoModal, setShowSugarInfoModal] = useState(false);
  const [goalSet, setGoalSet] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const sugarInfoScrollRef = React.useRef(null);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [isPremiumActive, setIsPremiumActive] = useState(false);
  const [showQuitReasonsModal, setShowQuitReasonsModal] = useState(false);
  const [quitReasonsList, setQuitReasonsList] = useState([]);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const goal = await getStorageItem(STORAGE_KEYS.DAILY_GOAL, String(DEFAULTS.dailyGoalGrams));
    const unit = await getStorageItem(STORAGE_KEYS.UNIT_SYSTEM, UNIT_SYSTEMS.METRIC);
    const notifEnabled = await getStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'false');
    let timesJson = await getStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, '');
    if (!timesJson) {
      const legacy = await getStorageItem(STORAGE_KEYS.NOTIFICATION_TIME, DEFAULTS.defaultNotificationTime);
      const arr = legacy ? [legacy] : [DEFAULTS.defaultNotificationTime];
      timesJson = JSON.stringify(arr);
      await setStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, timesJson);
    }
    let times = [DEFAULTS.defaultNotificationTime];
    try {
      const parsed = JSON.parse(timesJson);
      if (Array.isArray(parsed) && parsed.length > 0) times = parsed;
    } catch (_) {}
    const isGoalSet = await getStorageItem(STORAGE_KEYS.GOAL_SET, 'false');

    const weekStart = await getStorageItem(STORAGE_KEYS.WEEK_START_DAY, '0');
    setDailyGoal(parseFloat(goal));
    setUnitSystem(unit);
    setNotificationEnabled(notifEnabled === 'true');
    setNotificationTimes(times);
    setGoalSet(isGoalSet === 'true');
    setWeekStartDay(parseInt(weekStart, 10));

    const displayGoal = unit === UNIT_SYSTEMS.IMPERIAL
      ? parseFloat(goal) * 0.035274
      : parseFloat(goal);
    setGoalInput(displayGoal.toFixed(1));

    const subscribed = await isSubscribed(true);
    setIsPremiumActive(subscribed);

    const name = await getStorageItem(STORAGE_KEYS.USER_NAME, '');
    setUserName(name || '');

    const reasonsJson = await getStorageItem(STORAGE_KEYS.QUIT_SUGAR_REASONS, '[]');
    let reasons = [];
    try {
      reasons = JSON.parse(reasonsJson || '[]');
      if (!Array.isArray(reasons)) reasons = [];
    } catch (_) {}
    setQuitReasonsList(reasons);
  };

  const saveReminderTimes = async (nextTimes) => {
    const valid = nextTimes.filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(String(t).trim()));
    const times = (valid.length > 0 ? valid : [DEFAULTS.defaultNotificationTime]).slice().sort();
    setNotificationTimes(times);
    await setStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, JSON.stringify(times));
    if (notificationEnabled) await scheduleDailyNotifications(times);
  };

  const addReminder = async () => {
    if (notificationTimes.length >= LIMITS.maxReminders) return;
    const newIndex = notificationTimes.length;
    const defaultTime = '12:00';
    await saveReminderTimes([...notificationTimes, defaultTime]);
    setTimePickerValue(dateFromTimeString(defaultTime));
    setEditingTimeIndex(newIndex);
    setShowTimePicker(true);
  };

  const removeReminder = async (index) => {
    if (notificationTimes.length <= 1) return;
    const next = notificationTimes.filter((_, i) => i !== index);
    await saveReminderTimes(next);
  };

  const updateReminderTime = async (index, hhmm) => {
    const next = [...notificationTimes];
    next[index] = hhmm;
    await saveReminderTimes(next);
  };

  const handleUpdateGoal = async () => {
    const goalValue = parseFloat(goalInput);
    if (isNaN(goalValue) || goalValue < 0) {
      Alert.alert(t('track.invalidInput'), t('track.enterValidNumber'));
      return;
    }

    // Convert to grams for storage
    const goalInGrams = unitSystem === UNIT_SYSTEMS.IMPERIAL 
      ? goalValue * 28.3495 
      : goalValue;

    // Maximum allowed is 50 grams
    if (goalInGrams > LIMITS.maxDailyGoalGrams) {
      const maxInCurrentUnit = unitSystem === UNIT_SYSTEMS.IMPERIAL 
        ? LIMITS.maxDailyGoalGrams * 0.035274 
        : LIMITS.maxDailyGoalGrams;
      Alert.alert(
        t('track.maximumLimitExceeded'), 
        `${t('track.maxDailyGoal')} ${maxInCurrentUnit.toFixed(2)}${getUnitLabel(unitSystem, t)} ${t('track.maxDailyGoalDesc')}`
      );
      return;
    }

    await setStorageItem(STORAGE_KEYS.DAILY_GOAL, goalInGrams.toString());
    setDailyGoal(goalInGrams);
  };

  const handleUnitChange = async (newUnit) => {
    await setStorageItem(STORAGE_KEYS.UNIT_SYSTEM, newUnit);
    setUnitSystem(newUnit);
    
    // Update goal input display
    const displayGoal = newUnit === UNIT_SYSTEMS.IMPERIAL 
      ? dailyGoal * 0.035274 
      : dailyGoal;
    setGoalInput(displayGoal.toFixed(1));
  };

  const clearAllData = () => {
    Alert.alert(
      t('settings.clearAllData'),
      t('settings.clearAllDataConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              for (const key of allKeys) {
                if (key === STORAGE_KEYS.THEME) continue;
                if (
                  key.startsWith('intake_') ||
                  key.startsWith('entries_') ||
                  key.startsWith('success_') ||
                  Object.values(STORAGE_KEYS).includes(key)
                ) {
                  await AsyncStorage.removeItem(key);
                }
              }
              await cancelAllNotifications();
              await loadData();
              Alert.alert(t('common.success'), t('settings.allDataCleared'));
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert(t('common.error'), t('settings.failedToClear'));
            }
          },
        },
      ]
    );
  };

  const resetToInitialState = async () => {
    Alert.alert(
      t('settings.resetInitialState'),
      t('settings.resetInitialStateDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all keys
              const allKeys = await AsyncStorage.getAllKeys();
              
              // Remove all app-related keys (intake, entries, success tracking, achievements, streaks, etc.)
              for (const key of allKeys) {
                if (
                  key.startsWith('intake_') ||
                  key.startsWith('entries_') ||
                  key.startsWith('success_') ||
                  Object.values(STORAGE_KEYS).includes(key)
                ) {
                  await AsyncStorage.removeItem(key);
                }
              }
              
              // Explicitly remove GOAL_SET to return to initial state
              await AsyncStorage.removeItem(STORAGE_KEYS.GOAL_SET);
              
              // Reload data to reflect changes
              await loadData();
              Alert.alert(t('common.success'), t('settings.resetSuccess'));
            } catch (error) {
              console.error('Error resetting app:', error);
              Alert.alert(t('common.error'), t('settings.resetFailed'));
            }
          },
        },
      ]
    );
  };

  const handleSendFeedback = async () => {
    const email = 'contact@apps-that-care.com';
    const subject = encodeURIComponent('SugarLog Feedback');
    const mailtoUrl = `mailto:${email}?subject=${subject}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(t('common.error'), t('settings.emailNotAvailable'));
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert(t('common.error'), t('settings.emailNotAvailable'));
    }
  };

  const APP_STORE_REVIEW_URL = 'https://apps.apple.com/app/sugarlog-quit-sugar/id6758400714?action=write-review';

  const handleReviewApp = async () => {
    try {
      const can = await Linking.canOpenURL(APP_STORE_REVIEW_URL);
      if (can) await Linking.openURL(APP_STORE_REVIEW_URL);
      else Alert.alert(t('common.error'), t('settings.copyFailed'));
    } catch (e) {
      console.warn('Open review URL:', e?.message || e);
      Alert.alert(t('common.error'), t('settings.copyFailed'));
    }
  };

  const resetOnboarding = async () => {
    Alert.alert(
      t('settings.resetOnboarding'),
      t('settings.resetOnboardingDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'),
          style: 'default',
          onPress: async () => {
            try {
              await setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'false');
              await setStorageItem(STORAGE_KEYS.REMINDER_SETUP_COMPLETED, 'false');
              await setStorageItem(STORAGE_KEYS.GOAL_SET, 'false');
              await setStorageItem(STORAGE_KEYS.QUIT_REASONS_SCREEN_SEEN, 'false');
              await setStorageItem(STORAGE_KEYS.ONBOARDING_NAME_COMPLETED, 'false');
              await setStorageItem(STORAGE_KEYS.ONBOARDING_PREMIUM_COMPLETED, 'false');
              await setStorageItem(STORAGE_KEYS.ONBOARDING_FLOW_VERSION, '2');
              Alert.alert(
                t('common.success'),
                t('settings.resetOnboardingSuccess') || 'Onboarding will be shown on next app restart',
                [
                  {
                    text: t('common.ok'),
                    onPress: () => {
                      // Optionally restart the app or show onboarding immediately
                      // For now, just show success message
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert(t('common.error'), t('settings.resetFailed'));
            }
          },
        },
      ]
    );
  };

  const displayGoal = unitSystem === UNIT_SYSTEMS.IMPERIAL 
    ? dailyGoal * 0.035274 
    : dailyGoal;

  const insets = useSafeAreaInsets();

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const c = theme.colors;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={c.gradient}
        style={[styles.fixedHeader, { paddingTop: insets.top + 5, height: insets.top + 95 }]}
      >
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
      </LinearGradient>

      <ScrollView 
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: insets.top + 95,
            paddingBottom: Math.max(insets.bottom, 20) + 80, // Tab bar height + safe area
          }
        ]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
        {/* Name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.name')}</Text>
          <TextInput
            style={[styles.input, styles.nameInput, { borderColor: c.border, color: c.text }]}
            placeholder={t('settings.yourNamePlaceholder')}
            placeholderTextColor={c.textMuted}
            value={userName}
            onChangeText={setUserName}
            onBlur={async () => {
              const trimmed = (userName || '').trim();
              setUserName(trimmed);
              await setStorageItem(STORAGE_KEYS.USER_NAME, trimmed);
            }}
            maxLength={50}
            autoCapitalize="words"
          />
        </View>

        {/* Subscription */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.subscription')}</Text>
          <Text style={styles.cardSubtitle}>
            {isPremiumActive
              ? t('settings.manageSubscriptionDesc')
              : t('settings.upgradeSubscriptionDesc')}
          </Text>
          <View style={styles.unitButtons}>
            <TouchableOpacity 
              style={[
                styles.unitButton,
                isPremiumActive && styles.unitButtonActive
              ]} 
              onPress={async () => {
                if (isPremiumActive) {
                  const url = await getSubscriptionManagementURL()
                    ?? (Platform.OS === 'ios'
                      ? 'https://apps.apple.com/account/subscriptions'
                      : 'https://play.google.com/store/account/subscriptions');
                  try {
                    const can = await Linking.canOpenURL(url);
                    if (can) await Linking.openURL(url);
                  } catch (e) {
                    console.warn('Open subscription settings:', e?.message || e);
                  }
                } else {
                  const purchased = await presentPaywall();
                  if (purchased) {
                    const subscribed = await isSubscribed();
                    setIsPremiumActive(subscribed);
                  }
                }
              }}
            >
              <Ionicons 
                name="card-outline" 
                size={24} 
                color={c.primary} 
              />
              <Text style={[
                styles.unitButtonText,
                isPremiumActive && styles.unitButtonTextActive
              ]}>
                {isPremiumActive ? t('settings.manageSubscription') : t('settings.upgradeToPremium')}
              </Text>
            </TouchableOpacity>
          </View>
          {isPremiumActive && (
            <Text style={[styles.cardSubtitle, { marginTop: 8 }]}>
              {t('settings.tapToManageSubscription')}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.unitButton, { marginTop: 12 }]}
            onPress={async () => {
              const { restored } = await restorePurchases();
              setIsPremiumActive(await isSubscribed(true));
              Alert.alert(
                t('settings.restorePurchases'),
                restored ? t('settings.restorePurchasesSuccess') : t('settings.restorePurchasesNone'),
                [{ text: t('common.ok') }]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={24} color={c.primary} />
            <Text style={styles.unitButtonText}>{t('settings.restorePurchases')}</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Goal */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>{t('settings.dailyGoal')}</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowSugarInfoModal(true)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubtitle}>
            {t('settings.current')} {displayGoal.toFixed(1)}{getUnitLabel(unitSystem, t)}
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={`${t('settings.enterNewGoal')} ${getUnitLabel(unitSystem, t)}`}
              placeholderTextColor={c.placeholder}
              keyboardType="decimal-pad"
              value={goalInput}
              onChangeText={setGoalInput}
            />
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateGoal}
            >
              <Text style={styles.updateButtonText}>{t('common.update')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unit System */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.unitSystem')}</Text>
          <Text style={styles.cardSubtitle}>
            {t('settings.chooseMeasurement')}
          </Text>
          <View style={styles.unitButtons}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unitSystem === UNIT_SYSTEMS.METRIC && styles.unitButtonActive,
              ]}
              onPress={() => handleUnitChange(UNIT_SYSTEMS.METRIC)}
            >
              <Ionicons
                name={unitSystem === UNIT_SYSTEMS.METRIC ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={unitSystem === UNIT_SYSTEMS.METRIC ? c.primary : c.textMuted}
              />
              <Text
                style={[
                  styles.unitButtonText,
                  unitSystem === UNIT_SYSTEMS.METRIC && styles.unitButtonTextActive,
                ]}
              >
                {t('settings.metric')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                unitSystem === UNIT_SYSTEMS.IMPERIAL && styles.unitButtonActive,
              ]}
              onPress={() => handleUnitChange(UNIT_SYSTEMS.IMPERIAL)}
            >
              <Ionicons
                name={unitSystem === UNIT_SYSTEMS.IMPERIAL ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={unitSystem === UNIT_SYSTEMS.IMPERIAL ? c.primary : c.textMuted}
              />
              <Text
                style={[
                  styles.unitButtonText,
                  unitSystem === UNIT_SYSTEMS.IMPERIAL && styles.unitButtonTextActive,
                ]}
              >
                {t('settings.imperial')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quit sugar reasons */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.quitReasonsTitle')}</Text>
          <Text style={styles.cardSubtitle}>
            {t('settings.quitReasonsDesc')}
          </Text>
          <TouchableOpacity
            style={[styles.unitButton, { marginTop: 12 }]}
            onPress={() => setShowQuitReasonsModal(true)}
          >
            <Ionicons name="create-outline" size={22} color={c.primary} />
            <Text style={[styles.unitButtonText, { color: c.primary, marginLeft: 8 }]}>
              {t('settings.editReasons')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.language')}</Text>
          <TouchableOpacity
            style={[styles.unitButton, styles.languageRow, { marginTop: 12 }]}
            onPress={() => setShowLanguageModal(true)}
          >
            <Text style={[styles.unitButtonText, { color: c.text, marginLeft: 0 }]}>
              {getLanguageName(currentLanguage)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Theme */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.theme')}</Text>
          <Text style={styles.cardSubtitle}>{t('settings.chooseAppearance')}</Text>
          <View style={styles.themeButtons}>
            {getThemeList().map((theme) => {
              // Map theme IDs to translation keys
              const themeKeyMap = {
                'default': 'default',
                'dark': 'dark',
                'yellowish': 'yellow',
                'blueish': 'blue',
                'greenish': 'green',
                'purple': 'purple',
              };
              const translationKey = themeKeyMap[theme.id] || theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeButton,
                    { backgroundColor: themeId === theme.id ? c.primarySoft : c.background, borderColor: themeId === theme.id ? c.primary : c.border },
                  ]}
                  onPress={() => setTheme(theme.id)}
                >
                  <View style={[styles.themeSwatch, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[styles.themeButtonText, { color: themeId === theme.id ? c.primary : c.textSecondary }]}>
                    {t(`themes.${translationKey}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Week Start Day */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Ionicons name="calendar-outline" size={24} color={c.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>{t('settings.weekStartDay')}</Text>
          </View>
          
          <View style={styles.notificationToggle}>
            <Text style={styles.toggleLabel}>
              {weekStartDay === 0 ? t('settings.weekStartsSunday') : t('settings.weekStartsMonday')}
            </Text>
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                weekStartDay === 1 && styles.toggleSwitchActive,
              ]}
              onPress={async () => {
                const newValue = weekStartDay === 0 ? 1 : 0;
                setWeekStartDay(newValue);
                await setStorageItem(STORAGE_KEYS.WEEK_START_DAY, newValue.toString());
              }}
            >
              <View
                style={[
                  styles.toggleThumb,
                  weekStartDay === 1 && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.dailyReminders')}</Text>
          <Text style={styles.cardSubtitle}>
            {t('settings.remindersDesc')}
          </Text>
          
          <View style={styles.notificationToggle}>
            <Text style={styles.toggleLabel}>{t('settings.enableNotifications')}</Text>
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                notificationEnabled && styles.toggleSwitchActive,
              ]}
              onPress={async () => {
                const newValue = !notificationEnabled;
                setNotificationEnabled(newValue);
                await setStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, newValue.toString());

                if (newValue) {
                  try {
                    const hasPermission = await requestPermissions();
                    if (hasPermission) {
                      await scheduleDailyNotifications(notificationTimes);
                      Alert.alert(t('common.success'), t('settings.remindersEnabled'));
                    } else {
                      setNotificationEnabled(false);
                      await setStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'false');
                      Alert.alert(t('settings.permissionRequired'), t('settings.enableNotificationsSettings'));
                    }
                  } catch (err) {
                    setNotificationEnabled(false);
                    await setStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'false');
                    console.error('Enable reminders error:', err);
                    Alert.alert(t('common.error'), t('settings.enableNotificationsSettings'));
                  }
                } else {
                  try {
                    await cancelAllNotifications();
                  } catch (err) {
                    console.error('Cancel notifications error:', err);
                  }
                }
              }}
            >
              <View
                style={[
                  styles.toggleThumb,
                  notificationEnabled && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
          
          {notificationEnabled && (
            <View style={styles.timePickerContainer}>
              <Text style={styles.timeLabel}>{t('settings.reminderTimes')}</Text>
              {notificationTimes.map((t, idx) => (
                <View key={`reminder-${idx}-${t}`} style={styles.reminderRow}>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => {
                      setEditingTimeIndex(idx);
                      setTimePickerValue(dateFromTimeString(t));
                      setShowTimePicker(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timePickerButtonText}>{t}</Text>
                    <Ionicons name="time-outline" size={22} color={c.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reminderRemoveBtn, notificationTimes.length <= 1 && styles.reminderRemoveBtnDisabled]}
                    onPress={() => removeReminder(idx)}
                    disabled={notificationTimes.length <= 1}
                  >
                    <Ionicons name="trash-outline" size={20} color={notificationTimes.length <= 1 ? c.disabled : c.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addReminderBtn, notificationTimes.length >= LIMITS.maxReminders && styles.addReminderBtnDisabled]}
                onPress={addReminder}
                disabled={notificationTimes.length >= LIMITS.maxReminders}
              >
                <Ionicons name="add-circle-outline" size={22} color={notificationTimes.length >= LIMITS.maxReminders ? c.disabled : c.primary} />
                <Text style={[styles.addReminderText, notificationTimes.length >= LIMITS.maxReminders && styles.addReminderTextDisabled]}>
                  {t('settings.addReminder')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              mode="time"
              value={timePickerValue}
              is24Hour={true}
              display="default"
              onChange={async (event, selectedDate) => {
                setShowTimePicker(false);
                if (event.type === 'set' && selectedDate && editingTimeIndex !== null) {
                  const next = timeStringFromDate(selectedDate);
                  await updateReminderTime(editingTimeIndex, next);
                }
                setEditingTimeIndex(null);
              }}
            />
          )}

          {showTimePicker && Platform.OS === 'ios' && (
            <AnimatedModal
              visible={showTimePicker}
              onRequestClose={() => { setShowTimePicker(false); setEditingTimeIndex(null); }}
            >
              <View style={styles.timePickerModalOverlay}>
                <TouchableOpacity
                  style={styles.timePickerModalBackdrop}
                  activeOpacity={1}
                  onPress={() => { setShowTimePicker(false); setEditingTimeIndex(null); }}
                />
                <View style={styles.timePickerModalContent}>
                  <View style={styles.timePickerModalHeader}>
                    <TouchableOpacity onPress={() => { setShowTimePicker(false); setEditingTimeIndex(null); }}>
                      <Text style={styles.timePickerModalCancel}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <Text style={styles.timePickerModalTitle}>{t('settings.reminderTime')}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        if (editingTimeIndex !== null) {
                          const next = timeStringFromDate(timePickerValue);
                          await updateReminderTime(editingTimeIndex, next);
                        }
                        setShowTimePicker(false);
                        setEditingTimeIndex(null);
                      }}
                    >
                      <Text style={styles.timePickerModalDone}>{t('common.ok')}</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    mode="time"
                    value={timePickerValue}
                    is24Hour={true}
                    display="spinner"
                    onChange={(_, d) => d && setTimePickerValue(d)}
                    style={styles.timePickerIOS}
                  />
                </View>
              </View>
            </AnimatedModal>
          )}
        </View>

        {/* Clear Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.dataManagement')}</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Ionicons name="trash" size={20} color={c.danger} />
            <Text style={styles.dangerButtonText}>{t('settings.clearAllData')}</Text>
          </TouchableOpacity>
        </View>

        {/* Dev Only: shown only in __DEV__ (e.g. npm run dev / dev client), hidden in App Store / production */}
        {__DEV__ && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.devOnly')}</Text>
            <Text style={styles.cardSubtitle}>
              {t('settings.resetInitialStateDesc')}
            </Text>
            <TouchableOpacity style={styles.devButton} onPress={resetToInitialState}>
              <Ionicons name="refresh" size={20} color={c.primary} />
              <Text style={styles.devButtonText}>{t('settings.resetInitialState')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.devButton, { marginTop: 12 }]} onPress={resetOnboarding}>
              <Ionicons name="refresh-circle" size={20} color={c.primary} />
              <Text style={styles.devButtonText}>{t('settings.resetOnboarding')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Support & Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.support')}</Text>
          <View style={styles.unitButtons}>
            <TouchableOpacity style={styles.unitButton} onPress={handleSendFeedback}>
              <Ionicons name="chatbubble-outline" size={24} color={c.primary} />
              <Text style={styles.unitButtonText}>{t('settings.sendFeedback')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.unitButton} onPress={() => setShowFAQModal(true)}>
              <Ionicons name="help-circle-outline" size={24} color={c.primary} />
              <Text style={styles.unitButtonText}>{t('settings.faq')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.unitButton} onPress={handleReviewApp}>
              <Ionicons name="star-outline" size={24} color={c.primary} />
              <Text style={styles.unitButtonText}>{t('settings.reviewApp')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settings.about')}</Text>
          <Text style={styles.infoText}>
            {t('settings.aboutDesc')}
          </Text>
        </View>
      </View>

      {/* Sugar Info Modal */}
      <AnimatedModal
        visible={showSugarInfoModal}
        onRequestClose={() => setShowSugarInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSugarInfoModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.understandingSugar')}</Text>
              <TouchableOpacity
                onPress={() => setShowSugarInfoModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalScrollContainer}>
              <ScrollView 
                ref={sugarInfoScrollRef}
                style={styles.modalScrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  setScrollPosition(contentOffset.y);
                  setScrollContentHeight(contentSize.height);
                  setScrollViewHeight(layoutMeasurement.height);
                }}
                onContentSizeChange={(width, height) => {
                  setScrollContentHeight(height);
                }}
                onLayout={(event) => {
                  setScrollViewHeight(event.nativeEvent.layout.height);
                }}
                scrollEventThrottle={16}
              >
              <Text style={styles.modalIntroText}>
                {t('track.sugarIntakeIntro')}
              </Text>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>{t('track.addedSugarIncludes')}</Text>
                <View style={styles.bulletList}>
                  <Text style={styles.bulletItem}>
                    {t('track.addedSugarItems')}
                  </Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>{t('track.maximumLimits')}</Text>
                <Text style={styles.sectionText}>
                  {t('track.accordingToHealthOrgs')}
                </Text>
                <View style={styles.bulletList}>
                  <Text style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>• </Text>
                    <Text style={styles.boldText}>{t('track.who')}</Text> {t('track.whoLimit')}{'\n'}
                    <Text style={styles.indentText}>{t('track.whoBetter')}</Text>
                  </Text>
                  <Text style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>• </Text>
                    <Text style={styles.boldText}>{t('track.aha')}</Text>{'\n'}
                    <Text style={styles.indentText}>{t('track.ahaWomen')}</Text>{'\n'}
                    <Text style={styles.indentText}>{t('track.ahaMen')}</Text>
                  </Text>
                </View>
                <Text style={styles.warningText}>
                  {t('track.safetyLimits')}
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>{t('track.healthyTargets')}</Text>
                <View style={styles.bulletList}>
                  <Text style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>• </Text>
                    <Text style={styles.boldText}>{t('track.excellent')}</Text> 0 to 5 g
                  </Text>
                  <Text style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>• </Text>
                    <Text style={styles.boldText}>{t('track.veryGood')}</Text> under 10 g
                  </Text>
                  <Text style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>• </Text>
                    <Text style={styles.boldText}>{t('track.optimal')}</Text> under 15 g
                  </Text>
                  <Text style={styles.bulletItem}>
                    <Text style={styles.bulletPoint}>• </Text>
                    <Text style={styles.boldText}>{t('track.higherLimit')}</Text> 15 to 25 g
                  </Text>
                </View>
                <Text style={styles.warningText}>
                  {t('track.healthyTargetsWarning')}
                </Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.noteTitle}>{t('track.note')}</Text>
                <Text style={styles.noteText}>
                  {t('track.naturalSugarNote')}
                </Text>
                <Text style={[styles.noteText, { marginTop: 10 }]}>
                  {t('track.fruitJuiceNote')}
                </Text>
              </View>
              </ScrollView>
              {/* Always visible scrollbar track */}
              {scrollContentHeight > scrollViewHeight && (
                <View style={styles.scrollbarTrack}>
                  <View 
                    style={[
                      styles.scrollbarThumb,
                      {
                        height: Math.max(30, (scrollViewHeight / scrollContentHeight) * (scrollViewHeight - 10)),
                        top: scrollContentHeight > scrollViewHeight 
                          ? (scrollPosition / (scrollContentHeight - scrollViewHeight)) * (scrollViewHeight - Math.max(30, (scrollViewHeight / scrollContentHeight) * (scrollViewHeight - 10)) - 10)
                          : 0,
                      }
                    ]} 
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSugarInfoModal(false)}
            >
              <Text style={styles.modalButtonText}>{t('common.gotIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>

      {/* FAQ Modal */}
      <AnimatedModal
        visible={showFAQModal}
        onRequestClose={() => setShowFAQModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowFAQModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.faq')}</Text>
              <TouchableOpacity
                onPress={() => setShowFAQModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.faqScrollView} showsVerticalScrollIndicator={true}>
              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('settings.faq1Question')}</Text>
                <Text style={styles.faqAnswer}>{t('settings.faq1Answer')}</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('settings.faq2Question')}</Text>
                <Text style={styles.faqAnswer}>{t('settings.faq2Answer')}</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('settings.faq3Question')}</Text>
                <Text style={styles.faqAnswer}>{t('settings.faq3Answer')}</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('settings.faq4Question')}</Text>
                <Text style={styles.faqAnswer}>{t('settings.faq4Answer')}</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('settings.faq5Question')}</Text>
                <Text style={styles.faqAnswer}>{t('settings.faq5Answer')}</Text>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{t('settings.faq6Question')}</Text>
                <Text style={styles.faqAnswer}>{t('settings.faq6Answer')}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </AnimatedModal>

      <AnimatedModal
        visible={showQuitReasonsModal}
        onRequestClose={() => setShowQuitReasonsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 4 }}>
            <TouchableOpacity onPress={() => setShowQuitReasonsModal(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
          <QuitReasonsScreen
            editMode
            initialReasons={quitReasonsList}
            onComplete={() => {
              setShowQuitReasonsModal(false);
              loadData();
            }}
          />
        </View>
      </AnimatedModal>

      {/* Language Selection Modal */}
      <AnimatedModal
        visible={showLanguageModal}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.chooseLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            {supportedLanguages.map(({ code }) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.unitButton,
                  currentLanguage === code && styles.unitButtonActive,
                  { marginBottom: 10 },
                ]}
                onPress={async () => {
                  await changeLanguage(code);
                  setShowLanguageModal(false);
                }}
              >
                <Ionicons
                  name={currentLanguage === code ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={currentLanguage === code ? c.primary : c.textMuted}
                />
                <Text
                  style={[
                    styles.unitButtonText,
                    currentLanguage === code && styles.unitButtonTextActive,
                  ]}
                >
                  {getLanguageName(code)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </AnimatedModal>
      </ScrollView>
    </View>
  );
}

function createStyles(theme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    fixedHeader: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
      paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      justifyContent: 'flex-end',
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 20 }, // Base padding, actual padding includes tab bar + safe area
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: c.headerText, marginBottom: 5 },
    headerSubtitle: { fontSize: 16, color: c.headerText, opacity: 0.9 },
    content: { padding: 20 },
    card: {
      backgroundColor: c.surface, borderRadius: 15, padding: 20, marginBottom: 20,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    cardTitleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardIcon: { marginRight: 10 },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: c.text, flex: 1, marginBottom: 12 },
    infoButton: { padding: 5 },
    cardSubtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 16, marginTop: 4 },
    inputContainer: { flexDirection: 'row', marginTop: 4 },
    input: {
      flex: 1, borderWidth: 2, borderColor: c.primary, borderRadius: 10, padding: 12, fontSize: 16, marginRight: 10, color: c.text,
    },
    updateButton: { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
    updateButtonText: { color: c.surface, fontSize: 16, fontWeight: 'bold' },
    unitButtons: { marginTop: 4 },
    languageRow: { justifyContent: 'space-between' },
    unitButton: {
      flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 10, backgroundColor: c.background, marginBottom: 10,
    },
    unitButtonActive: { backgroundColor: c.primarySoft, borderWidth: 2, borderColor: c.primary },
    unitButtonText: { fontSize: 16, color: c.textSecondary, marginLeft: 10 },
    unitButtonTextActive: { color: c.primary, fontWeight: 'bold' },
    themeButtons: { marginTop: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    themeButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 2 },
    themeSwatch: { width: 20, height: 20, borderRadius: 10, marginRight: 10 },
    themeButtonText: { fontSize: 16, fontWeight: '500' },
    dangerButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10,
      backgroundColor: c.dangerSoft, borderWidth: 2, borderColor: c.danger, marginTop: 4,
    },
    dangerButtonText: { color: c.danger, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    devButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10,
      backgroundColor: c.primarySoft, borderWidth: 2, borderColor: c.primary, marginTop: 4,
    },
    devButtonText: { color: c.primary, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    infoText: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 10 },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: c.surface, borderRadius: 20, width: '90%', maxHeight: '85%', padding: 20 },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: c.text, flex: 1 },
    closeButton: { padding: 5 },
  modalScrollContainer: { position: 'relative', maxHeight: 500, flexDirection: 'row' },
  modalScrollView: { maxHeight: 500, flex: 1 },
  modalScrollContent: { paddingRight: 20, paddingBottom: 10 },
  scrollbarTrack: {
    width: 6,
    backgroundColor: c.border,
    borderRadius: 3,
    marginLeft: 8,
    marginTop: 5,
    marginBottom: 5,
    position: 'relative',
    minHeight: 100,
  },
  scrollbarThumb: {
    width: 6,
    backgroundColor: c.textMuted,
    borderRadius: 3,
    minHeight: 30,
    position: 'absolute',
    top: 0,
  },
  modalIntroText: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 25 },
  infoSection: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 12 },
  sectionText: { fontSize: 15, color: c.textSecondary, marginBottom: 10, lineHeight: 22 },
  bulletList: { marginLeft: 5, marginBottom: 12 },
  bulletItem: { fontSize: 15, color: c.text, lineHeight: 24, marginBottom: 6 },
  bulletPoint: { fontSize: 18, color: c.text },
  indentText: { marginLeft: 20, fontSize: 14, color: c.textSecondary },
  boldText: { fontWeight: 'bold', color: c.text },
  warningText: { fontSize: 14, color: c.text, fontStyle: 'italic', marginTop: 8, lineHeight: 20 },
  targetList: { marginLeft: 5, marginBottom: 12 },
  targetItem: { fontSize: 15, color: c.text, lineHeight: 26, marginBottom: 6 },
  noteTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 10 },
  noteText: { fontSize: 15, color: c.textSecondary, lineHeight: 22 },
  modalButton: { backgroundColor: c.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 15 },
  modalButtonText: { color: c.surface, fontSize: 16, fontWeight: 'bold' },
    timePickerContainer: { marginTop: 4 },
  timeLabel: { fontSize: 16, fontWeight: '600', color: c.text, marginBottom: 10 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  timePickerButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 2, borderColor: c.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface,
  },
  timePickerButtonText: { fontSize: 18, fontWeight: '600', color: c.text },
  reminderRemoveBtn: { padding: 10 },
  reminderRemoveBtnDisabled: { opacity: 0.5 },
  addReminderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 2, borderColor: c.primary, borderStyle: 'dashed', marginTop: 4, gap: 8,
  },
  addReminderBtnDisabled: { borderColor: c.disabled },
  addReminderText: { fontSize: 16, fontWeight: '600', color: c.primary },
  addReminderTextDisabled: { color: c.disabled },
  timePickerModalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  timePickerModalBackdrop: { flex: 1 },
  timePickerModalContent: {
    backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingBottom: 28, paddingHorizontal: 20,
  },
  timePickerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  timePickerModalCancel: { fontSize: 17, color: c.textSecondary },
  timePickerModalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
  timePickerModalDone: { fontSize: 17, fontWeight: '600', color: c.primary },
  timePickerIOS: { height: 180 },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  toggleLabel: {
    fontSize: 16,
    color: c.text,
    flex: 1,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.border,
    justifyContent: 'center',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: c.primary,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.surface,
    position: 'absolute',
    left: 2,
  },
  toggleThumbActive: {
    left: 22,
  },
  faqScrollView: {
    maxHeight: 500,
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  faqQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text,
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 15,
    color: c.textSecondary,
    lineHeight: 22,
  },
  });
}
