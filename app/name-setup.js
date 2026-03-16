import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { setStorageItem, STORAGE_KEYS } from '../utils/storage';

export default function NameSetupScreen({ onComplete, onSkip }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;
  const [name, setName] = useState('');

  const trimmed = name.trim();

  const handleContinue = async () => {
    Keyboard.dismiss();
    if (trimmed) {
      await setStorageItem(STORAGE_KEYS.USER_NAME, trimmed);
    }
    await setStorageItem(STORAGE_KEYS.ONBOARDING_NAME_COMPLETED, 'true');
    onComplete?.();
  };

  const handleSkip = async () => {
    await setStorageItem(STORAGE_KEYS.ONBOARDING_NAME_COMPLETED, 'true');
    onSkip?.();
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex1}>
          <View style={[styles.header, { backgroundColor: c.background }]}>
            <Text style={[styles.title, { color: c.text }]}>{t('nameSetup.title')}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('nameSetup.subtitle')}</Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.label, { color: c.textSecondary }]}>{t('nameSetup.yourName')}</Text>
            <TextInput
              style={[styles.input, { borderColor: c.primary, color: c.text }]}
              placeholder={t('nameSetup.placeholder')}
              placeholderTextColor={c.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: c.primary }]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{t('nameSetup.continue')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.8}>
              <Text style={[styles.skipText, { color: c.textSecondary }]}>{t('nameSetup.skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    flex1: { flex: 1 },
    header: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 12,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    content: { paddingHorizontal: 24, paddingTop: 12 },
    label: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
    input: {
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      marginBottom: 24,
    },
    primaryButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    skipButton: { paddingVertical: 12, alignItems: 'center' },
    skipText: { fontSize: 16 },
  });
}
