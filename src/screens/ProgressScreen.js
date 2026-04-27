import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faTrophy } from '@fortawesome/free-solid-svg-icons/faTrophy';
import { faMedal } from '@fortawesome/free-solid-svg-icons/faMedal';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faAward } from '@fortawesome/free-solid-svg-icons/faAward';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons/faShareNodes';
import Svg, { Circle } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import StorageService from '../utils/StorageService';
import { useAppTheme } from '../context/ThemeContext';
import { FONTS } from '../styles/fonts';
import RestProgressGraph from '../components/RestProgressGraph';
import {
  STREAK_MODES,
  DEFAULT_DAILY_MINUTES_GOAL,
  calculateStreakData as calculateStreakFromHistory,
  getActiveStreakConfig,
  getDailyTotal,
  aggregateDailyTotals,
} from '../utils/StreakCalculator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MILESTONES = [
  { id: 1, rests: 10, label: '10', icon: faStar, color: '#10B981' },
  { id: 2, rests: 25, label: '25', icon: faMedal, color: '#3B82F6' },
  { id: 3, rests: 50, label: '50', icon: faTrophy, color: '#8B5CF6' },
  { id: 4, rests: 100, label: '100', icon: faAward, color: '#F59E0B' },
  { id: 5, rests: 250, label: '250', icon: faGem, color: '#EC4899' },
];

const ProgressScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const appTheme = useAppTheme();
  const isDarkMode = appTheme?.isDarkMode ?? false;
  const viewShotRef = useRef();
  const colors = appTheme?.colors ?? {
    background: '#FFF9F0',
    surface: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    inputBackground: '#F0F0F0',
  };

  const [stats, setStats] = useState({ totalRests: 0 });
  const [dailyGoal, setDailyGoal] = useState(4);
  const [streakMode, setStreakMode] = useState(STREAK_MODES.RESTS);
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState(DEFAULT_DAILY_MINUTES_GOAL);
  const [todayValue, setTodayValue] = useState(0);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  const [weekData, setWeekData] = useState([]);
  const [restHistory, setRestHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('streak');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load stats
      const storedStats = await StorageService.getItem('stats') || { totalRests: 0 };
      setStats(storedStats);

      // Load settings
      const settings = await StorageService.getItem('settings') || {};
      const goal = settings.dailyGoal || 4;
      const mode = settings.streakMode === STREAK_MODES.MINUTES ? STREAK_MODES.MINUTES : STREAK_MODES.RESTS;
      const minutesGoal = settings.dailyMinutesGoal ?? DEFAULT_DAILY_MINUTES_GOAL;
      const defaultDuration = settings.restDuration || 20;
      setDailyGoal(goal);
      setStreakMode(mode);
      setDailyMinutesGoal(minutesGoal);
      const streakSettings = { streakMode: mode, dailyGoal: goal, dailyMinutesGoal: minutesGoal };
      const activeGoal = getActiveStreakConfig(streakSettings).goal;

      // Load rest history and migrate old entries (only if they don't have duration)
      let history = await StorageService.getItem('restHistory') || [];
      
      // Check if migration has already been done
      const migrationDone = await StorageService.getItem('durationMigrationDone');
      
      if (!migrationDone) {
        // One-time migration: Add duration to old entries that don't have it
        let needsMigration = false;
        history = history.map(rest => {
          if (!rest.duration) {
            needsMigration = true;
            return { ...rest, duration: defaultDuration };
          }
          return rest;
        });
        
        // Save migrated data and mark migration as done
        if (needsMigration) {
          console.log(`One-time migration: Adding duration to ${history.length} rests`);
          await StorageService.setItem('restHistory', history);
        }
        await StorageService.setItem('durationMigrationDone', true);
      }
      
      console.log(`Total rests in history: ${history.length}, Sample:`, history[0]);

      setRestHistory(history);

      // Reconcile `stats.totalRests` against the canonical rest history. If
      // a rest was ever logged without bumping the counter (e.g. older builds,
      // background timer completions), the displayed total would lag behind.
      if ((storedStats.totalRests || 0) < history.length) {
        const reconciledStats = { ...storedStats, totalRests: history.length };
        await StorageService.setItem('stats', reconciledStats);
        setStats(reconciledStats);
      }
      
      // Calculate today's value (rests or minutes depending on mode)
      const todayKey = new Date().toLocaleDateString();
      const todayDailyValue = getDailyTotal(history, todayKey, streakSettings);
      setTodayValue(todayDailyValue);

      // Calculate streak using shared util
      const streak = calculateStreakFromHistory(history, streakSettings);
      setStreakData(streak);

      // Calculate week data (mode-aware totals + goalMet)
      const dailyTotals = aggregateDailyTotals(history, mode);
      const week = getLast7Days().map(date => {
        const dateKey = date.toLocaleDateString();
        const value = dailyTotals[dateKey] || 0;
        return {
          date,
          count: value,
          goalMet: value >= activeGoal,
          isToday: dateKey === todayKey,
        };
      });
      setWeekData(week);
    } catch (error) {
      console.log('Error loading progress data:', error);
    }
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  // Active streak config (mode + goal) used by the UI below.
  const streakSettings = { streakMode, dailyGoal, dailyMinutesGoal };
  const { mode: activeMode, goal: activeGoal } = getActiveStreakConfig(streakSettings);
  const goalMetToday = todayValue >= activeGoal;

  // Progress ring dimensions
  const ringSize = SCREEN_WIDTH * 0.55;
  const strokeWidth = 14;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(activeGoal > 0 ? todayValue / activeGoal : 0, 1);
  const strokeDashoffset = circumference * (1 - progress);

  // Share progress
  const handleShare = async () => {
    try {
      const todayLine = activeMode === STREAK_MODES.MINUTES
        ? `• Today: ${todayValue}/${activeGoal} min`
        : `• Today: ${todayValue}/${activeGoal} rests`;
      const message = `My Rest & Recharge Progress\n\n` +
        `${todayLine}\n` +
        `• Current streak: ${streakData.currentStreak} days\n` +
        `• Best streak: ${streakData.longestStreak} days\n` +
        `• Total rests: ${stats.totalRests}\n\n` +
        `Get the app: https://apps.apple.com/app/id6761079398`;

      // Capture screenshot of full scrollable content
      let shareOptions = { message };
      
      try {
        const uri = await captureRef(viewShotRef, {
          format: 'png',
          quality: 0.9,
          result: 'tmpfile',
        });
        shareOptions.url = uri;
      } catch (captureError) {
        console.log('Screenshot capture failed, sharing text only:', captureError);
      }

      const result = await Share.share(shareOptions);

      if (result.action === Share.dismissedAction) {
        // User dismissed the share dialog
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Share error:', error);
      // Only show alert for actual errors, not user cancellations
      if (error.message && !error.message.includes('cancel')) {
        Alert.alert('Error', `Unable to share progress: ${error.message}`);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 20 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.inputBackground }]}
            onPress={handleShare}
          >
            <FontAwesomeIcon icon={faShareNodes} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.inputBackground }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <FontAwesomeIcon icon={faGear} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View ref={viewShotRef} collapsable={false}>
          {/* Daily Progress Ring */}
        <View style={styles.progressSection}>
          <View style={styles.ringContainer}>
            <Svg width={ringSize} height={ringSize}>
              {/* Background circle */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : '#F0F0F0'}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress circle */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                rotation="-90"
                origin={`${ringSize / 2}, ${ringSize / 2}`}
              />
            </Svg>
            <View style={styles.ringContent}>
              <Text style={[styles.ringNumber, { color: colors.text }]}>
                {todayValue}
              </Text>
              <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>
                of {activeGoal} {activeMode === STREAK_MODES.MINUTES ? 'min' : 'rests'}
              </Text>
              {goalMetToday && (
                <View style={styles.goalMetBadge}>
                  <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
                  <Text style={styles.goalMetText}>Goal met!</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Today's Progress
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.flatTabContainer, { borderBottomColor: colors.inputBackground }]}>
          <TouchableOpacity
            style={[styles.flatTab, activeTab === 'streak' && [styles.flatTabActive, { borderBottomColor: colors.text }]]}
            onPress={() => setActiveTab('streak')}
            activeOpacity={0.7}
          >
            <Text style={[styles.flatTabText, { color: colors.textMuted }, activeTab === 'streak' && [styles.flatTabTextActive, { color: colors.text }]]}>
              Streak
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.flatTab, activeTab === 'graph' && [styles.flatTabActive, { borderBottomColor: colors.text }]]}
            onPress={() => setActiveTab('graph')}
            activeOpacity={0.7}
          >
            <Text style={[styles.flatTabText, { color: colors.textMuted }, activeTab === 'graph' && [styles.flatTabTextActive, { color: colors.text }]]}>
              Graph
            </Text>
          </TouchableOpacity>
        </View>

        {/* Streak Tab Content */}
        {activeTab === 'streak' && (
          <>
            {/* Streak Card */}
            <View style={[styles.streakCard, { backgroundColor: colors.surface, marginTop: 16 }]}>
              <View style={styles.streakMain}>
                <View style={[styles.fireIconContainer, { backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.15)' : '#FFF7ED' }]}>
                  <FontAwesomeIcon icon={faFire} size={28} color="#F97316" />
                </View>
                <View style={styles.streakInfo}>
                  <View style={styles.streakNumberRow}>
                    <Text style={[styles.streakNumber, { color: colors.text }]}>
                      {streakData.currentStreak}
                    </Text>
                    <Text style={[styles.streakUnit, { color: colors.textSecondary }]}>
                      {streakData.currentStreak === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                  <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
                    Current streak
                  </Text>
                </View>
                <View style={[styles.bestStreakBadge, { backgroundColor: isDarkMode ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7' }]}>
                  <Text style={[styles.bestStreakLabel, { color: isDarkMode ? '#FCD34D' : '#D97706' }]}>Best</Text>
                  <Text style={[styles.bestStreakNumber, { color: isDarkMode ? '#FCD34D' : '#D97706' }]}>
                    {streakData.longestStreak}
                  </Text>
                </View>
              </View>
            </View>

            {/* This Week */}
            <View style={[styles.weekCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>This Week</Text>
            <View style={styles.weekDays}>
              {weekData.map((day, index) => {
                const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.date.getDay()];
                return (
                  <View key={index} style={styles.dayItem}>
                    <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{dayLabel}</Text>
                    <View style={[
                      styles.dayCircle,
                      { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6' },
                      day.goalMet && styles.dayCircleDone,
                      day.isToday && !day.goalMet && styles.dayCircleToday,
                    ]}>
                      {day.goalMet ? (
                        <FontAwesomeIcon icon={faCheck} size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.dayCount, { color: colors.textMuted }]}>
                          {day.count > 0 ? day.count : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
          </>
        )}

        {/* Graph Tab Content */}
        {activeTab === 'graph' && (
          <View style={{ marginTop: 16 }}>
            <RestProgressGraph
              restHistory={restHistory}
              dailyGoal={dailyGoal}
              streakMode={streakMode}
              dailyMinutesGoal={dailyMinutesGoal}
            />
          </View>
        )}

        {/* Total Rests & Time */}
        <View style={[styles.totalCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>All Time</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalNumber, { color: colors.text }]}>{stats.totalRests}</Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Rests</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalItem}>
              <Text style={[styles.totalNumber, { color: colors.text }]}>
                {(() => {
                  const totalMinutes = restHistory.reduce((sum, rest) => sum + (rest.duration || 20), 0);
                  if (totalMinutes < 60) {
                    return `${totalMinutes}m`;
                  }
                  return `${Math.round(totalMinutes / 60)}h`;
                })()}
              </Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Time Rested</Text>
            </View>
          </View>
        </View>

        {/* Milestones */}
        <View style={[styles.milestonesCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Milestones</Text>
          <View style={styles.milestonesGrid}>
            {MILESTONES.map((milestone) => {
              const isUnlocked = stats.totalRests >= milestone.rests;
              const progress = Math.min(stats.totalRests / milestone.rests, 1);
              
              return (
                <View key={milestone.id} style={styles.milestoneItem}>
                  <View style={[
                    styles.milestoneIcon,
                    { backgroundColor: isUnlocked ? milestone.color : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6') },
                  ]}>
                    <FontAwesomeIcon
                      icon={milestone.icon}
                      size={20}
                      color={isUnlocked ? '#FFFFFF' : colors.textMuted}
                    />
                  </View>
                  <Text style={[
                    styles.milestoneLabel,
                    { color: isUnlocked ? colors.text : colors.textMuted }
                  ]}>
                    {milestone.label}
                  </Text>
                  {!isUnlocked && (
                    <View style={styles.milestoneProgressBar}>
                      <View style={[
                        styles.milestoneProgressFill,
                        { width: `${progress * 100}%`, backgroundColor: milestone.color }
                      ]} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: FONTS.regular,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  progressSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  ringContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringNumber: {
    fontSize: 56,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
    lineHeight: 64,
  },
  ringLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  goalMetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  goalMetText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  streakCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakInfo: {
    flex: 1,
    marginLeft: 14,
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
    lineHeight: 36,
  },
  streakUnit: {
    fontSize: 18,
    fontWeight: '500',
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  bestStreakBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  bestStreakLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bestStreakNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  weekCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#10B981',
  },
  dayCircleToday: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  dayCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  totalNumber: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
    lineHeight: 54,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 4,
  },
  milestonesCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  milestonesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneItem: {
    alignItems: 'center',
    flex: 1,
  },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  milestoneProgressBar: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  encouragementSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  encouragementText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  flatTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 24,
  },
  flatTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  flatTabActive: {
    borderBottomWidth: 2,
  },
  flatTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  flatTabTextActive: {
    fontWeight: '600',
  },
  flatCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  flatCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  flatStreakStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
  },
  flatStreakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flatStreakNumber: {
    fontSize: 36,
    fontWeight: '700',
  },
  flatStreakLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  flatStreakBest: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flatStreakBestLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  flatStreakBestNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  flatStreakWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  flatStreakDay: {
    alignItems: 'center',
    gap: 8,
  },
  flatStreakCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatStreakCircleDone: {
    backgroundColor: '#10B981',
  },
  flatStreakCircleToday: {
    borderWidth: 2,
  },
  flatStreakCirclePartial: {
    backgroundColor: '#FCD34D',
  },
  flatStreakCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350F',
  },
  flatStreakDayLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  flatStreakDayLabelToday: {
    fontWeight: '700',
  },
  flatStreakGoal: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ProgressScreen;
