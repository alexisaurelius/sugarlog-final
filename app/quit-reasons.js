import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS, setStorageItem } from '../utils/storage';
import { LIMITS } from '../app.config';

const MAX_REASONS = LIMITS.maxQuitReasons;

export default function QuitReasonsScreen({ onComplete, onSkip, initialReasons = [], editMode = false }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;
  const [reasons, setReasons] = useState(() => {
    const initial = Array.isArray(initialReasons) ? initialReasons.slice(0, MAX_REASONS) : [];
    while (initial.length < MAX_REASONS) initial.push('');
    return initial;
  });

  const filledReasons = reasons.filter((r) => r.trim().length > 0);

  const handleSave = async () => {
    const toSave = filledReasons.map((r) => r.trim()).filter(Boolean);
    await setStorageItem(STORAGE_KEYS.QUIT_SUGAR_REASONS, JSON.stringify(toSave));
    if (!editMode) await setStorageItem(STORAGE_KEYS.QUIT_REASONS_SCREEN_SEEN, 'true');
    onComplete?.();
  };

  const handleSkip = async () => {
    await setStorageItem(STORAGE_KEYS.QUIT_REASONS_SCREEN_SEEN, 'true');
    onSkip?.();
  };

  const updateReason = (index, text) => {
    const next = [...reasons];
    next[index] = text;
    setReasons(next);
  };

  const canContinue = editMode ? true : filledReasons.length > 0;
  const isOnboarding = !editMode && typeof onSkip === 'function';

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={editMode ? ['bottom'] : ['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex1}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.content, editMode && styles.contentEditMode]}>
              <Text style={[styles.title, { color: c.text }]}>
                {t('quitReasons.title')}
              </Text>
              <Text style={[styles.subtitle, { color: c.textSecondary }]}>
                {t('quitReasons.subtitle')}
              </Text>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.inputRow}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                    {t('quitReasons.reason')} {i + 1}
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: c.primary, color: c.text }]}
                    placeholder={t(`quitReasons.reasonPlaceholder${i + 1}`)}
                    placeholderTextColor={c.placeholder}
                    value={reasons[i]}
                    onChangeText={(text) => updateReason(i, text)}
                    maxLength={80}
                  />
                </View>
              ))}
              <Text style={[styles.hint, { color: c.textSecondary }]}>
                {t('quitReasons.hint')}
              </Text>
              {editMode && (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: c.primary, marginTop: 24 }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.primaryButtonText, { color: c.surface }]}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
          {!editMode && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: c.primary }]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={!canContinue}
              >
                <Text style={[styles.primaryButtonText, { color: c.surface }]}>
                  {canContinue ? t('quitReasons.done') : t('common.add')}
                </Text>
              </TouchableOpacity>
              {isOnboarding && (
                <TouchableOpacity
                  style={[styles.skipButton, { borderColor: c.border }]}
                  onPress={handleSkip}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.skipButtonText, { color: c.textSecondary }]}>
                    {t('quitReasons.skip')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    content: { paddingHorizontal: 24, paddingTop: 24 },
    contentEditMode: { paddingTop: 8 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 24, textAlign: 'center' },
    inputRow: { marginBottom: 16 },
    inputLabel: { fontSize: 14, marginBottom: 6 },
    input: { borderWidth: 2, borderRadius: 10, padding: 14, fontSize: 16 },
    hint: { fontSize: 14, marginTop: 8, fontStyle: 'italic' },
    buttonContainer: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 32 },
    primaryButton: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
    primaryButtonText: { fontSize: 18, fontWeight: 'bold' },
    skipButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 2 },
    skipButtonText: { fontSize: 16 },
  });
}
