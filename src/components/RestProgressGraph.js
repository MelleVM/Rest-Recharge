import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { useAppTheme } from '../context/ThemeContext';
import {
  STREAK_MODES,
  DEFAULT_DAILY_MINUTES_GOAL,
  DEFAULT_REST_DURATION,
} from '../utils/StreakCalculator';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 48;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING;

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const RestProgressGraph = ({
  restHistory = [],
  dailyGoal = 4,
  streakMode = STREAK_MODES.RESTS,
  dailyMinutesGoal = DEFAULT_DAILY_MINUTES_GOAL,
}) => {
  const isMinutesMode = streakMode === STREAK_MODES.MINUTES;
  // Sums values for a date — counts in rests mode, sums minutes otherwise.
  const sumForDateString = (dateString) =>
    restHistory.reduce((acc, r) => {
      if (r.date !== dateString) return acc;
      if (isMinutesMode) return acc + (Number(r.duration) || DEFAULT_REST_DURATION);
      return acc + 1;
    }, 0);
  // Same for a date range (timestamp-based, used by month/year views).
  const sumForRange = (start, end) =>
    restHistory.reduce((acc, r) => {
      const ts = r.timestamp;
      if (ts < start || ts > end) return acc;
      if (isMinutesMode) return acc + (Number(r.duration) || DEFAULT_REST_DURATION);
      return acc + 1;
    }, 0);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [offset, setOffset] = useState(0); // 0 = current period, 1 = previous, etc.
  const appTheme = useAppTheme();
  const isDarkMode = appTheme?.isDarkMode ?? false;
  const colors = appTheme?.colors ?? {
    background: '#FFF9F0',
    surface: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    inputBackground: '#F0F0F0',
  };

  // Get period label for navigation header
  const getPeriodLabel = () => {
    const now = new Date();
    
    if (selectedPeriod === 'week') {
      if (offset === 0) return 'This Week';
      if (offset === 1) return 'Last Week';
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (offset * 7) - 6);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - (offset * 7));
      return `${startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } else if (selectedPeriod === 'month') {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      if (offset === 0) return 'This Month';
      if (offset === 1) return 'Last Month';
      return monthDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    } else {
      const year = now.getFullYear() - offset;
      if (offset === 0) return 'This Year';
      if (offset === 1) return 'Last Year';
      return year.toString();
    }
  };

  const chartData = useMemo(() => {
    const now = new Date();
    
    if (selectedPeriod === 'week') {
      // 7 days for the selected week
      const days = [];
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (offset * 7));
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(weekEnd);
        date.setDate(date.getDate() - i);
        const dateString = date.toLocaleDateString();
        const value = sumForDateString(dateString);
        const isToday = date.toLocaleDateString() === now.toLocaleDateString();
        days.push({
          label: date.toLocaleDateString([], { weekday: 'short' }).substring(0, 2),
          value,
          isCurrent: isToday && offset === 0,
        });
      }
      return days;
    } else if (selectedPeriod === 'month') {
      // 4 weeks for the selected month
      const weeks = [];
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
      const daysInMonth = monthEnd.getDate();
      
      // Split month into 4 weeks
      for (let w = 0; w < 4; w++) {
        const weekStart = new Date(monthDate);
        weekStart.setDate(1 + (w * 7));
        const weekEnd = new Date(monthDate);
        weekEnd.setDate(Math.min((w + 1) * 7, daysInMonth));
        
        let value = 0;
        for (let d = weekStart.getDate(); d <= weekEnd.getDate(); d++) {
          const checkDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
          const dateString = checkDate.toLocaleDateString();
          value += sumForDateString(dateString);
        }
        
        weeks.push({
          label: `W${w + 1}`,
          value,
          isCurrent: offset === 0 && w === Math.floor((now.getDate() - 1) / 7),
        });
      }
      return weeks;
    } else {
      // 12 months for the selected year
      const months = [];
      const year = now.getFullYear() - offset;
      
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        // include the entire last day
        const monthEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
        const value = sumForRange(monthStart.getTime(), monthEnd.getTime());
        months.push({
          label: monthStart.toLocaleDateString([], { month: 'short' }).substring(0, 1),
          value,
          isCurrent: offset === 0 && m === now.getMonth(),
        });
      }
      return months;
    }
  }, [restHistory, selectedPeriod, offset, isMinutesMode]);

  // Reset offset when changing period
  const handlePeriodChange = (periodId) => {
    setSelectedPeriod(periodId);
    setOffset(0);
  };

  const goToPrevious = () => setOffset(prev => prev + 1);
  const goToNext = () => setOffset(prev => Math.max(0, prev - 1));
  const canGoNext = offset > 0;

  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgValue = (totalValue / chartData.length).toFixed(1);

  // Calculate goals based on period and the active goal (rests or minutes/day).
  const perDayGoal = isMinutesMode ? dailyMinutesGoal : dailyGoal;
  const weeklyGoal = perDayGoal * 7;
  const monthlyGoal = perDayGoal * 30;
  const unitShort = isMinutesMode ? 'min' : 'rests';
  const totalLabel = isMinutesMode ? 'Total Minutes' : 'Total Rests';

  const barWidth = (CHART_WIDTH - 32) / chartData.length - 8;
  const maxBarHeight = 120;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.inputBackground }]}>
      {/* Period Selector */}
      <View style={[styles.periodSelector, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
        {PERIODS.map((period) => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodButton,
              selectedPeriod === period.id && styles.periodButtonActive,
            ]}
            onPress={() => handlePeriodChange(period.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodButtonText,
                { color: selectedPeriod === period.id ? '#FFFFFF' : '#EF4444' },
                selectedPeriod === period.id && styles.periodButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={goToPrevious} style={[styles.navButton, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]} activeOpacity={0.7}>
          <FontAwesomeIcon icon={faChevronLeft} size={14} color="#EF4444" />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>{getPeriodLabel()}</Text>
        <TouchableOpacity 
          onPress={goToNext} 
          style={[styles.navButton, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }, !canGoNext && [styles.navButtonDisabled, { backgroundColor: colors.inputBackground }]]} 
          activeOpacity={0.7}
          disabled={!canGoNext}
        >
          <FontAwesomeIcon icon={faChevronRight} size={14} color={canGoNext ? '#EF4444' : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalValue}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{totalLabel}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FECACA' }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{avgValue}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {selectedPeriod === 'week' ? 'Daily Avg' : selectedPeriod === 'month' ? 'Weekly Avg' : 'Monthly Avg'}
          </Text>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {chartData.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 0;
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barColumn}>
                  {item.value > 0 && (
                    <Text style={[styles.barValue, { color: colors.textSecondary }]}>{item.value}</Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 4),
                        width: barWidth,
                        backgroundColor: item.isCurrent ? '#EF4444' : (isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#FECACA'),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.textMuted }, item.isCurrent && styles.barLabelCurrent]}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Goal Line Indicator */}
      <View style={[styles.goalIndicator, { borderTopColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
        <View style={styles.goalLine} />
        <Text style={[styles.goalText, { color: colors.textSecondary }]}>
          {selectedPeriod === 'week'
            ? `Goal: ${perDayGoal} ${unitShort}/day`
            : selectedPeriod === 'month'
              ? `Goal: ${weeklyGoal} ${unitShort}/week`
              : `Goal: ${monthlyGoal} ${unitShort}/month`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#EF4444',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  chartContainer: {
    marginBottom: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 130,
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 8,
  },
  barLabelCurrent: {
    color: '#EF4444',
    fontWeight: '600',
  },
  goalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  goalLine: {
    width: 16,
    height: 2,
    backgroundColor: '#EF4444',
    borderRadius: 1,
  },
  goalText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});

export default RestProgressGraph;
