import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import AnimatedModal from '../../utils/AnimatedModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../../utils/storage';
import { UNIT_SYSTEMS, COMMON_ITEMS, formatValue, getUnitLabel, convertToMetric } from '../../utils/units';
import { getLocalizedFoodItems } from '../../utils/unitsLocalized';
import { updateStreakAndSuccess, releaseFreezeForDate, getDaysWithEntriesSet } from '../../utils/stats';
import { isSubscribed, presentPaywall } from '../../utils/purchases';
import { useTheme } from '../../utils/ThemeContext';
import { useTranslation } from 'react-i18next';

const FREE_DAY_LIMIT = 3;

export default function TrackScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const c = theme.colors;
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);
  const [customAmount, setCustomAmount] = useState('');
  const [customFoodName, setCustomFoodName] = useState('');
  const [todayIntake, setTodayIntake] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [unitSystem, setUnitSystem] = useState(UNIT_SYSTEMS.METRIC);
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryHistory, setEntryHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [customQuickAddItems, setCustomQuickAddItems] = useState([]);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomAmount, setNewCustomAmount] = useState('');
  const [quitReasons, setQuitReasons] = useState([]);

  const MAX_CUSTOM_QUICK_ADD = 20;

  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  useEffect(() => {
    checkFirstLaunch();
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [selectedDate])
  );

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const checkFirstLaunch = async () => {
    const goalSet = await getStorageItem(STORAGE_KEYS.GOAL_SET, 'false');
    const unit = await getStorageItem(STORAGE_KEYS.UNIT_SYSTEM, UNIT_SYSTEMS.METRIC);
    setUnitSystem(unit);
    if (goalSet === 'false') {
      setShowGoalSetup(true);
      setShowGoalInput(false); // Start with info screen
    }
  };

  const loadData = async () => {
    try {
      const dateKey = selectedDate.toDateString();
      const intake = await getStorageItem(`intake_${dateKey}`, '0');
      const goal = await getStorageItem(STORAGE_KEYS.DAILY_GOAL, '10');
      const unit = await getStorageItem(STORAGE_KEYS.UNIT_SYSTEM, UNIT_SYSTEMS.METRIC);
      
      // Load entry history
      const historyKey = `entries_${dateKey}`;
      const historyJson = await getStorageItem(historyKey, '[]');
      const history = JSON.parse(historyJson);
      setEntryHistory(history);
      
      setTodayIntake(parseFloat(intake));
      setDailyGoal(parseFloat(goal));
      setUnitSystem(unit);

      const customJson = await getStorageItem(STORAGE_KEYS.CUSTOM_QUICK_ADD_ITEMS, '[]');
      let custom = [];
      try {
        custom = JSON.parse(customJson || '[]');
        if (!Array.isArray(custom)) custom = [];
      } catch (_) {}
      setCustomQuickAddItems(custom);

      const reasonsJson = await getStorageItem(STORAGE_KEYS.QUIT_SUGAR_REASONS, '[]');
      let reasons = [];
      try {
        reasons = JSON.parse(reasonsJson || '[]');
        if (!Array.isArray(reasons)) reasons = [];
      } catch (_) {}
      setQuitReasons(reasons);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveCustomQuickAddItems = async (list) => {
    setCustomQuickAddItems(list);
    await setStorageItem(STORAGE_KEYS.CUSTOM_QUICK_ADD_ITEMS, JSON.stringify(list));
  };

  const addCustomQuickAddItem = async () => {
    const name = newCustomName.trim();
    const amount = parseFloat(newCustomAmount);
    if (!name) {
      Alert.alert(t('track.invalidInput'), t('track.enterFoodName'));
      return;
    }
    if (isNaN(amount) || amount < 0) {
      Alert.alert(t('track.invalidInput'), t('track.enterValidNumber'));
      return;
    }
    const sugarGrams = amount; // Always grams on this screen
    const next = [
      ...customQuickAddItems,
      { id: Date.now().toString(), name, sugarGrams },
    ];
    await saveCustomQuickAddItems(next);
    setNewCustomName('');
    setNewCustomAmount('');
    setShowAddCustomModal(false);
  };

  const removeCustomQuickAddItem = async (id) => {
    const next = customQuickAddItems.filter((c) => c.id !== id);
    await saveCustomQuickAddItems(next);
  };

  const handleSetGoal = async () => {
    const goalValue = parseInt(goalInput);
    if (isNaN(goalValue) || goalValue <= 0) {
      Alert.alert(t('track.invalidInput'), t('track.enterValidNumber'));
      return;
    }

    const goalInGrams = goalValue;

    const MAX_GOAL_GRAMS = 50;
    if (goalInGrams > MAX_GOAL_GRAMS) {
      Alert.alert(
        t('track.maximumLimitExceeded'),
        `${t('track.maxDailyGoal')} ${MAX_GOAL_GRAMS}g ${t('track.maxDailyGoalDesc')}`
      );
      return;
    }

    await setStorageItem(STORAGE_KEYS.DAILY_GOAL, goalInGrams.toString());
    await setStorageItem(STORAGE_KEYS.GOAL_SET, 'true');
    await setStorageItem(STORAGE_KEYS.UNIT_SYSTEM, UNIT_SYSTEMS.METRIC);
    setDailyGoal(goalInGrams);
    setShowGoalSetup(false);
    setGoalInput('');
  };

  const addSugar = async (amount, itemName = 'Custom') => {
    try {
      const dateKey = selectedDate.toDateString();
      const subscribed = await isSubscribed();
      if (!subscribed) {
        const daysWithEntries = await getDaysWithEntriesSet();
        const alreadyHasThisDay = daysWithEntries.has(dateKey);
        if (!alreadyHasThisDay && daysWithEntries.size >= FREE_DAY_LIMIT) {
          const purchased = await presentPaywall();
          if (!purchased) return;
        }
      }

      // Convert to grams for storage
      const amountInGrams = unitSystem === UNIT_SYSTEMS.IMPERIAL 
        ? amount * 28.3495 
        : amount;

      const newIntake = todayIntake + amountInGrams;
      setTodayIntake(newIntake);
      
      await setStorageItem(`intake_${dateKey}`, newIntake.toString());
      
      // Add to entry history
      const historyKey = `entries_${dateKey}`;
      const historyJson = await getStorageItem(historyKey, '[]');
      const history = JSON.parse(historyJson);
      const newEntry = {
        id: Date.now().toString(),
        amount: amountInGrams,
        displayAmount: amount,
        itemName: itemName,
        timestamp: new Date().toISOString(),
      };
      history.push(newEntry);
      await setStorageItem(historyKey, JSON.stringify(history));
      setEntryHistory(history);
      await releaseFreezeForDate(dateKey);
      
      // Also update today's intake if selected date is today
      const today = new Date().toDateString();
      if (dateKey === today) {
        await setStorageItem(STORAGE_KEYS.TODAY_INTAKE, newIntake.toString());
        // Update streak and success days only for today
        await updateStreakAndSuccess(newIntake, dailyGoal);
      }

      setCustomAmount('');
    } catch (error) {
      console.error('Error adding sugar:', error);
      Alert.alert(t('common.error'), t('track.failedToSave'));
    }
  };

  const handleCustomAdd = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert(t('track.invalidInput'), t('track.enterValidNumber'));
      return;
    }
    const foodName = customFoodName.trim() || t('track.addCustom');
    addSugar(amount, foodName);
    setCustomAmount('');
    setCustomFoodName('');
  };

  const undoLastEntry = async () => {
    if (entryHistory.length === 0) {
      Alert.alert(t('track.noEntriesToUndo'), t('track.noEntriesToUndo'));
      return;
    }

    Alert.alert(
      t('track.undoLastEntry'),
      t('track.undoLastEntryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.undo'),
          style: 'destructive',
          onPress: async () => {
            const dateKey = selectedDate.toDateString();
            const historyKey = `entries_${dateKey}`;
            const updatedHistory = [...entryHistory];
            const lastEntry = updatedHistory.pop();
            
            const newIntake = Math.max(0, todayIntake - lastEntry.amount);
            setTodayIntake(newIntake);
            await setStorageItem(`intake_${dateKey}`, newIntake.toString());
            await setStorageItem(historyKey, JSON.stringify(updatedHistory));
            setEntryHistory(updatedHistory);
            await releaseFreezeForDate(dateKey);
            
            const today = new Date().toDateString();
            if (dateKey === today) {
              await setStorageItem(STORAGE_KEYS.TODAY_INTAKE, newIntake.toString());
              await updateStreakAndSuccess(newIntake, dailyGoal);
            }
          },
        },
      ]
    );
  };

  const deleteEntry = async (entryId) => {
    const entry = entryHistory.find(e => e.id === entryId);
    if (!entry) return;

    Alert.alert(
      t('track.deleteEntry'),
      t('track.deleteEntryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const dateKey = selectedDate.toDateString();
            const historyKey = `entries_${dateKey}`;
            const updatedHistory = entryHistory.filter(e => e.id !== entryId);
            
            const newIntake = Math.max(0, todayIntake - entry.amount);
            setTodayIntake(newIntake);
            await setStorageItem(`intake_${dateKey}`, newIntake.toString());
            await setStorageItem(historyKey, JSON.stringify(updatedHistory));
            setEntryHistory(updatedHistory);
            await releaseFreezeForDate(dateKey);
            
            const today = new Date().toDateString();
            if (dateKey === today) {
              await setStorageItem(STORAGE_KEYS.TODAY_INTAKE, newIntake.toString());
              await updateStreakAndSuccess(newIntake, dailyGoal);
            }
          },
        },
      ]
    );
  };

  const editEntry = async (entryId, newDisplayAmount) => {
    const entry = entryHistory.find(e => e.id === entryId);
    if (!entry) return;

    // Convert to grams for storage (always store in grams)
    const amountInGrams = unitSystem === UNIT_SYSTEMS.IMPERIAL 
      ? newDisplayAmount * 28.3495 
      : newDisplayAmount;

    const difference = amountInGrams - entry.amount;
    const newIntake = todayIntake + difference;
    
    const dateKey = selectedDate.toDateString();
    const historyKey = `entries_${dateKey}`;
    const updatedHistory = entryHistory.map(e => 
      e.id === entryId 
        ? { ...e, amount: amountInGrams, displayAmount: newDisplayAmount }
        : e
    );
    
    setTodayIntake(newIntake);
    await setStorageItem(`intake_${dateKey}`, newIntake.toString());
    await setStorageItem(historyKey, JSON.stringify(updatedHistory));
    setEntryHistory(updatedHistory);
    await releaseFreezeForDate(dateKey);
    
    const today = new Date().toDateString();
    if (dateKey === today) {
      await setStorageItem(STORAGE_KEYS.TODAY_INTAKE, newIntake.toString());
      await updateStreakAndSuccess(newIntake, dailyGoal);
    }
  };

  const resetToday = async () => {
    Alert.alert(
      t('track.resetToday'),
      t('track.resetTodayConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'),
          style: 'destructive',
          onPress: async () => {
            setTodayIntake(0);
            setEntryHistory([]);
            const dateKey = selectedDate.toDateString();
            await setStorageItem(`intake_${dateKey}`, '0');
            await setStorageItem(`entries_${dateKey}`, '[]');
            
            // Also update today's intake if selected date is today
            const today = new Date().toDateString();
            if (dateKey === today) {
              await setStorageItem(STORAGE_KEYS.TODAY_INTAKE, '0');
            }
          },
        },
      ]
    );
  };

  // Convert for display
  const displayIntake = unitSystem === UNIT_SYSTEMS.IMPERIAL 
    ? todayIntake * 0.035274 
    : todayIntake;
  const displayGoal = unitSystem === UNIT_SYSTEMS.IMPERIAL 
    ? dailyGoal * 0.035274 
    : dailyGoal;

  const remaining = displayGoal - displayIntake;
  
  // Hide "X grams remaining" on any day (today or previous) when there are no user entries
  const hasNoEntries = entryHistory.length === 0;
  const shouldHideRemaining = hasNoEntries;
  const percentage = displayGoal > 0 ? (displayIntake / displayGoal) * 100 : 0;
  const unitLabel = getUnitLabel(unitSystem, t);

  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createTrackStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={c.gradient}
        style={[styles.fixedHeader, { paddingTop: insets.top + 5, height: insets.top + 95 }]}
      >
        <Text style={styles.headerTitle}>{t('track.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('track.subtitle')}</Text>
      </LinearGradient>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent, 
            { 
              paddingTop: insets.top + 95,
              paddingBottom: Math.max(insets.bottom, 20) + 80, // Tab bar height + safe area
            }
          ]}
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={true}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
        {/* Date Scroller */}
        <View style={styles.dateScroller}>
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(selectedDate.getDate() - 1);
              setSelectedDate(newDate);
            }}
          >
            <Ionicons name="chevron-back" size={24} color={c.primary} />
          </TouchableOpacity>
          
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>
              {selectedDate.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ja' ? 'ja-JP' : 'en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: selectedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </Text>
            {selectedDate.toDateString() === new Date().toDateString() && (
              <Text style={styles.todayLabel}>{t('common.today')}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(selectedDate.getDate() + 1);
              // Don't allow future dates
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              if (newDate <= today) {
                setSelectedDate(newDate);
              }
            }}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={selectedDate.toDateString() === new Date().toDateString() ? c.disabled : c.primary} 
            />
          </TouchableOpacity>
        </View>
        {/* Today's Summary */}
        <TouchableOpacity 
          style={styles.summaryCard}
          onPress={() => {
            if (entryHistory.length > 0) {
              setShowHistoryModal(true);
            }
          }}
          activeOpacity={entryHistory.length > 0 ? 0.9 : 1}
          disabled={entryHistory.length === 0}
        >
          <View style={styles.summaryTitleRow}>
            <Text style={styles.summaryTitle}>{t('track.todaySugarIntake')}</Text>
            <Ionicons 
              name="pencil" 
              size={20} 
              color={entryHistory.length === 0 ? c.disabled : c.primary} 
            />
          </View>
          {selectedDate.toDateString() === new Date().toDateString() &&
            quitReasons.length > 0 && (
              <Text style={[styles.motivationReason, { color: c.primary }]} numberOfLines={2}>
                {quitReasons[dayOfYear(selectedDate) % quitReasons.length]}
              </Text>
            )}
          {entryHistory.length === 0 ? (
            <Text style={styles.summaryEmptyText}>{t('track.noEntries')}</Text>
          ) : (
            <>
              <Text style={styles.summaryAmount}>
                {Math.round(displayIntake)}{unitLabel} / {Math.round(displayGoal)}{unitLabel}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: remaining >= 0 ? c.success : c.danger,
                    },
                  ]}
                />
              </View>
            </>
          )}
          {!shouldHideRemaining && (
            <Text
              style={[
                styles.remainingText,
                { color: remaining >= 0 ? c.success : c.danger },
              ]}
            >
            {remaining >= 0
              ? `${Math.round(remaining)}${unitLabel} ${t('common.remaining')}`
              : `${Math.round(Math.abs(remaining))}${unitLabel} ${t('common.over')}`}
            </Text>
          )}
        </TouchableOpacity>

        {/* Custom Amount */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: '#000' }]}>{t('track.customAmount')}</Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => {
                Alert.alert(
                  t('track.howToFindSugar'),
                  t('track.howToFindSugarInfo'),
                  [{ text: t('common.gotIt'), style: 'default' }]
                );
              }}
            >
              <Ionicons name="information-circle-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={styles.customInputContainer}>
            <TextInput
              style={styles.customInput}
              placeholder={unitSystem === UNIT_SYSTEMS.METRIC ? t('track.enterGrams') : t('track.enterOunces')}
              placeholderTextColor={c.placeholder}
              keyboardType="decimal-pad"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCustomAdd}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.customFoodInput}
            placeholder={t('track.foodName')}
            placeholderTextColor={c.placeholder}
            value={customFoodName}
            onChangeText={setCustomFoodName}
            maxLength={50}
          />
        </View>

        {/* Quick Add */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.quickAddTitle]}>{t('track.quickAdd')}</Text>
          <View style={styles.itemsGrid}>
            {customQuickAddItems.length < MAX_CUSTOM_QUICK_ADD && (
              <TouchableOpacity
                style={styles.itemCardAdd}
                onPress={() => setShowAddCustomModal(true)}
              >
                <Ionicons name="add-circle-outline" size={28} color={c.primary} />
                <Text style={styles.itemCardAddText}>{t('track.addCustom')}</Text>
              </TouchableOpacity>
            )}
            {getLocalizedFoodItems(unitSystem, t).map((item, index) => (
              <TouchableOpacity
                key={`common-${index}`}
                style={styles.itemCard}
                onPress={() => addSugar(item.sugar, item.name)}
              >
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSugar}>
                  {formatValue(item.sugar, unitSystem, 1, t)}
                </Text>
              </TouchableOpacity>
            ))}
            {customQuickAddItems.map((c) => {
              const displayAmount = unitSystem === UNIT_SYSTEMS.IMPERIAL
                ? c.sugarGrams * 0.035274
                : c.sugarGrams;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.itemCard, styles.itemCardCustom]}
                  onPress={() => addSugar(displayAmount, c.name)}
                  onLongPress={() => {
                    Alert.alert(
                      t('track.removeFromQuickAdd'),
                      `${t('track.removeItem')} "${c.name}"?`,
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('track.removeItem'),
                          style: 'destructive',
                          onPress: () => removeCustomQuickAddItem(c.id),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.itemName} numberOfLines={2}>{c.name}</Text>
                  <Text style={styles.itemSugar}>
                    {formatValue(displayAmount, unitSystem, 1, t)}
                  </Text>
                  <View style={styles.itemCardCustomBadge}>
                    <Ionicons name="create-outline" size={10} color="#999" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Entry History Modal */}
      <AnimatedModal
        visible={showHistoryModal}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowHistoryModal(false)}
          />
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>{t('track.entryHistory')}</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {entryHistory.length === 0 ? (
              <View style={styles.historyListEmpty}>
                <Text style={styles.noEntriesText}>{t('track.noEntriesHistory')}</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList}>
                {entryHistory
                  .slice()
                  .reverse()
                  .map((entry) => {
                    // Use stored displayAmount if available, otherwise convert from grams
                    let displayAmount = entry.displayAmount;
                    if (!displayAmount || displayAmount === undefined) {
                      displayAmount = unitSystem === UNIT_SYSTEMS.IMPERIAL
                        ? entry.amount * 0.035274
                        : entry.amount;
                    }
                    
                    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                    
                    return (
                      <View key={entry.id} style={styles.historyItem}>
                        <View style={styles.historyItemInfo}>
                          <Text style={styles.historyItemName}>{entry.itemName}</Text>
                          <Text style={styles.historyItemTime}>{time}</Text>
                          <Text style={styles.historyItemAmount}>
                            {formatValue(displayAmount, unitSystem, 1, t)}
                          </Text>
                        </View>
                        <View style={styles.historyItemActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => {
                            setEditingEntry(entry);
                            setEditAmount(displayAmount.toFixed(1));
                            setShowHistoryModal(false);
                          }}
                        >
                          <Ionicons name="pencil" size={18} color={c.primary} />
                        </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteEntry(entry.id)}
                          >
                            <Ionicons name="trash" size={18} color={c.danger} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            )}
          </View>
        </View>
      </AnimatedModal>

      {/* Edit Entry Modal */}
      <AnimatedModal
        visible={editingEntry !== null}
        onRequestClose={() => { setEditingEntry(null); setEditAmount(''); }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => { setEditingEntry(null); setEditAmount(''); }}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('track.editEntry')}</Text>
            <Text style={styles.modalSubtitle}>
              {editingEntry?.itemName}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={`${t('track.enterAmount')} ${getUnitLabel(unitSystem, t)}`}
              placeholderTextColor={c.placeholder}
              keyboardType="decimal-pad"
              value={editAmount}
              onChangeText={setEditAmount}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: c.textMuted, marginRight: 10 }]}
                onPress={() => {
                  setEditingEntry(null);
                  setEditAmount('');
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  const newAmount = parseFloat(editAmount);
                  if (!isNaN(newAmount) && newAmount > 0 && editingEntry) {
                    editEntry(editingEntry.id, newAmount);
                    setEditingEntry(null);
                    setEditAmount('');
                  } else {
                    Alert.alert(t('track.invalidInput'), t('track.enterValidNumber'));
                  }
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AnimatedModal>

      {/* Add Custom Quick Add Modal */}
      <AnimatedModal
        visible={showAddCustomModal}
        onRequestClose={() => {
          setShowAddCustomModal(false);
          setNewCustomName('');
          setNewCustomAmount('');
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowAddCustomModal(false);
                setNewCustomName('');
                setNewCustomAmount('');
              }}
            />
            <View style={styles.modalContent}>
              <Text style={[styles.modalTitle, styles.addCustomModalTitle]}>{t('track.addCustomQuickAdd')}</Text>
              <Text style={styles.modalSubtitle}>
                {t('track.addCustomQuickAddDesc')}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('track.foodNamePlaceholder')}
                placeholderTextColor={c.placeholder}
                value={newCustomName}
                onChangeText={setNewCustomName}
                maxLength={40}
                autoCapitalize="words"
              />
              <TextInput
                style={styles.modalInput}
                placeholder={`${t('track.sugarIn')} ${getUnitLabel(UNIT_SYSTEMS.METRIC, t)}`}
                placeholderTextColor={c.placeholder}
                keyboardType="decimal-pad"
                value={newCustomAmount}
                onChangeText={setNewCustomAmount}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: c.textMuted, marginRight: 10 }]}
                  onPress={() => {
                    setShowAddCustomModal(false);
                    setNewCustomName('');
                    setNewCustomAmount('');
                  }}
                >
                  <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={addCustomQuickAddItem}
                >
                  <Text style={styles.modalButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
              </View>
            </View>
        </TouchableWithoutFeedback>
      </AnimatedModal>

      {/* Sugar Intake Info Modal (First Screen) */}
      <AnimatedModal
        visible={showGoalSetup && !showGoalInput}
        onRequestClose={() => setShowGoalSetup(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowGoalSetup(false)}
          />
          <View style={styles.goalSetupModalContent}>
            <Text style={styles.goalSetupModalTitle}>{t('track.sugarIntake')}</Text>
            
            <ScrollView 
              style={styles.goalSetupScrollView} 
              contentContainerStyle={styles.goalSetupScrollContent}
              showsVerticalScrollIndicator={true}
              {...(Platform.OS === 'ios' && { indicatorStyle: 'black' })}
            >
              <Text style={styles.goalSetupIntroText}>
                {t('track.sugarIntakeIntro')}
              </Text>

              <View style={styles.goalSetupInfoSection}>
                <Text style={styles.goalSetupSectionTitle}>{t('track.healthyTargets')}</Text>
                <View style={styles.goalSetupBulletList}>
                  <Text style={styles.goalSetupBulletItem}>
                    <Text style={styles.goalSetupBulletPoint}>• </Text>
                    <Text style={styles.goalSetupBoldText}>{t('track.excellent')}</Text> 0 to 5 g
                  </Text>
                  <Text style={styles.goalSetupBulletItem}>
                    <Text style={styles.goalSetupBulletPoint}>• </Text>
                    <Text style={styles.goalSetupBoldText}>{t('track.veryGood')}</Text> under 10 g
                  </Text>
                  <Text style={styles.goalSetupBulletItem}>
                    <Text style={styles.goalSetupBulletPoint}>• </Text>
                    <Text style={styles.goalSetupBoldText}>{t('track.optimal')}</Text> under 15 g
                  </Text>
                  <Text style={styles.goalSetupBulletItem}>
                    <Text style={styles.goalSetupBulletPoint}>• </Text>
                    <Text style={styles.goalSetupBoldText}>{t('track.higherLimit')}</Text> 15 to 25 g
                  </Text>
                </View>
                <Text style={styles.goalSetupWarningText}>
                  {t('track.healthyTargetsWarning')}
                </Text>
              </View>

              <View style={styles.goalSetupInfoSection}>
                <Text style={styles.goalSetupSectionTitle}>{t('track.addedSugarIncludes')}</Text>
                <View style={styles.goalSetupBulletList}>
                  <Text style={styles.goalSetupBulletItem}>
                    {t('track.addedSugarItems')}
                  </Text>
                </View>
              </View>

              <View style={styles.goalSetupInfoSection}>
                <Text style={styles.goalSetupSectionTitle}>{t('track.maximumLimits')}</Text>
                <Text style={styles.goalSetupSectionText}>
                  {t('track.accordingToHealthOrgs')}
                </Text>
                <View style={styles.goalSetupBulletList}>
                  <Text style={styles.goalSetupBulletItem}>
                    <Text style={styles.goalSetupBulletPoint}>• </Text>
                    <Text style={styles.goalSetupBoldText}>{t('track.who')}</Text> {t('track.whoLimit')}{'\n'}
                    <Text style={styles.goalSetupIndentText}>{t('track.whoBetter')}</Text>
                  </Text>
                  <Text style={styles.goalSetupBulletItem}>
                    <Text style={styles.goalSetupBulletPoint}>• </Text>
                    <Text style={styles.goalSetupBoldText}>{t('track.aha')}</Text>{'\n'}
                    <Text style={styles.goalSetupIndentText}>{t('track.ahaWomen')}</Text>{'\n'}
                    <Text style={styles.goalSetupIndentText}>{t('track.ahaMen')}</Text>
                  </Text>
                </View>
                <Text style={styles.goalSetupWarningText}>
                  {t('track.safetyLimits')}
                </Text>
              </View>

              <View style={styles.goalSetupInfoSection}>
                <Text style={styles.goalSetupNoteTitle}>{t('track.note')}</Text>
                <Text style={styles.goalSetupNoteText}>
                  {t('track.naturalSugarNote')}
                </Text>
                <Text style={[styles.goalSetupNoteText, { marginTop: 10 }]}>
                  {t('track.fruitJuiceNote')}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.goalSetupModalButtons}>
              <TouchableOpacity
                style={[styles.goalSetupModalButton, styles.goalSetupModalButtonPrimary]}
                onPress={() => setShowGoalInput(true)}
              >
                <Text style={styles.goalSetupModalButtonText}>{t('common.gotIt')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </AnimatedModal>

      {/* Goal Setup Modal (Second Screen) */}
      <AnimatedModal
        visible={showGoalSetup && showGoalInput}
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowGoalSetup(false);
          setShowGoalInput(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowGoalSetup(false);
                setShowGoalInput(false);
              }}
            />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.goalSetupModalContent}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View>
                    <Text style={styles.goalSetupModalTitle}>{t('track.setDailyGoal')}</Text>
                    
                    <View style={styles.goalSetupInputSection}>
                      <Text style={styles.goalSetupInputLabel}>{t('track.howMuchSugar')}</Text>
                      <Text style={styles.goalSetupInputHint}>
                        ✅ {t('track.recommended')}
                      </Text>
                      <TextInput
                        style={styles.goalSetupInput}
                        placeholder={t('track.enterGoalInGrams')}
                        placeholderTextColor={c.placeholder}
                        keyboardType="number-pad"
                        value={goalInput}
                        onChangeText={(text) => {
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setGoalInput(numericValue);
                        }}
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>

                <View style={styles.goalSetupModalButtons}>
                  <TouchableOpacity
                    style={[styles.goalSetupModalButton, styles.goalSetupModalButtonPrimary]}
                    onPress={handleSetGoal}
                  >
                    <Text style={styles.goalSetupModalButtonText}>{t('track.setGoal')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </AnimatedModal>
    </View>
  );
}

function createTrackStyles(theme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    fixedHeader: {
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
      paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      justifyContent: 'flex-end',
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 20 }, // Base padding, actual padding includes tab bar + safe area
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: c.headerText, marginBottom: 5 },
    headerSubtitle: { fontSize: 16, color: c.headerText, opacity: 0.9 },
    content: { padding: 20 },
    summaryCard: {
      backgroundColor: c.surface, borderRadius: 15, padding: 20, marginBottom: 25, alignItems: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    summaryTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
    summaryTitle: { fontSize: 18, color: c.textSecondary },
    motivationReason: { fontSize: 14, fontStyle: 'italic', marginBottom: 8, textAlign: 'center', width: '100%' },
    summaryAmount: { fontSize: 32, fontWeight: 'bold', color: c.text, marginBottom: 15 },
    summaryEmptyText: { textAlign: 'center', color: c.textMuted, fontSize: 16, marginTop: 4, marginBottom: 15 },
    progressBar: { width: '100%', height: 20, backgroundColor: c.border, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
    progressFill: { height: '100%', borderRadius: 10 },
    remainingText: { fontSize: 16, fontWeight: '500' },
    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: c.text },
    quickAddTitle: { marginBottom: 5 },
    infoButton: { padding: 5 },
    itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    itemCard: {
      width: '48%', backgroundColor: c.surface, borderRadius: 12, padding: 15, marginBottom: 12, alignItems: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    itemName: { fontSize: 14, color: c.text, textAlign: 'center', marginBottom: 8 },
    itemSugar: { fontSize: 18, fontWeight: 'bold', color: c.primary },
    itemCardCustom: { borderWidth: 1, borderColor: c.borderLight, position: 'relative' },
    itemCardCustomBadge: { position: 'absolute', top: 6, right: 6 },
    itemCardAdd: {
      width: '48%', backgroundColor: c.primaryAdd, borderRadius: 12, padding: 15, marginBottom: 12,
      alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.primary, borderStyle: 'dashed',
    },
    itemCardAddText: { fontSize: 14, fontWeight: '600', color: c.primary, marginTop: 6 },
    customInputContainer: {
      flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 5,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    customInput: { flex: 1, padding: 15, fontSize: 16, color: c.text },
    customFoodInput: {
      backgroundColor: c.surface, borderRadius: 12, padding: 15, fontSize: 16, color: c.text, marginTop: 10,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
    },
    addButton: { backgroundColor: c.primary, borderRadius: 10, padding: 15, justifyContent: 'center', alignItems: 'center' },
    historyModalContent: { backgroundColor: c.surface, borderRadius: 20, width: '90%', maxHeight: '80%', padding: 0, overflow: 'hidden' },
    historyModalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    historyModalTitle: { fontSize: 22, fontWeight: 'bold', color: c.text },
    closeButton: { padding: 5 },
    historyList: { maxHeight: 400, padding: 15 },
    historyListEmpty: { padding: 15 },
    noEntriesText: { textAlign: 'center', color: c.textMuted, fontSize: 16 },
    historyItem: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, marginBottom: 10,
      backgroundColor: c.background, borderRadius: 10,
    },
    historyItemInfo: { flex: 1 },
    historyItemName: { fontSize: 16, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    historyItemTime: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
    historyItemAmount: { fontSize: 14, color: c.primary, fontWeight: '600' },
    historyItemActions: { flexDirection: 'row', gap: 10 },
    editButton: { padding: 8 },
    deleteButton: { padding: 8 },
    dateScroller: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface,
      borderRadius: 15, padding: 15, marginBottom: 20,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    dateNavButton: { padding: 8 },
    dateDisplay: { flex: 1, alignItems: 'center' },
    dateText: { fontSize: 18, fontWeight: 'bold', color: c.text },
    todayLabel: { fontSize: 12, color: c.primary, marginTop: 4, fontWeight: '500' },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: c.surface, borderRadius: 20, padding: 30, width: '85%', maxWidth: 400 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: c.text, marginBottom: 10, textAlign: 'center' },
    addCustomModalTitle: { fontSize: 20 },
    modalSubtitle: { fontSize: 16, color: c.textSecondary, marginBottom: 20, textAlign: 'center' },
    modalInput: { borderWidth: 2, borderColor: c.primary, borderRadius: 10, padding: 15, fontSize: 18, marginBottom: 20, textAlign: 'center', color: c.text },
    modalButtons: { flexDirection: 'row', justifyContent: 'center' },
    modalButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
    modalButtonPrimary: { backgroundColor: c.primary },
    modalButtonText: { color: c.surface, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  goalSetupModalContent: { backgroundColor: c.surface, borderRadius: 20, width: '90%', maxHeight: '85%', padding: 20, marginTop: -50 },
  goalSetupModalTitle: { fontSize: 24, fontWeight: 'bold', color: c.text, marginBottom: 5, textAlign: 'center' },
  goalSetupScrollView: { maxHeight: 500 },
  goalSetupScrollContent: { paddingRight: 10 },
  goalSetupIntroText: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 25 },
  goalSetupInfoSection: { marginBottom: 25 },
  goalSetupSectionTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 12 },
  goalSetupSectionText: { fontSize: 16, color: c.textSecondary, marginBottom: 10, lineHeight: 24 },
  goalSetupBulletList: { marginLeft: 5, marginBottom: 12 },
  goalSetupBulletItem: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 6 },
  goalSetupBulletPoint: { fontSize: 18, color: c.text },
  goalSetupIndentText: { marginLeft: 20, fontSize: 16, color: c.textSecondary },
  goalSetupBoldText: { fontWeight: 'bold', color: c.text },
  goalSetupWarningText: { fontSize: 16, color: c.text, fontStyle: 'italic', marginTop: 8, lineHeight: 24 },
  goalSetupTargetList: { marginLeft: 5, marginBottom: 12 },
  goalSetupTargetItem: { fontSize: 16, color: c.text, lineHeight: 24, marginBottom: 6 },
  goalSetupNoteTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 10 },
  goalSetupNoteText: { fontSize: 16, color: c.textSecondary, lineHeight: 24 },
  goalSetupInputSection: { marginTop: 20, marginBottom: 10 },
  goalSetupInputLabel: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 8 },
  goalSetupInputHint: { fontSize: 17, color: c.textSecondary, marginBottom: 15 },
  goalSetupInput: { borderWidth: 2, borderColor: c.primary, borderRadius: 10, padding: 15, fontSize: 18, textAlign: 'center', color: c.text },
  goalSetupModalButtons: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  goalSetupModalButton: { paddingVertical: 15, paddingHorizontal: 40, borderRadius: 10 },
  goalSetupModalButtonPrimary: { backgroundColor: c.primary },
  goalSetupModalButtonText: { color: c.surface, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  });
}
