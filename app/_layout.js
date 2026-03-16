import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { initializeNotifications } from '../utils/notifications';
import { LAUNCH } from '../app.config';
import { ThemeProvider, useThemeContext } from '../utils/ThemeContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import '../i18n/config';
import OnboardingScreen from './onboarding';
import ReminderSetupScreen from './reminder-setup';
import GoalSetupScreen from './goal-setup';
import QuitReasonsScreen from './quit-reasons';
import NameSetupScreen from './name-setup';

function RootLayoutContent() {
  const { theme } = useThemeContext();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [showQuitReasons, setShowQuitReasons] = useState(false);
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
    // Defer notifications init to avoid launch crash on iOS 26+ (TurboModule void method exceptions)
    const t = setTimeout(initializeNotifications, LAUNCH.notificationInitDelayMs);
    return () => clearTimeout(t);
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await getStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'false');
      const reminderSetupCompleted = await getStorageItem(STORAGE_KEYS.REMINDER_SETUP_COMPLETED, 'false');
      const goalSet = await getStorageItem(STORAGE_KEYS.GOAL_SET, 'false');
      const quitReasonsSeen = await getStorageItem(STORAGE_KEYS.QUIT_REASONS_SCREEN_SEEN, 'false');
      const nameCompleted = await getStorageItem(STORAGE_KEYS.ONBOARDING_NAME_COMPLETED, 'false');
      setShowOnboarding(completed !== 'true');
      setShowReminderSetup(completed === 'true' && reminderSetupCompleted !== 'true');
      setShowGoalSetup(completed === 'true' && reminderSetupCompleted === 'true' && goalSet !== 'true');
      setShowQuitReasons(
        completed === 'true' &&
        reminderSetupCompleted === 'true' &&
        goalSet === 'true' &&
        quitReasonsSeen !== 'true'
      );
      setShowNameSetup(
        completed === 'true' &&
        reminderSetupCompleted === 'true' &&
        goalSet === 'true' &&
        quitReasonsSeen === 'true' &&
        nameCompleted !== 'true'
      );
      setIsCheckingOnboarding(false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await setStorageItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      setShowOnboarding(false);
      setShowReminderSetup(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleReminderSetupComplete = async () => {
    try {
      await setStorageItem(STORAGE_KEYS.REMINDER_SETUP_COMPLETED, 'true');
      await checkOnboardingStatus(); // updates state to show Goal Setup next (no intermediate flash)
    } catch (error) {
      console.error('Error saving reminder setup status:', error);
    }
  };

  const handleReminderSetupSkip = async () => {
    try {
      await setStorageItem(STORAGE_KEYS.REMINDER_SETUP_COMPLETED, 'true');
      await checkOnboardingStatus(); // updates state to show Goal Setup next (no intermediate flash)
    } catch (error) {
      console.error('Error saving reminder setup status:', error);
    }
  };

  if (isCheckingOnboarding) {
    return null; // Or a loading screen
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  if (showReminderSetup) {
    return (
      <ReminderSetupScreen
        onComplete={handleReminderSetupComplete}
        onSkip={handleReminderSetupSkip}
      />
    );
  }

  if (showGoalSetup) {
    return (
      <GoalSetupScreen
        onComplete={async () => {
          await checkOnboardingStatus();
        }}
      />
    );
  }

  if (showQuitReasons) {
    return (
      <QuitReasonsScreen
        onComplete={() => checkOnboardingStatus()}
        onSkip={() => checkOnboardingStatus()}
      />
    );
  }

  if (showNameSetup) {
    return (
      <NameSetupScreen
        onComplete={() => checkOnboardingStatus()}
        onSkip={() => checkOnboardingStatus()}
      />
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.surface,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={theme.statusBar} />
    </>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
