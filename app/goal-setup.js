import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeContext } from '../utils/ThemeContext';
import { useTranslation } from 'react-i18next';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../utils/storage';
import { UNIT_SYSTEMS } from '../utils/units';
import { LIMITS } from '../app.config';

export default function GoalSetupScreen({ onComplete }) {
  const { theme } = useThemeContext();
  const { t } = useTranslation();
  const c = theme.colors;
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const styles = React.useMemo(() => createGoalSetupStyles(theme), [theme]);

  const handleSetGoal = async () => {
    const goalValue = parseInt(goalInput, 10);
    if (isNaN(goalValue) || goalValue < 0) {
      Alert.alert(t('track.invalidInput'), t('track.enterValidNumber'));
      return;
    }
    const goalInGrams = goalValue;
    if (goalInGrams > LIMITS.maxDailyGoalGrams) {
      Alert.alert(
        t('track.maximumLimitExceeded'),
        `${t('track.maxDailyGoal')} ${LIMITS.maxDailyGoalGrams}g ${t('track.maxDailyGoalDesc')}`
      );
      return;
    }
    await setStorageItem(STORAGE_KEYS.DAILY_GOAL, goalInGrams.toString());
    await setStorageItem(STORAGE_KEYS.GOAL_SET, 'true');
    await setStorageItem(STORAGE_KEYS.UNIT_SYSTEM, UNIT_SYSTEMS.METRIC);
    onComplete();
  };

  if (!showGoalInput) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
        <View style={styles.sugarInfoScrollContainer}>
          <ScrollView
            style={styles.sugarInfoScrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.content}>
            <Text style={styles.title}>{t('track.sugarIntake')}</Text>
            <Text style={styles.introText}>{t('track.sugarIntakeIntro')}</Text>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('track.addedSugarIncludes')}</Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>{t('track.addedSugarItems')}</Text>
              </View>
            </View>
            <View style={styles.section}>
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
              <Text style={styles.warningText}>{t('track.healthyTargetsWarning')}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('track.maximumLimits')}</Text>
              <Text style={styles.sectionText}>{t('track.accordingToHealthOrgs')}</Text>
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
              <Text style={styles.warningText}>{t('track.safetyLimits')}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('track.note')}</Text>
              <Text style={styles.noteText}>{t('track.naturalSugarNote')}</Text>
              <Text style={[styles.noteText, { marginTop: 10 }]}>{t('track.fruitJuiceNote')}</Text>
            </View>
          </View>
          </ScrollView>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: c.primary }]}
            onPress={() => setShowGoalInput(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{t('common.gotIt')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top', 'bottom']}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.goalInputScreen}>
          <View style={styles.goalInputForm}>
            <Text style={styles.title}>{t('track.setDailyGoal')}</Text>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('track.howMuchSugar')}</Text>
              <Text style={styles.inputHint}>
                ✅ {t('track.recommended')}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: c.primary, color: c.text }]}
                placeholder={t('track.enterGoalInGrams')}
                placeholderTextColor={c.placeholder}
                keyboardType="number-pad"
                value={goalInput}
                onChangeText={(text) => setGoalInput(text.replace(/[^0-9]/g, ''))}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: c.primary, marginTop: 24 }]}
              onPress={handleSetGoal}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{t('track.setGoal')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

function createGoalSetupStyles(theme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1 },
    flex1: { flex: 1 },
    scrollView: { flex: 1 },
    sugarInfoScrollContainer: { flex: 1, flexDirection: 'row' },
    sugarInfoScrollView: { flex: 1 },
    scrollContent: { paddingBottom: 12, paddingRight: 20 },
    content: { paddingHorizontal: 24, paddingTop: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: c.text, marginBottom: 20, textAlign: 'center' },
    introText: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 25 },
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 12 },
    sectionText: { fontSize: 16, color: c.textSecondary, marginBottom: 10, lineHeight: 24 },
    targetList: { marginLeft: 5, marginBottom: 12 },
    targetItem: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 6 },
    bulletList: { marginLeft: 5, marginBottom: 12 },
    bulletItem: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 6 },
    bulletPoint: { fontSize: 18, color: c.text },
    indentText: { marginLeft: 20, fontSize: 16, color: c.textSecondary },
    boldText: { fontWeight: 'bold', color: c.text },
    warningText: { fontSize: 16, color: c.text, fontStyle: 'italic', marginTop: 8, lineHeight: 24 },
    noteTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 10 },
    noteText: { fontSize: 16, color: c.textSecondary, lineHeight: 24 },
    buttonContainer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
    goalInputScreen: { flex: 1, paddingHorizontal: 24 },
    goalInputForm: { paddingTop: 24 },
    primaryButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { color: c.surface, fontSize: 18, fontWeight: 'bold' },
    inputSection: { marginTop: 16 },
    inputLabel: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 8 },
    inputHint: { fontSize: 17, color: c.textSecondary, marginTop: 14, marginBottom: 15 },
    input: { borderWidth: 2, borderRadius: 10, padding: 15, fontSize: 18, textAlign: 'center' },
  });
}
