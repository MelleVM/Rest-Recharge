import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Vibration, TouchableOpacity, AppState, PermissionsAndroid, Platform, ScrollView, Modal, StatusBar } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faVolumeHigh } from '@fortawesome/free-solid-svg-icons/faVolumeHigh';
import { faVolumeXmark } from '@fortawesome/free-solid-svg-icons/faVolumeXmark';
import { faMobile } from '@fortawesome/free-solid-svg-icons/faMobile';
import { faChevronUp } from '@fortawesome/free-solid-svg-icons/faChevronUp';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCalendarPlus } from '@fortawesome/free-solid-svg-icons/faCalendarPlus';
import { faTrophy } from '@fortawesome/free-solid-svg-icons/faTrophy';
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import Svg, { Circle } from 'react-native-svg';
import StorageService from '../utils/StorageService';
import NotificationService from '../utils/NotificationService';
import { ToastEvent } from '../components/RewardToast';
import { Switch } from 'react-native';
import { FONTS } from '../styles/fonts';
import { RestModeEvent, PendingUnlocksEvent } from '../utils/EventEmitters';
import { getFlowersInUnlockOrder } from '../config/flowerConfig';
import { useAppTheme } from '../context/ThemeContext';

console.log('[TimerScreen] Module loaded');

// Plant colors
const PLANT_COLORS = {
  classic: '#4CAF50',
  rose: '#E91E63',
  sunflower: '#FFC107',
  bonsai: '#795548',
  cherry: '#F48FB1',
  succulent: '#66BB6A',
};

const TIMER_SIZE = 280;
const STROKE_WIDTH = 10;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MOTIVATIONAL_QUOTES = [
  "Rest is not a luxury. It's a necessity for healing.",
  "Your body is working hard to heal. Give it the rest it needs.",
  "Healing is not linear. Some days rest is the greatest victory.",
  "Listen to your body. It knows what it needs to recover.",
  "Rest is an active part of recovery, not a sign of weakness.",
  "Small steps forward. Rest when needed. Healing takes time.",
  "Your worth is not measured by productivity. Rest is healing.",
  "Recovery is a journey. Be patient and kind to yourself.",
  "Taking time to rest is taking time to heal.",
  "You are doing better than you think. Rest is progress.",
  "Chronic illness requires chronic self-compassion.",
  "Rest today builds strength for tomorrow.",
  "Your body deserves the same kindness you'd give a friend.",
  "Healing happens in the quiet moments of rest.",
  "Every rest break is an investment in your recovery.",
];

const TimerScreen = () => {
  const navigation = useNavigation();
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(() => 
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );
  const [totalTime, setTotalTime] = useState(0);
  const [completedRests, setCompletedRests] = useState(0);
  const [gardenData, setGardenData] = useState({ points: 0 });
  const [showTutorial, setShowTutorial] = useState(false);
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [bonusRest, setBonusRestState] = useState(false);
  const [showDailyGoalModal, setShowDailyGoalModal] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(4);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  const [restHistory, setRestHistory] = useState([]);
  const bonusRestRef = useRef(false);
  const setBonusRest = (value) => {
    console.log('setBonusRest called with:', value);
    setBonusRestState(value);
    bonusRestRef.current = value;
    console.log('bonusRestRef.current is now:', bonusRestRef.current);
  };
  const endTimeRef = useRef(null);
  const startDurationRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const appState = useRef(AppState.currentState);
  const isInitialized = useRef(false);
  const isActiveRef = useRef(false);
  const theme = useTheme();
  const appTheme = useAppTheme();
  const isDarkMode = appTheme?.isDarkMode ?? false;
  const colors = appTheme?.colors ?? {
    background: '#FFF9F0',
    surface: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
  };

  // Keep refs in sync with state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Helper functions for daily goal modal
  const isSameDay = (date1, date2) => {
    return date1.toLocaleDateString() === date2.toLocaleDateString();
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

  const getRestsForDate = (date, history) => {
    const dateString = date.toLocaleDateString();
    return history.filter(rest => rest.date === dateString);
  };

  const getStreakStatusForDate = (date, history, goal) => {
    const rests = getRestsForDate(date, history);
    const restCount = rests.length;
    return {
      count: restCount,
      goalMet: restCount >= goal,
      isToday: isSameDay(date, new Date())
    };
  };

  const calculateStreakData = (history, goal) => {
    const today = new Date();
    const dailyRestCounts = {};
    
    history.forEach(rest => {
      const dateKey = rest.date;
      dailyRestCounts[dateKey] = (dailyRestCounts[dateKey] || 0) + 1;
    });
    
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    while (true) {
      const dateKey = checkDate.toLocaleDateString();
      const restsOnDay = dailyRestCounts[dateKey] || 0;
      
      if (restsOnDay >= goal) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (isSameDay(checkDate, today)) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    
    let longestStreak = currentStreak;
    let tempStreak = 0;
    const sortedDates = Object.keys(dailyRestCounts).sort((a, b) => new Date(a) - new Date(b));
    
    for (let i = 0; i < sortedDates.length; i++) {
      const dateKey = sortedDates[i];
      if (dailyRestCounts[dateKey] >= goal) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    return { currentStreak, longestStreak };
  };

  const requestNotificationPermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'Rest & Recharge needs notification permission to show timer progress',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        console.log('Notification permission:', granted);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Load settings and check for active timer on mount
  useEffect(() => {
    const initialize = async () => {
      await loadCompletedRests();
      await loadSettingsAndRecoverTimer();
      requestNotificationPermission();
      isInitialized.current = true;
    };
    
    initialize();
    
    // Listen for app state changes to sync timer when returning to foreground
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active' && isInitialized.current) {
        console.log('App came to foreground, checking timer state');
        const alreadyHandled = await checkForCompletedTimer();
        
        // If timer is still active and wasn't already handled, verify it hasn't completed
        if (!alreadyHandled && isActiveRef.current && endTimeRef.current) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
          if (remaining <= 0) {
            console.log('Timer completed while in background');
            // Don't call stopTimerNotification here - handleTimerCompletedWhileActive will do it with keepReminder=true
            handleTimerCompletedWhileActive();
          }
        }
      }
    });
    
    return () => {
      stopTimer();
      subscription?.remove();
    };
  }, []);

  // Refresh settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshSettings = async () => {
        // Check if timer completed while we were away
        await checkForCompletedTimer();

        const settings = await NotificationService.getSettings();
        setAlarmSoundEnabled(settings.alarmSoundEnabled ?? true);
        
        // Only update duration if timer is not active
        if (!isActiveRef.current) {
          const durationMinutes = settings.restDuration || 20;
          const durationSeconds = durationMinutes * 60;
          setTime(durationSeconds);
          setTotalTime(durationSeconds);
        }
        // Always refresh completed rests count and garden data
        await loadCompletedRests();
        const storedGardenData = await StorageService.getItem('gardenData');
        if (storedGardenData) {
          setGardenData(storedGardenData);
        }
        
        // Check if this is the first time visiting timer
        const hasSeenTutorial = await StorageService.getItem('timerTutorialSeen');
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }
      };
      
      if (isInitialized.current) {
        refreshSettings();
      }
    }, [])
  );

  const dismissTutorial = async () => {
    setShowTutorial(false);
    await StorageService.setItem('timerTutorialSeen', true);
  };

  // Check if a timer completed while app was closed/background
  const checkForCompletedTimer = async () => {
    const timerState = await NotificationService.getTimerState();
    console.log('checkForCompletedTimer - timerState:', timerState);
    
    if (timerState && timerState.isCompleted) {
      // Timer completed while app was closed
      console.log('Timer completed while app was closed, handling completion');
      await handleTimerCompletedInBackground();
      return true;
    }
    return false;
  };

  const loadSettingsAndRecoverTimer = async () => {
    const settings = await NotificationService.getSettings();
    const loadedDurationMinutes = settings.restDuration || 20;
    const durationSeconds = loadedDurationMinutes * 60;
    setDurationMinutes(loadedDurationMinutes);
    setTotalTime(durationSeconds);
    setAlarmSoundEnabled(settings.alarmSoundEnabled ?? true);
    
    // Check for active timer state
    const timerState = await NotificationService.getTimerState();
    
    console.log('loadSettingsAndRecoverTimer - timerState:', timerState);
    
    if (timerState) {
      if (timerState.isCompleted) {
        // Timer completed while app was closed
        console.log('Timer completed in background, handling completion');
        await handleTimerCompletedInBackground();
        setTime(durationSeconds);
      } else if (timerState.isActive) {
        endTimeRef.current = timerState.endTime;
        setTime(timerState.remaining);
        setIsActive(true);
        startTimerLoop();
      }
    } else {
      setTime(durationSeconds);
    }
  };
  
  // Adjust duration from the timer screen
  const adjustDuration = async (delta) => {
    const newMinutes = Math.max(1, Math.min(60, durationMinutes + delta));
    setDurationMinutes(newMinutes);
    const newSeconds = newMinutes * 60;
    setTime(newSeconds);
    setTotalTime(newSeconds);
    
    // Save to settings
    const settings = await NotificationService.getSettings();
    settings.restDuration = newMinutes;
    await StorageService.setItem('settings', settings);
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changed:', appState.current, '->', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        
        if (isInitialized.current) {
          // Check if timer completed
          const completed = await checkForCompletedTimer();
          
          if (!completed && endTimeRef.current) {
            // Timer still running, update time and restart loop
            const now = Date.now();
            const remaining = Math.floor((endTimeRef.current - now) / 1000);
            
            if (remaining > 0) {
              setTime(remaining);
              startTimerLoop();
            }
          }
          
          // Refresh stats
          await loadCompletedRests();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - stop the animation loop
        stopTimer();
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Save rest to history
  const saveRestToHistory = async (timestamp) => {
    try {
      const history = await StorageService.getItem('restHistory') || [];
      const todayKey = new Date(timestamp).toLocaleDateString();
      const todayRestsBeforeAdd = history.filter(r => r.date === todayKey).length;
      
      history.push({
        timestamp,
        date: todayKey,
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      // Keep only last 30 days of history
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(h => h.timestamp > thirtyDaysAgo);
      await StorageService.setItem('restHistory', filteredHistory);
      
      // Check if daily goal was just reached
      const settings = await StorageService.getItem('settings') || {};
      const goal = settings.dailyGoal || 4;
      const todayRestsAfterAdd = filteredHistory.filter(r => r.date === todayKey).length;
      
      if (todayRestsBeforeAdd < goal && todayRestsAfterAdd >= goal) {
        // Update state and show modal on TimerScreen
        setDailyGoal(goal);
        setRestHistory(filteredHistory);
        const streak = calculateStreakData(filteredHistory, goal);
        setStreakData(streak);
        setShowDailyGoalModal(true);
      }
    } catch (error) {
      console.log('Error saving rest history:', error);
    }
  };

  // Handle timer that completed while app was in background
  const handleTimerCompletedInBackground = async () => {
    console.log('Handling timer completion from background');
    
    // Get the stored completion time, or use current time as fallback
    const completionTime = await StorageService.getItem('lastCompletionTime') || Date.now();
    
    // Save to history
    await saveRestToHistory(completionTime);
    
    // Update completed rests count
    const stats = await StorageService.getItem('stats') || {};
    const currentRests = stats.totalRests || 0;
    const newCount = currentRests + 1;
    stats.totalRests = newCount;
    await StorageService.setItem('stats', stats);
    setCompletedRests(newCount);
    
    // Check for newly unlocked flowers and store as pending
    const flowers = getFlowersInUnlockOrder();
    const newlyUnlocked = flowers.find(
      flower => flower.unlockAtRests > currentRests && flower.unlockAtRests <= newCount
    );
    if (newlyUnlocked) {
      const pendingUnlocks = await StorageService.getItem('pendingFlowerUnlocks') || [];
      if (!pendingUnlocks.includes(newlyUnlocked.id)) {
        pendingUnlocks.push(newlyUnlocked.id);
        await StorageService.setItem('pendingFlowerUnlocks', pendingUnlocks);
        PendingUnlocksEvent.emit(pendingUnlocks.length);
      }
    }
    
    // Award gems for completing rest
    const currentGardenData = await StorageService.getItem('gardenData') || { points: 0 };
    const updatedGardenData = {
      ...currentGardenData,
      points: (currentGardenData.points || 0) + 10,
    };
    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
    
    // Update sunflower garden energy
    const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || { energy: 0.5 };
    const newEnergy = Math.min(1.0, (sunflowerGarden.energy || 0.5) + 0.25);
    await StorageService.setItem('sunflowerGarden', {
      ...sunflowerGarden,
      energy: newEnergy,
      lastEnergyUpdate: Date.now(),
    });
    
    // Show toast notification
    ToastEvent.show('energy', 25, 'Rest completed!');
    
    // Clear timer state and stop notification (keep the pre-scheduled reminder)
    await NotificationService.clearTimerState();
    await NotificationService.stopTimerNotification(true);
    
    // Clean up the stored completion time
    await StorageService.removeItem('lastCompletionTime');
    
    // Reset UI state
    setIsActive(false);
    RestModeEvent.emit(false);
    endTimeRef.current = null;
    
    // Reset to default duration
    const settings = await NotificationService.getSettings();
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    setTime(durationSeconds);
    setTotalTime(durationSeconds);
    
    // Vibrate to indicate completion
    if (settings.vibrationEnabled) {
      Vibration.vibrate([0, 500, 200, 500]);
    }
  };

  const loadCompletedRests = async () => {
    try {
      const stats = await StorageService.getItem('stats');
      if (stats && stats.totalRests !== undefined) {
        setCompletedRests(stats.totalRests);
      }
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };

  const saveCompletedRests = async (count) => {
    try {
      const stats = await StorageService.getItem('stats') || {};
      stats.totalRests = count;
      await StorageService.setItem('stats', stats);
    } catch (error) {
      console.log('Error saving stats:', error);
    }
  };

  // Stop the timer loop
  const stopTimer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Start timer using requestAnimationFrame for smooth updates
  const startTimerLoop = () => {
    stopTimer();
    // Initialize to endTimeRef so first tick's lastSecond matches initial remaining
    lastUpdateRef.current = endTimeRef.current;
    
    const tick = () => {
      if (!endTimeRef.current) return;
      
      const now = Date.now();
      const remainingMs = Math.max(0, endTimeRef.current - now);
      const remaining = Math.floor(remainingMs / 1000);
      
      // Update smooth progress every frame for fluid animation
      const totalMs = totalTime * 1000;
      const elapsedMs = totalMs - remainingMs;
      setSmoothProgress(totalMs > 0 ? elapsedMs / totalMs : 0);
      
      // Only update time display once per second
      const lastSecond = Math.floor((endTimeRef.current - lastUpdateRef.current) / 1000);
      if (remaining !== lastSecond || remaining === 0) {
        lastUpdateRef.current = now;
        
        if (remaining <= 0) {
          // Timer completed - handleTimerCompletedWhileActive will stop notification with keepReminder=true
          handleTimerCompletedWhileActive();
          return;
        }
        
        // When we reach 1 second, update one more time to ensure clean state before 0
        if (remaining === 1) {
          NotificationService.updateTimerNotification(remaining);
        }
        
        setTime(remaining);
        
        // Update Live Activity every 5 seconds - widget uses timerInterval for smooth countdown
        if (remaining % 5 === 0) {
          NotificationService.updateTimerNotification(remaining);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const start = async () => {
    if (!isActive) {
      const newEndTime = Date.now() + time * 1000;
      endTimeRef.current = newEndTime;
      startDurationRef.current = time; // Store the starting duration
      setIsActive(true);
      RestModeEvent.emit(true);
      
      // Use ref to get current value (avoid stale closure)
      const isBonusRest = bonusRestRef.current;
      console.log('Starting timer, bonusRestRef.current:', isBonusRest, 'bonusRest state:', bonusRest);
      await NotificationService.startTimerNotification(newEndTime, false, isBonusRest);
      startTimerLoop();
    }
  };

  const cancel = async () => {
    // Calculate completed percentage before stopping (use refs for accuracy)
    let completedPercent = 0;
    const now = Date.now();
    const duration = startDurationRef.current;
    
    if (endTimeRef.current && duration > 0) {
      const remainingMs = Math.max(0, endTimeRef.current - now);
      const remainingSecs = remainingMs / 1000;
      const elapsedSecs = duration - remainingSecs;
      completedPercent = Math.round((elapsedSecs / duration) * 100);
    }
    
    stopTimer();
    
    // Award proportional energy based on completion (25% max for full rest, so scale accordingly)
    const energyEarned = Math.round((completedPercent / 100) * 25);
    
    // Update sunflower garden energy proportionally
    const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || { energy: 0.5 };
    const energyGain = (completedPercent / 100) * 0.25; // Max 0.25 for full rest
    const newEnergy = Math.min(1.0, (sunflowerGarden.energy || 0.5) + energyGain);
    await StorageService.setItem('sunflowerGarden', {
      ...sunflowerGarden,
      energy: newEnergy,
      lastEnergyUpdate: Date.now(),
    });
    
    // Award proportional gems (scale from 0-10 based on completion)
    const gemsEarned = Math.floor((completedPercent / 100) * 10);
    const currentGardenData = await StorageService.getItem('gardenData') || { points: 0 };
    const updatedGardenData = {
      ...currentGardenData,
      points: (currentGardenData.points || 0) + gemsEarned,
    };
    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
    
    // Show toast notification with energy earned
    if (energyEarned > 0) {
      ToastEvent.show('energy', energyEarned, `+${energyEarned}% energy earned`);
    } else {
      ToastEvent.show('energy', 0, 'Timer cancelled');
    }
    
    // Stop timer and clear state
    // For bonus rest, keep the existing reminder; for regular rest, cancel it
    const isBonusRest = bonusRestRef.current;
    await NotificationService.stopTimerNotification(isBonusRest);
    await NotificationService.clearTimerState();
    
    // Schedule next reminder from now (only for regular rest, not bonus rest)
    if (!isBonusRest) {
      await NotificationService.scheduleNextReminder();
    }
    
    // Reset UI
    const settings = await NotificationService.getSettings();
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    
    setIsActive(false);
    RestModeEvent.emit(false);
    setTime(durationSeconds);
    setTotalTime(durationSeconds);
    endTimeRef.current = null;
    
    // Reset bonus rest toggle
    setBonusRest(false);
  };

  // Get a new random quote
  const getNewQuote = () => {
    const newQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setCurrentQuote(newQuote);
  };

  // Handle timer completion while app is active
  const handleTimerCompletedWhileActive = async () => {
    console.log('Timer completed while app is active');
    
    stopTimer();
    setIsActive(false);
    RestModeEvent.emit(false);
    endTimeRef.current = null;
    
    const completionTime = Date.now();
    
    // Save to history
    await saveRestToHistory(completionTime);
    
    // Award gems for completing rest
    const currentGardenData = await StorageService.getItem('gardenData') || { points: 0 };
    const updatedGardenData = {
      ...currentGardenData,
      points: (currentGardenData.points || 0) + 10,
    };
    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
    
    // Update sunflower garden energy
    const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || { energy: 0.5 };
    const newEnergy = Math.min(1.0, (sunflowerGarden.energy || 0.5) + 0.25);
    await StorageService.setItem('sunflowerGarden', {
      ...sunflowerGarden,
      energy: newEnergy,
      lastEnergyUpdate: Date.now(),
    });
    
    // Show toast notification
    ToastEvent.show('energy', 25, 'Rest completed!');
    
    // Show a new motivational quote
    getNewQuote();
    
    // Clear timer state and stop notification (keep the pre-scheduled reminder)
    await NotificationService.stopTimerNotification(true);
    await NotificationService.clearTimerState();
    
    // Store completion time for history tracking
    await StorageService.setItem('lastCompletionTime', completionTime);
    
    // Vibrate device
    const settings = await NotificationService.getSettings();
    if (settings.vibrationEnabled) {
      Vibration.vibrate([0, 500, 200, 500]);
    }
    
    // Reset timer to configured duration
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    setTime(durationSeconds);
    setTotalTime(durationSeconds);
    
    // Reset bonus rest toggle for next rest
    setBonusRest(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Use smoothProgress when timer is active for fluid animation, otherwise calculate from time
  const progress = isActive ? smoothProgress : (totalTime > 0 ? (totalTime - time) / totalTime : 0);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // Get plant color for gems display
  const plantColor = PLANT_COLORS[gardenData.selectedPlantType] || PLANT_COLORS.classic;

  return (
    <>
      {/* First-time Tutorial Modal */}
      <Modal
        visible={showTutorial}
        transparent={true}
        animationType="fade"
        onRequestClose={dismissTutorial}
      >
        <View
          style={[
            styles.tutorialOverlay,
            { backgroundColor: colors.modalOverlay },
          ]}
        >
          <View
            style={[styles.tutorialModal, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.tutorialTitle, { color: colors.text }]}>
              Eye Rest Timer
            </Text>
            <Text
              style={[styles.tutorialText, { color: colors.textSecondary }]}
            >
              Give your eyes a break with timed rest sessions. Close your eyes
              and relax while the timer counts down.
            </Text>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faPlay} size={16} color="#4ECDC4" />
              <Text style={[styles.tutorialStepText, { color: colors.text }]}>
                Press play to start your rest session
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faEye} size={16} color="#FF6B6B" />
              <Text style={[styles.tutorialStepText, { color: colors.text }]}>
                Close your eyes and relax until the timer ends
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faBolt} size={16} color="#FFC107" />
              <Text style={[styles.tutorialStepText, { color: colors.text }]}>
                Earn 25% energy for each completed rest
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.tutorialButton, { backgroundColor: plantColor }]}
              onPress={dismissTutorial}
            >
              <Text style={styles.tutorialButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar
        barStyle={isActive || isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isActive ? '#121212' : colors.background}
      />

      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background },
          isActive && styles.restModeContainer,
        ]}
        contentContainerStyle={[
          styles.contentContainer,
          isActive && styles.restModeContentContainer,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isActive}
      >
        {!isActive && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Rest & Recharge
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <FontAwesomeIcon
                icon={faGear}
                size={28}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        {isActive && <View style={styles.restModeHeaderSpacer} />}

        <View style={styles.timerContainer}>
          <View style={styles.timerWrapper}>
            <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
              <Circle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={RADIUS}
                stroke={
                  isActive ? '#333333' : isDarkMode ? '#444444' : '#E0E0E0'
                }
                strokeWidth={STROKE_WIDTH}
                fill={isActive ? '#1a1a1a' : colors.surface}
              />
              <Circle
                cx={TIMER_SIZE / 2}
                cy={TIMER_SIZE / 2}
                r={RADIUS}
                stroke={colors.primary || '#FF6B6B'}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${TIMER_SIZE / 2}, ${TIMER_SIZE / 2}`}
              />
            </Svg>

            <View style={styles.timerTextContainer}>
              <Text
                style={[
                  styles.timerText,
                  { color: colors.text },
                  isActive && styles.restModeTimerText,
                ]}
              >
                {formatTime(time)}
              </Text>
              {!isActive && (
                <Text
                  style={[styles.timerLabel, { color: colors.textSecondary }]}
                >
                  {time === 0
                    ? 'Click to collect your reward 💎'
                    : 'Start when ready'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {isActive && (
          <>
            <Text style={styles.restModeMessage}>
              You can turn off your screen
            </Text>
            <Text style={styles.restModeSubMessage}>
              The timer will continue in the background
            </Text>
          </>
        )}

        <View style={styles.controlsContainer}>
          {isActive ? (
            <TouchableOpacity
              style={[styles.controlButton, styles.restModeCancelButton]}
              onPress={cancel}
            >
              <FontAwesomeIcon icon={faTimes} size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.controlButton} onPress={start}>
              <FontAwesomeIcon icon={faPlay} size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isActive && (
          <>
            <View
              style={[
                styles.settingsCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.inputBackground,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.settingsHeader}
                onPress={() => setSettingsExpanded(!settingsExpanded)}
                activeOpacity={0.7}
              >
                <Text style={[styles.settingsTitle, { color: colors.text }]}>
                  Settings
                </Text>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  size={16}
                  color={colors.textMuted}
                  style={{ transform: [{ rotate: settingsExpanded ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {settingsExpanded && (
                <View style={styles.settingsContent}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <FontAwesomeIcon
                        icon={faClock}
                        size={20}
                        color="#4ECDC4"
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          Duration
                        </Text>
                        <Text
                          style={[
                            styles.settingDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Rest timer length
                        </Text>
                      </View>
                    </View>
                    <View style={styles.durationPickerRow}>
                      <TouchableOpacity
                        style={[styles.durationAdjustButton, { backgroundColor: colors.inputBackground }]}
                        onPress={() => adjustDuration(-1)}
                      >
                        <FontAwesomeIcon icon={faChevronDown} size={14} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.durationValueText, { color: colors.text }]}>
                        {durationMinutes} min
                      </Text>
                      <TouchableOpacity
                        style={[styles.durationAdjustButton, { backgroundColor: colors.inputBackground }]}
                        onPress={() => adjustDuration(1)}
                      >
                        <FontAwesomeIcon icon={faChevronUp} size={14} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.settingDivider, { backgroundColor: colors.inputBackground }]} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <FontAwesomeIcon
                        icon={alarmSoundEnabled ? faVolumeHigh : faMobile}
                        size={20}
                        color="#4ECDC4"
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          Alarm Type
                        </Text>
                        <Text
                          style={[
                            styles.settingDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {alarmSoundEnabled
                            ? 'Sound + Vibration'
                            : 'Vibration Only'}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={alarmSoundEnabled}
                      onValueChange={async value => {
                        setAlarmSoundEnabled(value);
                        const settings = await NotificationService.getSettings();
                        settings.alarmSoundEnabled = value;
                        await StorageService.setItem('settings', settings);
                      }}
                      trackColor={{ false: colors.textMuted, true: '#4ECDC4' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.settingDivider, { backgroundColor: colors.inputBackground }]} />

                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <FontAwesomeIcon
                        icon={faCalendarPlus}
                        size={20}
                        color="#4ECDC4"
                      />
                      <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          Bonus Rest
                        </Text>
                        <Text
                          style={[
                            styles.settingDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Keep current reminder schedule
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={bonusRest}
                      onValueChange={setBonusRest}
                      trackColor={{ false: colors.textMuted, true: '#4ECDC4' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              )}
            </View>

            <View
              style={[
                styles.quoteCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.inputBackground,
                },
              ]}
            >
              <Text style={[styles.quoteText, { color: colors.text }]}>
                "{currentQuote}"
              </Text>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Daily Goal Celebration Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDailyGoalModal}
        onRequestClose={() => setShowDailyGoalModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.dailyGoalModalContent, { backgroundColor: colors.surface }]}>
            {/* Decorative top accent */}
            <View style={styles.dailyGoalAccent}>
              <View style={[styles.dailyGoalAccentBar, { backgroundColor: '#10B981' }]} />
              <View style={[styles.dailyGoalAccentBar, { backgroundColor: '#34D399' }]} />
              <View style={[styles.dailyGoalAccentBar, { backgroundColor: '#6EE7B7' }]} />
            </View>
            
            {/* Trophy icon with glow effect */}
            <View style={styles.dailyGoalIconWrapper}>
              <View style={[styles.dailyGoalIconGlow, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)' }]} />
              <View style={[styles.dailyGoalIconCircle, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5' }]}>
                <FontAwesomeIcon icon={faTrophy} size={32} color="#10B981" />
              </View>
            </View>
            
            <View style={styles.dailyGoalCelebration}>
              <Text style={[styles.dailyGoalTitle, { color: colors.text }]}>Goal Achieved!</Text>
              <Text style={[styles.dailyGoalSubtitle, { color: colors.textSecondary }]}>
                You completed {dailyGoal} rests today
              </Text>
            </View>
            
            {/* Streak display */}
            <View style={[styles.dailyGoalStreakCard, { backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.12)' : '#FFF7ED' }]}>
              <View style={styles.dailyGoalStreakRow}>
                <View style={[styles.dailyGoalFireBadge, { backgroundColor: isDarkMode ? 'rgba(251, 146, 60, 0.2)' : '#FFEDD5' }]}>
                  <FontAwesomeIcon icon={faFire} size={20} color="#F97316" />
                </View>
                <View style={styles.dailyGoalStreakInfo}>
                  <View style={styles.dailyGoalStreakNumberRow}>
                    <Text style={[styles.dailyGoalStreakNumber, { color: colors.text }]}>
                      {streakData.currentStreak}
                    </Text>
                    <Text style={[styles.dailyGoalStreakUnit, { color: colors.textSecondary }]}>
                      {streakData.currentStreak === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                  <Text style={[styles.dailyGoalStreakLabel, { color: colors.textMuted }]}>
                    Current streak
                  </Text>
                </View>
                {streakData.currentStreak > streakData.longestStreak && (
                  <View style={styles.dailyGoalNewRecordBadge}>
                    <Text style={styles.dailyGoalNewRecordText}>NEW BEST</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Week progress */}
            <View style={styles.dailyGoalWeekPreview}>
              <View style={styles.dailyGoalWeekHeader}>
                <Text style={[styles.dailyGoalWeekTitle, { color: colors.textSecondary }]}>This Week</Text>
              </View>
              <View style={styles.dailyGoalWeekDays}>
                {getLast7Days().map((date, index) => {
                  const status = getStreakStatusForDate(date, restHistory, dailyGoal);
                  const isToday = status.isToday;
                  const goalMet = isToday ? true : status.goalMet;
                  const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
                  return (
                    <View key={index} style={styles.dailyGoalDayItem}>
                      <Text style={[styles.dailyGoalDayLabel, { color: colors.textMuted }]}>{dayLabel}</Text>
                      <View style={[
                        styles.dailyGoalDayCircle,
                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6' },
                        goalMet && styles.dailyGoalDayCircleDone,
                        isToday && !goalMet && styles.dailyGoalDayCircleToday,
                      ]}>
                        {goalMet && (
                          <FontAwesomeIcon icon={faCheck} size={11} color="#FFFFFF" />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.dailyGoalButton}
              onPress={() => setShowDailyGoalModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.dailyGoalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  bottomPadding: {
    height: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gemDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  settingsButton: {
    padding: 8,
  },
  gemText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#505255',
    fontFamily: FONTS.regular,
  },
  subtitle: {
    fontSize: 18,
    color: '#636E72',
    marginTop: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerWrapper: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  restModeContainer: {
    backgroundColor: '#121212',
  },
  restModeContentContainer: {
    alignItems: 'center',
  },
  restModeHeaderSpacer: {
    height: 60,
  },
  restModeTimerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  restModeMessage: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  restModeSubMessage: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 40,
  },
  restModeCancelButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.8)',
  },
  timerLabel: {
    fontSize: 18,
    color: '#636E72',
    marginTop: 8,
  },
  settingDivider: {
    height: 1,
    marginVertical: 12,
  },
  durationPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationAdjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationValueText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 55,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  controlButton: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  quoteCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  tipContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tutorialOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tutorialModal: {
    borderRadius: 24,
    padding: 28,
    maxWidth: 340,
    alignItems: 'center',
  },
  tutorialEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  tutorialStepText: {
    fontSize: 14,
    flex: 1,
  },
  tutorialButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 16,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsCard: {
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    elevation: 2,
    overflow: 'hidden',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  // Daily Goal Celebration Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyGoalModalContent: {
    width: '88%',
    maxWidth: 340,
    borderRadius: 28,
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dailyGoalAccent: {
    flexDirection: 'row',
    width: '100%',
    height: 6,
    marginBottom: 24,
  },
  dailyGoalAccentBar: {
    flex: 1,
  },
  dailyGoalIconWrapper: {
    position: 'relative',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyGoalIconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  dailyGoalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyGoalCelebration: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dailyGoalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  dailyGoalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  dailyGoalStreakCard: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  dailyGoalStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyGoalFireBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyGoalStreakInfo: {
    flex: 1,
  },
  dailyGoalStreakNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  dailyGoalStreakNumber: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  dailyGoalStreakUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
  dailyGoalStreakLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  dailyGoalNewRecordBadge: {
    backgroundColor: '#F97316',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dailyGoalNewRecordText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dailyGoalWeekPreview: {
    width: '100%',
    marginBottom: 20,
  },
  dailyGoalWeekHeader: {
    marginBottom: 12,
  },
  dailyGoalWeekTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dailyGoalWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailyGoalDayItem: {
    alignItems: 'center',
    gap: 6,
  },
  dailyGoalDayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dailyGoalDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyGoalDayCircleDone: {
    backgroundColor: '#10B981',
  },
  dailyGoalDayCircleToday: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  dailyGoalButton: {
    width: '100%',
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  dailyGoalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default TimerScreen;
