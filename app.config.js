/**
 * SugarLog – Main app configuration
 * Central source for app metadata, defaults, limits, and third-party keys.
 * Also serves as Expo config (default export).
 */

// ─── App metadata ─────────────────────────────────────────────────────────
export const APP = {
  name: 'SugarLog',
  slug: 'sugarlog',
  version: '1.2.0',
  bundleId: {
    ios: 'com.sugarlog.app',
    android: 'com.sugarlog.app',
  },
};

// ─── Defaults (used on first launch / reset) ───────────────────────────────
export const DEFAULTS = {
  dailyGoalGrams: 10,
  defaultNotificationTime: '20:00',
  unitSystem: 'metric',
  theme: 'default',
  weekStartDay: 0, // 0 = Sunday, 1 = Monday
};

// ─── Limits ───────────────────────────────────────────────────────────────
export const LIMITS = {
  maxDailyGoalGrams: 50,
  maxQuitReasons: 3,
  maxCustomQuickAddItems: 20,
  maxReminders: 4,
  freezesPerMonth: 2,
};

// ─── Subscription (free tier) ──────────────────────────────────────────────
export const SUBSCRIPTION = {
  freeDayLimit: 2, // distinct days with at least one entry; 3rd new day triggers paywall
  entitlementId: 'pro', // primary; also accept 'premium' (RevenueCat dashboard may use either)
  entitlementIds: ['pro', 'premium'],
};

// ─── RevenueCat API keys ───────────────────────────────────────────────────
export const REVENUECAT = {
  appleApiKey: 'appl_YfQJdRkadKzKnixGMOfYrLKrbfO',
  googleApiKey: '', // Add goog_xxx from RevenueCat when ready for Android
};

// ─── i18n ──────────────────────────────────────────────────────────────────
export const I18N = {
  storageKey: 'app_language',
  supportedLanguages: ['en', 'ja', 'zh'],
  fallbackLanguage: 'en',
};

// ─── Launch / init (for stability on iOS) ──────────────────────────────────
export const LAUNCH = {
  // Delay before notifications init to avoid crash on iOS 26+
  notificationInitDelayMs: 500,
};

// ─── Expo config (default export) ──────────────────────────────────────────
export default {
  expo: {
    name: APP.name,
    slug: APP.slug,
    version: APP.version,
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash icon.png',
      backgroundColor: '#FFFFFF',
      resizeMode: 'contain',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: APP.bundleId.ios,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: APP.bundleId.android,
      adaptiveIcon: { backgroundColor: '#FF6B9D' },
      permissions: ['POST_NOTIFICATIONS'],
    },
    scheme: APP.slug,
    plugins: [
      'expo-router',
      'expo-notifications',
      '@react-native-community/datetimepicker',
      [
        'expo-localization',
        {
          supportedLocales: {
            ios: I18N.supportedLanguages,
            android: I18N.supportedLanguages,
          },
        },
      ],
      ['expo-splash-screen', { backgroundColor: '#FFFFFF', image: './assets/splash icon.png', resizeMode: 'contain' }],
    ],
    extra: {
      router: {},
      eas: { projectId: '820c0e1f-0055-4cfc-bcb7-00b3da3afa6c' },
    },
    owner: 'marcusthegreat',
  },
};
