import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import AnimatedModal from '../../utils/AnimatedModal';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../../utils/storage';
import { UNIT_SYSTEMS, getUnitLabel } from '../../utils/units';
import { getStreak, getSuccessDays, getTotalTrackingDays, getTrackingStreak, getFreezeUsageForMonth, getFreezeStatusForDate, useFreezeForDate } from '../../utils/stats';
import { ACHIEVEMENTS, checkAchievements } from '../../utils/achievements';
import { getDaysInMonth, getFirstDayOfMonth, formatDateKey, getMonthName } from '../../utils/calendar';
import { useTheme } from '../../utils/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ProgressScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const c = theme.colors;
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);
  const [streak, setStreak] = useState(0);
  const [successDays, setSuccessDays] = useState(0);
  const [trackingDays, setTrackingDays] = useState(0);
  const [trackingStreak, setTrackingStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [unitSystem, setUnitSystem] = useState(UNIT_SYSTEMS.METRIC);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [freezeUsage, setFreezeUsage] = useState({ used: 0, limit: 2 });
  const [freezeStatusForSelectedDay, setFreezeStatusForSelectedDay] = useState(null);
  const [weekStartDay, setWeekStartDay] = useState(0); // 0 = Sunday, 1 = Monday

  useEffect(() => {
    loadData();
    loadWeekStartDay();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadWeekStartDay();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      loadCalendarData();
    }, [])
  );

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth, dailyGoal]);

  useEffect(() => {
    if (showDayModal && selectedDayData && !selectedDayData.hasData) {
      getFreezeStatusForDate(selectedDayData.date).then(setFreezeStatusForSelectedDay);
    } else {
      setFreezeStatusForSelectedDay(null);
    }
  }, [showDayModal, selectedDayData]);

  const loadData = async () => {
    const currentStreak = await getStreak();
    const currentSuccessDays = await getSuccessDays();
    const totalTrackingDays = await getTotalTrackingDays();
    const trackingStreak = await getTrackingStreak();
    const freeze = await getFreezeUsageForMonth();
    const goal = await getStorageItem(STORAGE_KEYS.DAILY_GOAL, '10');
    const unit = await getStorageItem(STORAGE_KEYS.UNIT_SYSTEM, UNIT_SYSTEMS.METRIC);
    const achievements = await getStorageItem(STORAGE_KEYS.ACHIEVEMENTS, '[]');

    setStreak(currentStreak);
    setSuccessDays(currentSuccessDays);
    setTrackingDays(totalTrackingDays);
    setTrackingStreak(trackingStreak);
    setFreezeUsage(freeze);
    setDailyGoal(parseFloat(goal));
    setUnitSystem(unit);
    
    const parsedAchievements = JSON.parse(achievements);
    setUnlockedAchievements(parsedAchievements);
    
    // Check for new achievements
    const newOnes = checkAchievements(
      currentStreak, 
      currentSuccessDays, 
      parsedAchievements,
      totalTrackingDays,
      trackingStreak
    );
    if (newOnes.length > 0) {
      setNewAchievements(newOnes);
      // Save new achievements
      const updated = [...parsedAchievements, ...newOnes.map(a => a.id)];
      await setStorageItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(updated));
      setUnlockedAchievements(updated);
    }
  };

  const getAchievementProgress = (achievement) => {
    if (unlockedAchievements.includes(achievement.id)) {
      return null; // Already unlocked
    }

    const { type, value } = achievement.requirement;
    let current = 0;
    
    if (type === 'streak') {
      current = streak;
    } else if (type === 'successDays') {
      current = successDays;
    } else if (type === 'trackingDays') {
      current = trackingDays;
    } else if (type === 'trackingStreak') {
      current = trackingStreak;
    }

    const remaining = value - current;
    if (remaining <= 0) {
      return null; // Should be unlocked
    }

    if (type === 'streak' || type === 'trackingStreak') {
      const dayText = remaining === 1 ? t('common.day') : t('common.days');
      return `${remaining} ${dayText} ${t('common.toUnlock')}`;
    } else {
      const dayText = remaining === 1 ? t('common.day') : t('common.days');
      return `${remaining} ${dayText} ${t('common.remaining')}`;
    }
  };

  const loadWeekStartDay = async () => {
    const weekStart = await getStorageItem(STORAGE_KEYS.WEEK_START_DAY, '0');
    setWeekStartDay(parseInt(weekStart, 10));
  };

  const loadCalendarData = async () => {
    try {
      const data = {};
      const daysInMonth = getDaysInMonth(currentMonth);
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      let freezeDates = [];
      try {
        const raw = await getStorageItem(STORAGE_KEYS.STREAK_FREEZE_DATES, '[]');
        freezeDates = JSON.parse(raw || '[]');
        if (!Array.isArray(freezeDates)) freezeDates = [];
      } catch {
        freezeDates = [];
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        let intake = await getStorageItem(`intake_${dateKey}`, null);
        const entriesKey = `entries_${dateKey}`;
        const entriesJson = await getStorageItem(entriesKey, '[]');
        const entries = JSON.parse(entriesJson);
        const hasEntries = entries.length > 0;
        
        if (intake === null && hasEntries) {
          intake = entries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0).toString();
        }
        
        if (intake !== null || hasEntries) {
          const intakeValue = parseFloat(intake || '0');
          data[dateKey] = {
            intake: intakeValue,
            success: intakeValue <= dailyGoal,
            date: date,
            hasData: true,
          };
        } else {
          const isFrozen = freezeDates.includes(dateKey);
          data[dateKey] = {
            intake: 0,
            success: false,
            date: date,
            hasData: false,
            isFrozen,
          };
        }
      }

      setCalendarData(data);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const getMonthlyStats = () => {
    let underGoal = 0;
    let overGoal = 0;
    let noData = 0;

    Object.values(calendarData).forEach((dayData) => {
      if (!dayData.hasData) {
        // No entries at all - count as no data
        noData++;
      } else {
        // Has entries (even if intake is 0) - count based on success
        if (dayData.success) {
          underGoal++;
        } else {
          overGoal++;
        }
      }
    });

    return { underGoal, overGoal, noData };
  };

  const changeMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + direction);
    
    // Calculate 5 years ago from today (start of that month)
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);
    fiveYearsAgo.setMonth(0); // January
    fiveYearsAgo.setDate(1);
    
    // Normalize dates to start of month for comparison
    const newMonthStart = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Prevent going back more than 5 years
    if (direction < 0 && newMonthStart < fiveYearsAgo) {
      return; // Don't allow going back more than 5 years
    }
    
    // Prevent going to future dates
    if (direction > 0 && newMonthStart > todayMonthStart) {
      return; // Don't allow going to future
    }
    
    setCurrentMonth(newDate);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth, weekStartDay);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = new Date();

    const days = [];
    const locale = i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ja' ? 'ja-JP' : 'en-US';
    const weekDays = [];
    
    // Generate week days based on week start day
    const startDate = weekStartDay === 1 ? 1 : 0; // Monday = 1, Sunday = 0
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = (startDate + i) % 7;
      const date = new Date(2024, 0, 7 + dayOfWeek); // Get a date for each day of week
      weekDays.push(date.toLocaleDateString(locale, { weekday: 'short' }));
    }

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      const dayData = calendarData[dateKey];
      const isToday = date.toDateString() === today.toDateString();
      
      let dayColor = c.chartNone;
      let dayStyle = styles.calendarDay;
      
      if (dayData && dayData.hasData) {
        dayColor = dayData.success ? c.chartUnder : c.chartOver;
        dayStyle = [styles.calendarDay, styles.calendarDayWithData, { backgroundColor: dayColor }];
      } else if (dayData && dayData.isFrozen) {
        dayColor = c.freeze;
        dayStyle = [styles.calendarDay, styles.calendarDayWithData, { backgroundColor: dayColor }];
      } else if (isToday) {
        dayStyle = [styles.calendarDay, styles.calendarDayToday];
      }

      days.push(
        <TouchableOpacity
          key={day}
          style={dayStyle}
          onPress={async () => {
            if (!dayData) return;
            const dayPayload = {
              date: dayData.date,
              intake: dayData.intake,
              success: dayData.success,
              hasData: dayData.hasData,
              isFrozen: dayData.isFrozen,
            };
            if (dayData.hasData) {
              setSelectedDayData(dayPayload);
              setShowDayModal(true);
            } else {
              const freezeStatus = await getFreezeStatusForDate(dayData.date);
              setFreezeStatusForSelectedDay(freezeStatus);
              setSelectedDayData(dayPayload);
              setShowDayModal(true);
            }
          }}
        >
          <Text
            style={[
              styles.calendarDayText,
              (dayData && (dayData.hasData || dayData.isFrozen)) && styles.calendarDayTextWithData,
              isToday && !dayData?.hasData && !dayData?.isFrozen && styles.calendarDayTextToday,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        {/* Week day headers */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.weekDayHeader}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar grid */}
        <View style={styles.calendarGrid}>{days}</View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createProgressStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={c.gradient}
        style={[styles.fixedHeader, { paddingTop: insets.top + 5, height: insets.top + 95 }]}
      >
        <Text style={styles.headerTitle}>{t('progress.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('progress.subtitle')}</Text>
      </LinearGradient>

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
      >
        <View style={styles.content}>
        {/* All-time days under limit */}
        <View style={styles.daysUnderLimitCard}>
          <Ionicons name="ribbon" size={36} color={c.primary} />
          <Text style={styles.daysUnderLimitText}>
            <Text style={styles.daysUnderLimitNumber}>{successDays}</Text>
            <Text style={styles.daysUnderLimitLabel}> {t('progress.daysUnderLimit')}</Text>
            <Text style={styles.daysUnderLimitSub}> · {t('progress.allTime')}</Text>
          </Text>
        </View>

        {/* Streak freezes */}
        <View style={styles.freezeRow}>
          <Ionicons name="snow" size={18} color={c.freeze} />
          <Text style={styles.freezeText}>
            {t('progress.streakFreezes')} {freezeUsage.used}/{freezeUsage.limit} {t('progress.thisMonth')}
          </Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() =>
              Alert.alert(
                t('progress.streakFreezesInfo'),
                t('progress.streakFreezesDesc'),
                [{ text: t('common.gotIt'), style: 'default' }]
              )
            }
          >
            <Ionicons name="information-circle-outline" size={20} color={c.freeze} />
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={styles.card}>
          {(() => {
            const today = new Date();
            const fiveYearsAgo = new Date(today);
            fiveYearsAgo.setFullYear(today.getFullYear() - 5);
            fiveYearsAgo.setMonth(0);
            fiveYearsAgo.setDate(1);
            const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const isAtFiveYearLimit = currentMonthStart <= fiveYearsAgo;
            const isAtToday = currentMonthStart >= todayMonthStart;
            
            return (
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  style={styles.monthNavButton}
                  onPress={() => changeMonth(-1)}
                  disabled={isAtFiveYearLimit}
                >
                  <Ionicons 
                    name="chevron-back" 
                    size={24} 
                    color={isAtFiveYearLimit ? c.disabled : c.primary} 
                  />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {currentMonth.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ja' ? 'ja-JP' : 'en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  style={styles.monthNavButton}
                  onPress={() => changeMonth(1)}
                  disabled={isAtToday}
                >
                  <Ionicons 
                    name="chevron-forward" 
                    size={24} 
                    color={isAtToday ? c.disabled : c.primary} 
                  />
                </TouchableOpacity>
              </View>
            );
          })()}
          
          {renderCalendar()}
          
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: c.chartUnder }]} />
              <Text style={styles.legendText}>{t('progress.underLimit')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: c.chartOver }]} />
              <Text style={styles.legendText}>{t('progress.overLimit')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: c.freeze }]} />
              <Text style={styles.legendText}>{t('progress.frozen')}</Text>
            </View>
          </View>
        </View>

        {/* Monthly Stats */}
        {(() => {
          const monthlyStats = getMonthlyStats();
          return (
            <View style={styles.monthlyStatsCard}>
              <Text style={styles.monthlyStatsTitle}>{t('progress.thisMonthTitle')}</Text>
              <View style={styles.monthlyStatsRow}>
                <View style={styles.monthlyStatItem}>
                  <View style={[styles.monthlyStatColor, { backgroundColor: c.chartUnder }]} />
                  <Text style={styles.monthlyStatNumber}>{monthlyStats.underGoal}</Text>
                  <Text style={styles.monthlyStatLabel}>{t('progress.underLimit')}</Text>
                </View>
                <View style={styles.monthlyStatItem}>
                  <View style={[styles.monthlyStatColor, { backgroundColor: c.chartOver }]} />
                  <Text style={styles.monthlyStatNumber}>{monthlyStats.overGoal}</Text>
                  <Text style={styles.monthlyStatLabel}>{t('progress.overLimit')}</Text>
                </View>
                <View style={styles.monthlyStatItem}>
                  <View style={[styles.monthlyStatColor, { backgroundColor: c.chartNone }]} />
                  <Text style={styles.monthlyStatNumber}>{monthlyStats.noData}</Text>
                  <Text style={styles.monthlyStatLabel}>{t('progress.noData')}</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* Streak and Achievements Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={28} color={c.primary} />
            <Text style={styles.statNumber}>{streak}</Text>
            <Text style={styles.statLabel}>{t('progress.streak')}</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trophy" size={28} color={c.trophy} />
            <Text style={styles.statNumber}>{unlockedAchievements.length}</Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
              {t('progress.achievements')}
            </Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('progress.achievements')}</Text>
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              const progressText = !isUnlocked ? getAchievementProgress(achievement) : null;
              return (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    !isUnlocked && styles.achievementCardLocked,
                  ]}
                >
                  <Ionicons
                    name={achievement.icon}
                    size={32}
                    color={isUnlocked ? c.primary : c.disabled}
                  />
                  <Text
                    style={[
                      styles.achievementTitle,
                      !isUnlocked && styles.achievementTitleLocked,
                    ]}
                  >
                    {t(`achievements.${achievement.id}`, { defaultValue: achievement.title })}
                  </Text>
                  <Text
                    style={[
                      styles.achievementDesc,
                      !isUnlocked && styles.achievementDescLocked,
                    ]}
                  >
                    {t(`achievements.${achievement.id}Desc`, { defaultValue: achievement.description })}
                  </Text>
                  {!isUnlocked && progressText && (
                    <Text style={styles.achievementProgress}>
                      {progressText}
                    </Text>
                  )}
                  {!isUnlocked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={20} color={c.textMuted} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Achievement Unlocked Celebration Modal */}
      <AnimatedModal
        visible={newAchievements.length > 0}
        onRequestClose={() => setNewAchievements([])}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setNewAchievements([])}
          />
          <View style={styles.celebrationModalContent}>
            <View style={styles.celebrationHeader}>
              <Ionicons name="trophy" size={40} color={c.trophy} />
              <Text style={styles.celebrationTitle}>
                {newAchievements.length === 1
                  ? t('progress.achievementUnlocked')
                  : `${newAchievements.length} ${t('progress.achievementsUnlocked')}`}
              </Text>
            </View>
            <ScrollView
              style={styles.celebrationList}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {newAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementUnlockItem}>
                  <View style={styles.achievementUnlockIconWrap}>
                    <Ionicons
                      name={achievement.icon}
                      size={28}
                      color={c.primary}
                    />
                  </View>
                  <View style={styles.achievementUnlockText}>
                    <Text style={styles.achievementUnlockTitle}>
                      {t(`achievements.${achievement.id}`, { defaultValue: achievement.title })}
                    </Text>
                    <Text style={styles.achievementUnlockDesc}>
                      {t(`achievements.${achievement.id}Desc`, { defaultValue: achievement.description })}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.celebrationButton}
              onPress={() => setNewAchievements([])}
              activeOpacity={0.8}
            >
              <Text style={styles.celebrationButtonText}>{t('progress.awesome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>

      {/* Day Details Modal */}
      <AnimatedModal
        visible={showDayModal}
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDayModal(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDayData?.date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : i18n.language === 'ja' ? 'ja-JP' : 'en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            
            {selectedDayData && (
              <>
                {selectedDayData.hasData ? (
                  <>
                    <View style={styles.modalDataRow}>
                      <Text style={styles.modalLabel}>{t('progress.sugarIntake')}</Text>
                      <Text style={styles.modalValue}>
                        {unitSystem === UNIT_SYSTEMS.IMPERIAL
                          ? (selectedDayData.intake * 0.035274).toFixed(1)
                          : selectedDayData.intake.toFixed(1)}
                        {getUnitLabel(unitSystem, t)}
                      </Text>
                    </View>
                    
                    <View style={styles.modalDataRow}>
                      <Text style={styles.modalLabel}>{t('progress.dailyGoal')}</Text>
                      <Text style={styles.modalValue}>
                        {unitSystem === UNIT_SYSTEMS.IMPERIAL
                          ? (dailyGoal * 0.035274).toFixed(1)
                          : dailyGoal.toFixed(1)}
                        {getUnitLabel(unitSystem, t)}
                      </Text>
                    </View>
                    
                    <View style={styles.modalDataRow}>
                      <Text style={styles.modalLabel}>{t('progress.status')}</Text>
                      <View
                        style={[
                          styles.modalStatusBadge,
                          {
                            backgroundColor: selectedDayData.success ? c.chartUnder : c.chartOver,
                          },
                        ]}
                      >
                        <Text style={styles.modalStatusText}>
                          {selectedDayData.success ? t('progress.underLimit') : t('progress.overLimit')}
                        </Text>
                      </View>
                    </View>
                    
                    {selectedDayData.hasData && (
                      <View style={styles.modalDataRow}>
                        <Text style={styles.modalLabel}>{t('progress.difference')}</Text>
                        <Text
                          style={[
                            styles.modalValue,
                            {
                              color: selectedDayData.success ? c.success : c.danger,
                            },
                          ]}
                        >
                          {selectedDayData.success ? '-' : '+'}
                          {unitSystem === UNIT_SYSTEMS.IMPERIAL
                            ? Math.abs(
                                selectedDayData.intake * 0.035274 -
                                  dailyGoal * 0.035274
                              ).toFixed(1)
                            : Math.abs(selectedDayData.intake - dailyGoal).toFixed(1)}
                          {getUnitLabel(unitSystem, t)}
                          {selectedDayData.success ? ` ${t('common.under')}` : ` ${t('common.over')}`}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.modalDataRow}>
                      <Text style={styles.modalLabel}>{t('progress.status')}</Text>
                      <View
                        style={[
                          styles.modalStatusBadge,
                          {
                            backgroundColor: (freezeStatusForSelectedDay?.isFrozen ?? selectedDayData.isFrozen)
                              ? c.freeze
                              : c.chartNone,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalStatusText,
                            (freezeStatusForSelectedDay?.isFrozen ?? selectedDayData.isFrozen) && { color: c.surface },
                          ]}
                        >
                          {(freezeStatusForSelectedDay?.isFrozen ?? selectedDayData.isFrozen) ? t('progress.frozen') : t('progress.noData')}
                        </Text>
                      </View>
                    </View>
                    {freezeStatusForSelectedDay && !freezeStatusForSelectedDay.isFrozen && (
                      <View style={styles.modalFreezeSection}>
                        {freezeStatusForSelectedDay.canUseFreeze ? (
                          <>
                            <Text style={styles.modalFreezeHint}>
                              {t('progress.useFreezeHint')} ({freezeStatusForSelectedDay.used}/{freezeStatusForSelectedDay.limit} {t('progress.usedThisMonth')})
                            </Text>
                            <TouchableOpacity
                              style={styles.modalFreezeButton}
                              onPress={async () => {
                                const dateKey = selectedDayData.date.toDateString();
                                const { ok, error } = await useFreezeForDate(dateKey);
                                if (ok) {
                                  await loadData();
                                  loadCalendarData();
                                  const next = await getFreezeStatusForDate(selectedDayData.date);
                                  setFreezeStatusForSelectedDay(next);
                                } else if (error === 'limit_reached') {
                                  Alert.alert(t('progress.noFreezesLeft'), t('progress.noFreezesLeftDesc'));
                                }
                              }}
                            >
                              <Ionicons name="snow-outline" size={20} color={c.surface} />
                              <Text style={styles.modalFreezeButtonText}>{t('progress.useFreeze')}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text style={styles.modalFreezeLimit}>
                            {t('progress.noFreezesLeftDesc')} ({freezeStatusForSelectedDay.used}/{freezeStatusForSelectedDay.limit} {t('progress.usedThisMonth')}).
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </>
            )}
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDayModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
}

function createProgressStyles(theme) {
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
    daysUnderLimitCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 15,
      padding: 18,
      marginBottom: 20,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      gap: 14,
    },
    daysUnderLimitText: { flex: 1, fontSize: 16 },
    daysUnderLimitNumber: { fontSize: 20, fontWeight: 'bold', color: c.text },
    daysUnderLimitLabel: { fontSize: 16, color: c.textSecondary },
    daysUnderLimitSub: { fontSize: 16, color: c.textMuted },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    monthlyStatsCard: {
      backgroundColor: c.surface, borderRadius: 15, padding: 20, marginBottom: 20,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    monthlyStatsTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 15, textAlign: 'center' },
    monthlyStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    monthlyStatItem: { alignItems: 'center', flex: 1 },
    monthlyStatColor: { width: 20, height: 20, borderRadius: 4, marginBottom: 8 },
    monthlyStatNumber: { fontSize: 24, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    monthlyStatLabel: { fontSize: 12, color: c.textSecondary, textAlign: 'center' },
    statCard: {
      flex: 1, backgroundColor: c.surface, borderRadius: 15, padding: 12, alignItems: 'center', marginHorizontal: 5,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, minWidth: 0,
    },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: c.text, marginTop: 8 },
    statLabel: { fontSize: 10, color: c.textSecondary, marginTop: 4, textAlign: 'center', flexShrink: 1, paddingHorizontal: 2 },
    freezeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4, gap: 6 },
    freezeText: { fontSize: 14, color: c.textSecondary, flex: 1 },
    card: {
      backgroundColor: c.surface, borderRadius: 15, padding: 20, marginBottom: 20,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: c.text, marginBottom: 15 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    monthNavButton: { padding: 5 },
    calendarTitle: { fontSize: 20, fontWeight: 'bold', color: c.text },
    calendarContainer: { marginTop: 10 },
    weekDaysRow: { flexDirection: 'row', marginBottom: 10 },
    weekDayHeader: { flex: 1, alignItems: 'center' },
    weekDayText: { fontSize: 12, fontWeight: 'bold', color: c.textSecondary },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
    calendarDayWithData: { borderRadius: 8 },
    calendarDayToday: { borderWidth: 2, borderColor: c.primary, borderRadius: 8 },
    calendarDayText: { fontSize: 14, color: c.textMuted },
    calendarDayTextWithData: { color: c.surface, fontWeight: 'bold' },
  calendarDayTextToday: { color: c.primary, fontWeight: 'bold' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 2, paddingTop: 5, borderTopWidth: 1, borderTopColor: c.border },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendColor: { width: 16, height: 16, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 12, color: c.textSecondary },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  achievementCard: {
    width: '48%', backgroundColor: c.primarySoft, borderRadius: 12, padding: 15, marginBottom: 12, alignItems: 'center',
    borderWidth: 2, borderColor: c.primary, position: 'relative',
  },
  achievementCardLocked: { backgroundColor: c.background, borderColor: c.border, opacity: 0.6 },
    achievementTitle: { fontSize: 14, fontWeight: 'bold', color: c.text, marginTop: 8, textAlign: 'center' },
    achievementTitleLocked: { color: c.textMuted },
    achievementDesc: { fontSize: 11, color: c.textSecondary, marginTop: 4, textAlign: 'center' },
    achievementDescLocked: { color: c.textMuted },
    achievementProgress: { fontSize: 10, color: c.primary, marginTop: 6, textAlign: 'center', fontWeight: '600' },
  lockOverlay: { position: 'absolute', top: 5, right: 5 },
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: c.surface, borderRadius: 20, padding: 25, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: c.text, marginBottom: 20, textAlign: 'center' },
  modalDataRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,
  },
  modalLabel: { fontSize: 16, color: c.textSecondary },
  modalValue: { fontSize: 16, fontWeight: 'bold', color: c.text },
  modalStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  modalStatusText: { fontSize: 14, fontWeight: 'bold', color: c.text },
  modalCloseButton: { backgroundColor: c.primary, borderRadius: 10, padding: 15, marginTop: 10, alignItems: 'center' },
  modalCloseButtonText: { color: c.surface, fontSize: 16, fontWeight: 'bold' },
  modalFreezeSection: { marginTop: 8, marginBottom: 4 },
  modalFreezeUsed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalFreezeUsedText: { fontSize: 15, color: c.freeze, fontWeight: '500' },
  modalFreezeHint: { fontSize: 14, color: c.textSecondary, marginBottom: 12, lineHeight: 20 },
  modalFreezeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.freeze,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, gap: 8,
  },
  modalFreezeButtonText: { color: c.surface, fontSize: 16, fontWeight: '600' },
  modalFreezeLimit: { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },
  celebrationModalContent: { backgroundColor: c.surface, borderRadius: 20, width: '90%', maxWidth: 400, padding: 24, alignItems: 'center' },
  celebrationHeader: { alignItems: 'center', marginBottom: 20 },
  celebrationTitle: { fontSize: 22, fontWeight: 'bold', color: c.text, marginTop: 12, textAlign: 'center' },
  celebrationList: { width: '100%', maxHeight: 240, marginBottom: 20 },
  achievementUnlockItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.primarySoft, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 2, borderColor: c.primary,
  },
  achievementUnlockIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  achievementUnlockText: { flex: 1 },
  achievementUnlockTitle: { fontSize: 16, fontWeight: 'bold', color: c.text, marginBottom: 4 },
  achievementUnlockDesc: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
  celebrationButton: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center' },
  celebrationButtonText: { color: c.surface, fontSize: 18, fontWeight: 'bold' },
  });
}
