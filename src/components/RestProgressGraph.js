import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 48;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING;

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const RestProgressGraph = ({ restHistory = [], dailyGoal = 4 }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [offset, setOffset] = useState(0); // 0 = current period, 1 = previous, etc.

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
        const count = restHistory.filter(r => r.date === dateString).length;
        const isToday = date.toLocaleDateString() === now.toLocaleDateString();
        days.push({
          label: date.toLocaleDateString([], { weekday: 'short' }).substring(0, 2),
          value: count,
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
        
        let count = 0;
        for (let d = weekStart.getDate(); d <= weekEnd.getDate(); d++) {
          const checkDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
          const dateString = checkDate.toLocaleDateString();
          count += restHistory.filter(r => r.date === dateString).length;
        }
        
        weeks.push({
          label: `W${w + 1}`,
          value: count,
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
        const monthEnd = new Date(year, m + 1, 0);
        
        let count = 0;
        restHistory.forEach(r => {
          const restDate = new Date(r.timestamp);
          if (restDate >= monthStart && restDate <= monthEnd) {
            count++;
          }
        });
        
        months.push({
          label: monthStart.toLocaleDateString([], { month: 'short' }).substring(0, 1),
          value: count,
          isCurrent: offset === 0 && m === now.getMonth(),
        });
      }
      return months;
    }
  }, [restHistory, selectedPeriod, offset]);

  // Reset offset when changing period
  const handlePeriodChange = (periodId) => {
    setSelectedPeriod(periodId);
    setOffset(0);
  };

  const goToPrevious = () => setOffset(prev => prev + 1);
  const goToNext = () => setOffset(prev => Math.max(0, prev - 1));
  const canGoNext = offset > 0;

  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const totalRests = chartData.reduce((sum, d) => sum + d.value, 0);
  const avgRests = (totalRests / chartData.length).toFixed(1);
  
  // Calculate goals based on period and daily goal
  const weeklyGoal = dailyGoal * 7;
  const monthlyGoal = dailyGoal * 30;

  const barWidth = (CHART_WIDTH - 32) / chartData.length - 8;
  const maxBarHeight = 120;

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
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
        <TouchableOpacity onPress={goToPrevious} style={styles.navButton} activeOpacity={0.7}>
          <FontAwesomeIcon icon={faChevronLeft} size={14} color="#EF4444" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{getPeriodLabel()}</Text>
        <TouchableOpacity 
          onPress={goToNext} 
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]} 
          activeOpacity={0.7}
          disabled={!canGoNext}
        >
          <FontAwesomeIcon icon={faChevronRight} size={14} color={canGoNext ? '#EF4444' : '#D1D5DB'} />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalRests}</Text>
          <Text style={styles.statLabel}>Total Rests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgRests}</Text>
          <Text style={styles.statLabel}>
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
                    <Text style={styles.barValue}>{item.value}</Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 4),
                        width: barWidth,
                        backgroundColor: item.isCurrent ? '#EF4444' : '#FECACA',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, item.isCurrent && styles.barLabelCurrent]}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Goal Line Indicator */}
      <View style={styles.goalIndicator}>
        <View style={styles.goalLine} />
        <Text style={styles.goalText}>
          {selectedPeriod === 'week' ? `Goal: ${dailyGoal} rests/day` : selectedPeriod === 'month' ? `Goal: ${weeklyGoal} rests/week` : `Goal: ${monthlyGoal} rests/month`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
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
    color: '#EF4444',
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
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#FECACA',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
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
    borderTopColor: '#FEE2E2',
  },
  goalLine: {
    width: 16,
    height: 2,
    backgroundColor: '#EF4444',
    borderRadius: 1,
  },
  goalText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

export default RestProgressGraph;
