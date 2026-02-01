import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        sceneContainerStyle: { backgroundColor: theme.colors.background },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingHorizontal: 20,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: Math.max(insets.bottom * 0.5, 4),
          height: 56 + Math.max(insets.bottom * 0.5, 4),
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          paddingHorizontal: 0,
          flex: 1,
        },
        tabBarLabelStyle: {
          marginTop: -4,
          fontSize: 12,
        },
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.surface,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('track.navTitle'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
