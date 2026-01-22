import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, AppState, Modal } from 'react-native';
import { Text, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import NotificationService from '../utils/NotificationService';
import StorageService from '../utils/StorageService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faEyeSlash } from '@fortawesome/free-solid-svg-icons/faEyeSlash';
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faCalendarDay } from '@fortawesome/free-solid-svg-icons/faCalendarDay';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus';
import { faPencil } from '@fortawesome/free-solid-svg-icons/faPencil';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';
import { faLeaf } from '@fortawesome/free-solid-svg-icons/faLeaf';
import { faTree } from '@fortawesome/free-solid-svg-icons/faTree';
import { faCoins } from '@fortawesome/free-solid-svg-icons/faCoins';
import { faDroplet } from '@fortawesome/free-solid-svg-icons/faDroplet';

const HomeScreen = () => {
  const [wakeupTime, setWakeupTime] = useState(null);
  const [nextReminderTime, setNextReminderTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState("☀️");
  const [stats, setStats] = useState({
    totalWakeups: 0,
    totalRests: 0,
    streakDays: 0,
  });
  const [gardenData, setGardenData] = useState({
    points: 0,
    currentPlant: 'sprout',
    plantHealth: 100,
    plantsGrown: 0,
    unlockedPlants: ['sprout'],
    selectedPlantType: 'classic',
  });
  const [lastWakeupInfo, setLastWakeupInfo] = useState(null);
  const [restHistory, setRestHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wakeupHours, setWakeupHours] = useState({});
  const [showRestModal, setShowRestModal] = useState(false);
  const [editingRest, setEditingRest] = useState(null);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const isInitialized = useRef(false);
  const weekScrollRef = useRef(null);
  const theme = useTheme();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen focused - refreshing data');
      checkForCompletedTimer();
      loadData();
      updateGreeting();
    }, [])
  );

  // Also refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App active - refreshing HomeScreen data');
        await checkForCompletedTimer();
        loadData();
        updateGreeting();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Check if timer completed while app was closed
  const checkForCompletedTimer = async () => {
    const timerState = await NotificationService.getTimerState();
    
    if (timerState && timerState.isCompleted) {
      console.log('HomeScreen: Timer completed while app was closed, handling completion');
      
      // Save to history
      const history = await StorageService.getItem('restHistory') || [];
      history.push({
        timestamp: Date.now(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(h => h.timestamp > thirtyDaysAgo);
      await StorageService.setItem('restHistory', filteredHistory);
      
      // Update stats
      const stats = await StorageService.getItem('stats') || {};
      const currentRests = stats.totalRests || 0;
      stats.totalRests = currentRests + 1;
      await StorageService.setItem('stats', stats);
      
      // Clear timer state
      await NotificationService.clearTimerState();
      await NotificationService.stopTimerNotification();
      
      // Schedule next reminder
      await NotificationService.scheduleNextReminder();
    }
  };

  const updateGreeting = () => {
    const currentHour = new Date().getHours();
    
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting("Good Morning!");
      setGreetingIcon("☀️");
    } else if (currentHour >= 12 && currentHour < 17) {
      setGreeting("Good Afternoon!");
      setGreetingIcon("🌤️");
    } else if (currentHour >= 17 && currentHour < 22) {
      setGreeting("Good Evening!");
      setGreetingIcon("🌆");
    } else {
      setGreeting("Good Night!");
      setGreetingIcon("🌙");
    }
  };

  const isToday = (dateString) => {
    const today = new Date();
    const todayString = today.toLocaleDateString();
    return dateString === todayString;
  };

  const isSameDay = (date1, date2) => {
    return date1.toLocaleDateString() === date2.toLocaleDateString();
  };

  const loadData = async () => {
    try {
      const storedWakeupTime = await StorageService.getItem('wakeupTime');
      const storedNextReminder = await StorageService.getItem('nextReminderTime');
      const storedStats = await StorageService.getItem('stats');
      const storedHistory = await StorageService.getItem('restHistory') || [];
      const storedWakeupHours = await StorageService.getItem('wakeupHours') || {};
      
      setRestHistory(storedHistory);
      
      // Handle wakeup time and extract wakeup hours
      let updatedWakeupHours = { ...storedWakeupHours };
      if (storedWakeupTime) {
        // Extract wakeup hour from stored wakeup time if not already in wakeupHours
        const wakeupDate = new Date(storedWakeupTime.timestamp);
        const dateKey = storedWakeupTime.date;
        if (!updatedWakeupHours[dateKey]) {
          updatedWakeupHours[dateKey] = wakeupDate.getHours();
          await StorageService.setItem('wakeupHours', updatedWakeupHours);
        }
        
        if (isToday(storedWakeupTime.date)) {
          setWakeupTime(storedWakeupTime);
        } else {
          setLastWakeupInfo(storedWakeupTime);
          setWakeupTime(null);
        }
      }
      setWakeupHours(updatedWakeupHours);
      
      // Handle next reminder - check if it's still valid
      if (storedNextReminder) {
        const now = Date.now();
        if (storedNextReminder.timestamp > now) {
          setNextReminderTime(storedNextReminder);
        } else {
          console.log('Stored reminder has passed, scheduling new one');
          const newReminder = await NotificationService.scheduleNextReminder();
          setNextReminderTime(newReminder);
        }
      } else {
        console.log('No reminder found, scheduling new one');
        const newReminder = await NotificationService.scheduleNextReminder();
        setNextReminderTime(newReminder);
      }
      
      // Handle stats
      if (storedStats) {
        setStats(storedStats);
      }
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const logWakeupTime = async () => {
    const now = new Date();
    const wakeupData = {
      timestamp: now.getTime(),
      formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString(),
    };

    try {
      await StorageService.setItem('wakeupTime', wakeupData);
      setWakeupTime(wakeupData);
      
      // Store wakeup hour for this date
      const dateKey = now.toLocaleDateString();
      const updatedWakeupHours = { ...wakeupHours, [dateKey]: now.getHours() };
      await StorageService.setItem('wakeupHours', updatedWakeupHours);
      setWakeupHours(updatedWakeupHours);
      
      const reminders = await NotificationService.scheduleReminders(now);
      if (reminders && reminders.length > 0) {
        setNextReminderTime(reminders[0]);
      }
      
      const updatedStats = {
        ...stats,
        totalWakeups: stats.totalWakeups + 1,
        streakDays: stats.streakDays + 1,
      };
      
      await StorageService.setItem('stats', updatedStats);
      setStats(updatedStats);
    } catch (error) {
      console.log('Error saving wakeup time:', error);
    }
  };

  // Get rests for a specific date
  const getRestsForDate = (date) => {
    const dateString = date.toLocaleDateString();
    return restHistory.filter(rest => rest.date === dateString);
  };

  // Open modal to add a new rest
  const openAddRestModal = () => {
    const now = new Date();
    // If selected date is today, default to current hour, otherwise default to noon
    const defaultHour = isSameDay(selectedDate, now) ? now.getHours() : 12;
    setSelectedHour(defaultHour);
    setEditingRest(null);
    setShowRestModal(true);
  };

  // Open modal to edit an existing rest
  const openEditRestModal = (rest) => {
    const restDate = new Date(rest.timestamp);
    setSelectedHour(restDate.getHours());
    setEditingRest(rest);
    setShowRestModal(true);
  };

  // Save rest (add new or update existing)
  const saveRest = async () => {
    try {
      const restDate = new Date(selectedDate);
      restDate.setHours(selectedHour, 0, 0, 0);
      
      const newRest = {
        timestamp: restDate.getTime(),
        date: selectedDate.toLocaleDateString(),
        time: restDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      let updatedHistory;
      if (editingRest) {
        // Update existing rest
        updatedHistory = restHistory.map(r => 
          r.timestamp === editingRest.timestamp ? newRest : r
        );
      } else {
        // Add new rest
        updatedHistory = [...restHistory, newRest];
        
        // Update stats
        const updatedStats = { ...stats, totalRests: stats.totalRests + 1 };
        await StorageService.setItem('stats', updatedStats);
        setStats(updatedStats);
      }

      // Filter to keep only last 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = updatedHistory.filter(h => h.timestamp > thirtyDaysAgo);
      
      await StorageService.setItem('restHistory', filteredHistory);
      setRestHistory(filteredHistory);
      setShowRestModal(false);
      setEditingRest(null);
    } catch (error) {
      console.log('Error saving rest:', error);
    }
  };

  // Delete a rest
  const deleteRest = async (rest) => {
    try {
      const updatedHistory = restHistory.filter(r => r.timestamp !== rest.timestamp);
      await StorageService.setItem('restHistory', updatedHistory);
      setRestHistory(updatedHistory);
      
      // Update stats
      const updatedStats = { ...stats, totalRests: Math.max(0, stats.totalRests - 1) };
      await StorageService.setItem('stats', updatedStats);
      setStats(updatedStats);
      
      setShowRestModal(false);
      setEditingRest(null);
    } catch (error) {
      console.log('Error deleting rest:', error);
    }
  };

  // Generate hours for the hour picker (based on selected date)
  const getAvailableHours = () => {
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const dateKey = selectedDate.toLocaleDateString();
    const wakeupHour = wakeupHours[dateKey] || 6;
    const maxHour = isToday ? now.getHours() : 23;
    
    const hours = [];
    for (let i = wakeupHour; i <= maxHour; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't go beyond today
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  // Format date for display
  const formatDateHeader = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  // Generate timeline hours based on wakeup time
  const generateTimelineHours = (date) => {
    const dateKey = date.toLocaleDateString();
    const wakeupHour = wakeupHours[dateKey] || 6; // Default to 6 if no wakeup logged
    const hours = [];
    // Show from wakeup hour to 23 (end of day)
    for (let i = wakeupHour; i <= 23; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Check if there's a rest at a specific hour
  const getRestAtHour = (hour, rests) => {
    return rests.find(rest => {
      const restDate = new Date(rest.timestamp);
      return restDate.getHours() === hour;
    });
  };

  // Check hours since last rest (for determining if missed)
  const getHoursSinceLastRest = (hour, hours, rests, wakeupHour) => {
    // Look backwards from current hour to find last rest
    for (let i = hour - 1; i >= wakeupHour; i--) {
      if (getRestAtHour(i, rests)) {
        return hour - i;
      }
    }
    // No rest found, count from wakeup
    return hour - wakeupHour;
  };

  // Timeline component - actual line with diamond markers
  const DayTimeline = ({ date, rests }) => {
    const hours = generateTimelineHours(date);
    const now = new Date();
    const isCurrentDay = isSameDay(date, now);
    const currentHour = now.getHours();
    const dateKey = date.toLocaleDateString();
    const wakeupHour = wakeupHours[dateKey] || 6;
    
    // Build segments between hours
    const getSegmentStatus = (fromHour, toHour) => {
      const isPast = isCurrentDay ? toHour <= currentHour : true;
      if (!isPast) return 'future';
      
      // Check if there was a rest in this segment or recently before
      const hoursSinceRest = getHoursSinceLastRest(toHour, hours, rests, wakeupHour);
      if (hoursSinceRest >= 2) return 'warning';
      return 'normal';
    };
    
    return (
      <View style={styles.timelineContainer}>
        {/* Timeline line with segments */}
        <View style={styles.timelineLineContainer}>
          {hours.map((hour, index) => {
            const rest = getRestAtHour(hour, rests);
            const isPast = isCurrentDay ? hour <= currentHour : true;
            const isCurrent = isCurrentDay && hour === currentHour;
            const isLast = index === hours.length - 1;
            
            // Segment after this hour (except for last hour)
            const segmentStatus = !isLast ? getSegmentStatus(hour, hours[index + 1]) : null;
            
            return (
              <View key={hour} style={styles.timelineSegment}>
                {/* Hour marker point */}
                <View style={styles.timelineMarkerContainer}>
                  {rest ? (
                    // Diamond marker for rest
                    <View style={[
                      styles.timelineDiamond,
                      isCurrent && styles.timelineDiamondCurrent,
                    ]}>
                      <View style={styles.timelineDiamondInner} />
                    </View>
                  ) : (
                    // Small dot for non-rest hours
                    <View style={[
                      styles.timelineSmallDot,
                      !isPast && styles.timelineSmallDotFuture,
                      isCurrent && styles.timelineSmallDotCurrent,
                    ]} />
                  )}
                </View>
                
                {/* Line segment to next hour */}
                {!isLast && (
                  <View style={[
                    styles.timelineLineSegment,
                    segmentStatus === 'warning' && styles.timelineLineWarning,
                    segmentStatus === 'future' && styles.timelineLineFuture,
                  ]} />
                )}
              </View>
            );
          })}
        </View>
        
        {/* Hour labels below */}
        <View style={styles.timelineLabelsRow}>
          {hours.map((hour, index) => (
            <View key={hour} style={styles.timelineLabelSlot}>
              <Text style={[
                styles.timelineHour,
                index === 0 && styles.timelineHourFirst,
                index === hours.length - 1 && styles.timelineHourLast,
              ]}>
                {hour.toString().padStart(2, '0')}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Get last 7 days for history (oldest to newest, current day on right)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  // Day summary card
  const DaySummaryCard = ({ date, isSelected }) => {
    const rests = getRestsForDate(date);
    const isCurrentDay = isSameDay(date, new Date());
    const dayName = isCurrentDay ? 'Now' : date.toLocaleDateString([], { weekday: 'short' });
    const dayNum = date.getDate();
    
    return (
      <View style={[
        styles.daySummaryCard,
        isSelected && styles.daySummaryCardSelected,
        isCurrentDay && !isSelected && styles.daySummaryCardToday,
      ]}>
        <Text style={[
          styles.daySummaryDay,
          isSelected && styles.daySummaryDaySelected,
          isCurrentDay && !isSelected && styles.daySummaryDayToday,
        ]}>{dayName}</Text>
        <Text style={[
          styles.daySummaryNum,
          isSelected && styles.daySummaryNumSelected,
          isCurrentDay && !isSelected && styles.daySummaryNumToday,
        ]}>{dayNum}</Text>
        <View style={[styles.daySummaryBadge, rests.length > 0 ? styles.daySummaryBadgeActive : styles.daySummaryBadgeEmpty]}>
          <Text style={styles.daySummaryBadgeText}>{rests.length}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const selectedDateRests = getRestsForDate(selectedDate);
  const isSelectedToday = isSameDay(selectedDate, new Date());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {greeting} {greetingIcon}
        </Text>
        <Text style={styles.title}>Rest & Recharge</Text>
      </View>

      {/* Status Cards Row */}
      <View style={styles.statusCardsRow}>
        {/* Wake-up Card - Compact */}
        <TouchableOpacity
          onPress={!wakeupTime ? logWakeupTime : null}
          activeOpacity={wakeupTime ? 1 : 0.7}
          style={[styles.statusCard, wakeupTime ? styles.statusCardCompleted : styles.statusCardAction]}
        >
          <View style={[styles.statusIconContainer, wakeupTime ? styles.statusIconCompleted : styles.statusIconAction]}>
            <FontAwesomeIcon
              icon={wakeupTime ? faCheck : faSun}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.statusContent}>
            <Text style={[styles.statusLabel, wakeupTime && styles.statusLabelCompleted]}>
              {wakeupTime ? 'Woke up' : 'Wake-up'}
            </Text>
            <Text style={[styles.statusValue, wakeupTime && styles.statusValueCompleted]}>
              {wakeupTime ? wakeupTime.formattedTime : 'Tap to log'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Next Reminder Card - Compact */}
        <Surface style={[styles.statusCard, styles.statusCardReminder]}>
          <View style={styles.statusIconReminder}>
            <FontAwesomeIcon icon={faBell} size={20} color="#FF6B6B" />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Next Rest</Text>
            <Text style={styles.statusValue}>
              {nextReminderTime ? nextReminderTime.formattedTime : '--:--'}
            </Text>
          </View>
        </Surface>
      </View>

      {/* Last Wake-up Info (shown when no wake-up today) */}
      {!wakeupTime && lastWakeupInfo && (
        <View style={styles.lastWakeupHint}>
          <FontAwesomeIcon icon={faCalendarDay} size={14} color="#B2BEC3" />
          <Text style={styles.lastWakeupHintText}>
            Last: {lastWakeupInfo.formattedTime} on {lastWakeupInfo.date}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Activity</Text>

      {/* Week Overview */}
      <Surface style={styles.weekOverviewCard}>
        <ScrollView
          ref={weekScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekOverviewScroll}
          onContentSizeChange={() => {
            weekScrollRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {getLast7Days().map((date, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <DaySummaryCard date={date} isSelected={isSameDay(date, selectedDate)} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Surface>

      {/* Day Timeline */}
      <Surface style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <TouchableOpacity
            onPress={goToPreviousDay}
            style={styles.timelineNavButton}
          >
            <FontAwesomeIcon icon={faChevronLeft} size={16} color="#636E72" />
          </TouchableOpacity>
          <Text style={styles.timelineTitle}>
            {formatDateHeader(selectedDate)}
          </Text>
          <TouchableOpacity
            onPress={goToNextDay}
            style={[
              styles.timelineNavButton,
              isSelectedToday && styles.timelineNavButtonDisabled,
            ]}
            disabled={isSelectedToday}
          >
            <FontAwesomeIcon
              icon={faChevronRight}
              size={16}
              color={isSelectedToday ? '#DFE6E9' : '#636E72'}
            />
          </TouchableOpacity>
        </View>

        <DayTimeline date={selectedDate} rests={selectedDateRests} />

        <View style={styles.timelineLegend}>
          <View style={styles.legendItem}>
            <View style={styles.legendDiamond} />
            <Text style={styles.legendText}>Rested</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, styles.legendLineNormal]} />
            <Text style={styles.legendText}>On track</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, styles.legendLineWarning]} />
            <Text style={styles.legendText}>Needs rest</Text>
          </View>
        </View>

        {selectedDateRests.length > 0 && (
          <View style={styles.restListContainer}>
            <View style={styles.restListHeader}>
              <Text style={styles.restListTitle}>Completed Rests</Text>
              <TouchableOpacity 
                style={styles.addRestButton}
                onPress={openAddRestModal}
                activeOpacity={0.7}
              >
                <FontAwesomeIcon icon={faPlus} size={14} color="#4ECDC4" />
                <Text style={styles.addRestButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {[...selectedDateRests].sort((a, b) => b.timestamp - a.timestamp).map((rest, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.restListItem}
                onPress={() => openEditRestModal(rest)}
                activeOpacity={0.7}
              >
                <FontAwesomeIcon icon={faCheck} size={14} color="#4ECDC4" />
                <Text style={styles.restListTime}>{rest.time}</Text>
                <FontAwesomeIcon icon={faPencil} size={12} color="#B2BEC3" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedDateRests.length === 0 && (
          <View style={styles.noRestsContainer}>
            <Text style={styles.noRestsText}>
              {isSelectedToday
                ? 'No rests completed yet today'
                : 'No rests on this day'}
            </Text>
            <TouchableOpacity 
              style={styles.addRestButtonLarge}
              onPress={openAddRestModal}
              activeOpacity={0.7}
            >
              <FontAwesomeIcon icon={faPlus} size={16} color="#FFFFFF" />
              <Text style={styles.addRestButtonLargeText}>Log a Rest</Text>
            </TouchableOpacity>
          </View>
        )}
      </Surface>

      {/* Add/Edit Rest Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showRestModal}
        onRequestClose={() => setShowRestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRest ? 'Edit Rest' : 'Log Rest'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowRestModal(false)} 
                style={styles.modalCloseButton}
              >
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Select Hour</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourPickerContainer}
              >
                {getAvailableHours().map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.hourButton,
                      selectedHour === hour && styles.hourButtonSelected,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text style={[
                      styles.hourButtonText,
                      selectedHour === hour && styles.hourButtonTextSelected,
                    ]}>
                      {hour.toString().padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.modalNote}>
                Logging rest for {formatDateHeader(selectedDate)} at {selectedHour.toString().padStart(2, '0')}:00
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              {editingRest && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => deleteRest(editingRest)}
                >
                  <FontAwesomeIcon icon={faTrash} size={16} color="#FF6B6B" />
                </TouchableOpacity>
              )}
              <View style={styles.modalFooterButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowRestModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveRest}
                >
                  <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          Resting for 20 minutes every two hours has been proven to be
          beneficial for recharging your battery.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tipContainer: {
    marginBottom: 20,
    marginTop: 20,
    paddingHorizontal: 30,
  },
  tipText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 18,
    color: '#636E72',
    fontWeight: '600',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 4,
  },
  statusCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusCardAction: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFE66D',
    borderStyle: 'dashed',
  },
  statusCardCompleted: {
    backgroundColor: '#E8F8F5',
    borderWidth: 0,
  },
  statusCardReminder: {
    backgroundColor: '#FFFFFF',
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconAction: {
    backgroundColor: '#FFE66D',
  },
  statusIconCompleted: {
    backgroundColor: '#4ECDC4',
  },
  statusIconReminder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    marginLeft: 10,
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
  },
  statusLabelCompleted: {
    color: '#4ECDC4',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  statusValueCompleted: {
    color: '#2D3436',
  },
  lastWakeupHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  lastWakeupHintText: {
    fontSize: 12,
    color: '#B2BEC3',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginHorizontal: 24,
    marginTop: 30,
    marginBottom: 16,
  },
  weekOverviewCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  weekOverviewScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  daySummaryCard: {
    width: 52,
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
  },
  daySummaryCardSelected: {
    backgroundColor: '#4ECDC4',
  },
  daySummaryCardToday: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  daySummaryDay: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636E72',
  },
  daySummaryDaySelected: {
    color: '#FFFFFF',
  },
  daySummaryDayToday: {
    color: '#4ECDC4',
  },
  daySummaryNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 2,
  },
  daySummaryNumSelected: {
    color: '#FFFFFF',
  },
  daySummaryNumToday: {
    color: '#4ECDC4',
  },
  daySummaryBadge: {
    marginTop: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  daySummaryBadgeActive: {
    backgroundColor: '#2ECC71',
  },
  daySummaryBadgeEmpty: {
    backgroundColor: '#DFE6E9',
  },
  daySummaryBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timelineCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timelineNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineNavButtonDisabled: {
    backgroundColor: '#F8F9FA',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  timelineContainer: {
    marginBottom: 16,
  },
  timelineLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  timelineSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timelineMarkerContainer: {
    width: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDiamond: {
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  timelineDiamondCurrent: {
    borderWidth: 2,
    borderColor: '#FFE66D',
  },
  timelineDiamondInner: {
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '0deg' }],
  },
  timelineSmallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B2BEC3',
  },
  timelineSmallDotFuture: {
    backgroundColor: '#DFE6E9',
  },
  timelineSmallDotCurrent: {
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#FFE66D',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLineSegment: {
    flex: 1,
    height: 3,
    backgroundColor: '#4ECDC4',
    marginHorizontal: -2,
  },
  timelineLineWarning: {
    backgroundColor: '#FFB347',
  },
  timelineLineFuture: {
    backgroundColor: '#DFE6E9',
  },
  timelineLabelsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  timelineLabelSlot: {
    flex: 1,
    alignItems: 'center',
  },
  timelineHour: {
    fontSize: 9,
    color: '#636E72',
  },
  timelineHourFirst: {
    marginLeft: -6,
  },
  timelineHourLast: {
    marginRight: -6,
  },
  timelineLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDiamond: {
    width: 10,
    height: 10,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#4ECDC4',
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  legendLineNormal: {
    backgroundColor: '#4ECDC4',
  },
  legendLineWarning: {
    backgroundColor: '#FFB347',
  },
  legendText: {
    fontSize: 11,
    color: '#636E72',
  },
  restListContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  restListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  restListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  addRestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E8F8F5',
    borderRadius: 10,
  },
  addRestButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  restListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 6,
  },
  restListTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    flex: 1,
  },
  noRestsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  noRestsText: {
    fontSize: 14,
    color: '#B2BEC3',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  addRestButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#4ECDC4',
    borderRadius: 14,
  },
  addRestButtonLargeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 12,
  },
  hourPickerContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  hourButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  hourButtonSelected: {
    backgroundColor: '#4ECDC4',
  },
  hourButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  hourButtonTextSelected: {
    color: '#FFFFFF',
  },
  modalNote: {
    fontSize: 13,
    color: '#B2BEC3',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalFooterButtons: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
    justifyContent: 'flex-end',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3436',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3436',
    marginTop: 4,
    textAlign: 'center',
  },
  tipCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
  },
  tipEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  bottomPadding: {
    height: 100,
  },
});

export default HomeScreen;
