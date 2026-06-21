import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { presentPaywall, warmUpPurchases } from '../utils/purchases';

const APP_ICON = require('../assets/icon.png');

export default function PremiumOnboardingScreen({ onComplete }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;

  useEffect(() => {
    warmUpPurchases();
  }, []);

  const premiumPerks = [
    { icon: 'create-outline', labelKey: 'onboarding.premiumPerkUnlimited' },
    { icon: 'calendar-outline', labelKey: 'onboarding.premiumPerkInsights' },
    { icon: 'trophy-outline', labelKey: 'onboarding.premiumPerkAchievements' },
    { icon: 'flame-outline', labelKey: 'onboarding.premiumPerkStreaks' },
  ];

  const handleContinue = async () => {
    try {
      await presentPaywall();
    } catch (error) {
      if (__DEV__) console.error('Failed to present paywall:', error);
    } finally {
      onComplete?.();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.premiumScroll}
        contentContainerStyle={styles.premiumScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.premiumHeader}>
          <Image source={APP_ICON} style={styles.appIcon} accessibilityLabel="SugarLog" />
          <Text style={[styles.premiumScreenTitle, { color: c.text }]}>
            {t('onboarding.premiumScreenTitle')}
          </Text>
          <Text style={[styles.premiumScreenSub, { color: c.textSecondary }]}>
            {t('onboarding.premiumScreenSubtitle')}
          </Text>
        </View>

        {premiumPerks.map((perk, index) => (
          <View
            key={index}
            style={[
              styles.premiumCard,
              { backgroundColor: c.surface, borderColor: c.primary },
            ]}
          >
            <View style={styles.premiumCardCheck}>
              <Ionicons name="checkmark-circle" size={24} color={c.primary} />
            </View>
            <View style={styles.premiumCardBody}>
              <Text style={[styles.premiumCardTitle, { color: c.text }]}>
                {t(perk.labelKey)}
              </Text>
            </View>
            <Ionicons name={perk.icon} size={24} color={c.primary} style={styles.premiumCardIcon} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.premiumFooter}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: c.primary }]}
          onPress={handleContinue}
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
  premiumScroll: {
    flex: 1,
  },
  premiumScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginBottom: 16,
  },
  premiumScreenTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  premiumScreenSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumCardCheck: {
    marginRight: 14,
  },
  premiumCardBody: {
    flex: 1,
    minWidth: 0,
  },
  premiumCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  premiumCardIcon: {
    marginLeft: 12,
  },
  premiumFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
