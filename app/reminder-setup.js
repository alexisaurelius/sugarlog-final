import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ReminderSetupScreen({ onComplete, onSkip }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;

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
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{t('reminderSetup.setupReminders')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          activeOpacity={0.8}
        >
          <Text style={[styles.skipButtonText, { color: c.textSecondary }]}>
            {t('reminderSetup.skipForNow')}
          </Text>
        </TouchableOpacity>
      </View>
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
});
