import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { isSubscribed, presentPaywall } from '../utils/purchases';

export default function OnboardingScreen({ onComplete }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;

  const features = [
    {
      icon: 'add-circle-outline',
      titleKey: 'onboarding.trackIntake',
      descKey: 'onboarding.trackIntakeDesc',
    },
    {
      icon: 'stats-chart-outline',
      titleKey: 'onboarding.progress',
      descKey: 'onboarding.progressDesc',
    },
    {
      icon: 'flame-outline',
      titleKey: 'onboarding.streaks',
      descKey: 'onboarding.streaksDesc',
    },
    {
      icon: 'trophy-outline',
      titleKey: 'onboarding.achievements',
      descKey: 'onboarding.achievementsDesc',
    },
    {
      icon: 'gift-outline',
      titleKey: 'onboarding.firstEntryFree',
      descKey: 'onboarding.firstEntryFreeDesc',
    },
  ];

  const handleUpgradePress = async () => {
    const subscribed = await isSubscribed(true);
    if (subscribed) {
      const url = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      try {
        const can = await Linking.canOpenURL(url);
        if (can) await Linking.openURL(url);
      } catch (e) {
        console.warn('Open subscription settings:', e?.message || e);
      }
    } else {
      const purchased = await presentPaywall();
      if (purchased) onComplete();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.welcomeText, { color: c.text }]}>
            {t('onboarding.welcome')}
          </Text>
          <View style={styles.appNameContainer}>
            <Text style={[styles.appName, { color: c.text }]}>
              {t('onboarding.appNamePart1')}
            </Text>
            <Text style={[styles.appName, { color: c.primary }]}>
              {t('onboarding.appNamePart2')}
            </Text>
          </View>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.iconContainer, { backgroundColor: c.surface }]}>
                <Ionicons name={feature.icon} size={24} color={c.primary} />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: c.text }]}>
                  {t(feature.titleKey)}
                </Text>
                <Text style={[styles.featureDesc, { color: c.textSecondary }]}>
                  {t(feature.descKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Upgrade now & Continue */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.upgradeButton, { borderColor: c.primary }]}
          onPress={handleUpgradePress}
          activeOpacity={0.8}
        >
          <Text style={[styles.upgradeButtonText, { color: c.primary }]}>
            {t('onboarding.upgradeNow')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: c.primary }]}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 8,
  },
  appNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  featuresContainer: {
    gap: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 12,
  },
  upgradeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
