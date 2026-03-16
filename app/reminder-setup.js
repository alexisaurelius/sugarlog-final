import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { requestPermissions, scheduleDailyNotifications } from '../utils/notifications';
import { setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { DEFAULTS } from '../app.config';

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

export default function ReminderSetupScreen({ onComplete, onSkip }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULTS.defaultNotificationTime);
  const [timePickerDate, setTimePickerDate] = useState(() => dateFromTimeString(DEFAULTS.defaultNotificationTime));
  const [loading, setLoading] = useState(false);

  const handleSetupReminders = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          t('settings.permissionRequired'),
          t('settings.enableNotificationsSettings')
        );
        setLoading(false);
        return;
      }
      setShowTimePicker(true);
    } catch (err) {
      console.error('Reminder setup permission error:', err);
      Alert.alert(t('common.error'), t('settings.enableNotificationsSettings'));
    }
    setLoading(false);
  };

  const saveReminderAndComplete = async (date) => {
    const d = date || timePickerDate;
    const timeStr = timeStringFromDate(d);
    setShowTimePicker(false);
    setReminderTime(timeStr);
    try {
      await setStorageItem(STORAGE_KEYS.NOTIFICATION_ENABLED, 'true');
      await setStorageItem(STORAGE_KEYS.NOTIFICATION_TIMES, JSON.stringify([timeStr]));
      await scheduleDailyNotifications([timeStr]);
      onComplete();
    } catch (err) {
      console.error('Reminder setup save error:', err);
      Alert.alert(t('common.error'), t('reminderSetup.setupReminders'));
    }
  };

  const handleTimeConfirm = () => saveReminderAndComplete();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>
            {t('reminderSetup.title')}
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            {t('reminderSetup.subtitle')}
          </Text>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Ionicons name="notifications" size={24} color={c.primary} />
            <View style={styles.benefitTextContainer}>
              <Text style={[styles.benefitTitle, { color: c.text }]}>
                {t('reminderSetup.benefit1Title')}
              </Text>
              <Text style={[styles.benefitDesc, { color: c.textSecondary }]}>
                {t('reminderSetup.benefit1Desc')}
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="time" size={24} color={c.primary} />
            <View style={styles.benefitTextContainer}>
              <Text style={[styles.benefitTitle, { color: c.text }]}>
                {t('reminderSetup.benefit2Title')}
              </Text>
              <Text style={[styles.benefitDesc, { color: c.textSecondary }]}>
                {t('reminderSetup.benefit2Desc')}
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color={c.primary} />
            <View style={styles.benefitTextContainer}>
              <Text style={[styles.benefitTitle, { color: c.text }]}>
                {t('reminderSetup.benefit3Title')}
              </Text>
              <Text style={[styles.benefitDesc, { color: c.textSecondary }]}>
                {t('reminderSetup.benefit3Desc')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: c.primary }]}
          onPress={handleSetupReminders}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{t('reminderSetup.setupReminders')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={[styles.skipButtonText, { color: c.textSecondary }]}>
            {t('reminderSetup.skipForNow')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Native time picker only — no custom modal */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          mode="time"
          value={timePickerDate}
          is24Hour={true}
          display="default"
          onChange={(event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              saveReminderAndComplete(selectedDate);
            } else {
              setShowTimePicker(false);
            }
          }}
        />
      )}
      {showTimePicker && Platform.OS === 'ios' && (
        <View style={[styles.iosPickerContainer, { backgroundColor: c.surface }]}>
          <DateTimePicker
            mode="time"
            value={timePickerDate}
            is24Hour={true}
            display="spinner"
            onChange={(_, d) => d && setTimePickerDate(d)}
            style={styles.iosTimePicker}
          />
          <View style={styles.iosPickerActions}>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={[styles.iosPickerActionText, { color: c.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTimeConfirm}>
              <Text style={[styles.iosPickerActionText, { color: c.primary }]}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    gap: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
  iosPickerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iosTimePicker: {
    height: 180,
    width: '100%',
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 8,
    width: '100%',
  },
  iosPickerActionText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
