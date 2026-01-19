import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Vibration, TouchableOpacity, AppState, PermissionsAndroid, Platform } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';
import { faPause } from '@fortawesome/free-solid-svg-icons/faPause';
import { faRotateRight } from '@fortawesome/free-solid-svg-icons/faRotateRight';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import Svg, { Circle } from 'react-native-svg';
import StorageService from '../utils/StorageService';
import NotificationService from '../utils/NotificationService';

const TIMER_SIZE = 280;
const STROKE_WIDTH = 10;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TimerScreen = () => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [completedRests, setCompletedRests] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [totalTime, setTotalTime] = useState(0);
  const countdownInterval = useRef(null);
  const appState = useRef(AppState.currentState);
  const endTimeRef = useRef(null);
  const isInitialized = useRef(false);
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);
  const theme = useTheme();

  // Keep refs in sync with state
  useEffect(() => {
    isActiveRef.current = isActive;
    isPausedRef.current = isPaused;
  }, [isActive, isPaused]);

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
    
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  // Refresh settings when screen comes into focus (e.g., after changing settings)
  useFocusEffect(
    useCallback(() => {
      const refreshSettings = async () => {
        // Only update duration if timer is not active
        if (!isActiveRef.current && !isPausedRef.current) {
          const settings = await NotificationService.getSettings();
          const durationMinutes = settings.restDuration || 20;
          const durationSeconds = durationMinutes * 60;
          setTime(durationSeconds);
          setTotalTime(durationSeconds);
          console.log('Timer duration refreshed to:', durationMinutes, 'minutes');
        }
        // Always refresh completed rests count
        await loadCompletedRests();
      };
      
      if (isInitialized.current) {
        refreshSettings();
      }
    }, [])
  );

  const loadSettingsAndRecoverTimer = async () => {
    const settings = await NotificationService.getSettings();
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    setTotalTime(durationSeconds);
    
    // Check for active timer state
    const timerState = await NotificationService.getTimerState();
    
    if (timerState) {
      if (timerState.isPaused) {
        // Timer was paused
        setTime(timerState.remaining);
        setIsPaused(true);
        setIsActive(true);
      } else if (timerState.isActive) {
        // Timer was running - calculate current remaining time
        const now = Date.now();
        const remaining = Math.floor((timerState.endTime - now) / 1000);
        
        if (remaining > 0) {
          // Timer still has time left
          setEndTime(timerState.endTime);
          endTimeRef.current = timerState.endTime;
          setTime(remaining);
          setIsActive(true);
          setIsPaused(false);
          startCountdownFromEndTime(timerState.endTime);
        } else {
          // Timer has completed while app was in background
          console.log('Timer completed in background, handling completion');
          await handleTimerCompletedInBackground();
          // Set time to full duration after completion
          setTime(durationSeconds);
        }
      }
    } else {
      // No active timer, set default time
      setTime(durationSeconds);
    }
  };

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changed:', appState.current, '->', nextAppState);
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        
        // Clear any existing interval
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
        }
        
        // Only recover if already initialized
        if (isInitialized.current) {
          await recoverTimerFromBackground();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - clear interval to save resources
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const recoverTimerFromBackground = async () => {
    const timerState = await NotificationService.getTimerState();
    const settings = await NotificationService.getSettings();
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    
    if (timerState) {
      if (timerState.isPaused) {
        setTime(timerState.remaining);
        setIsPaused(true);
        setIsActive(true);
      } else if (timerState.isActive) {
        const now = Date.now();
        const remaining = Math.floor((timerState.endTime - now) / 1000);
        
        if (remaining > 0) {
          setEndTime(timerState.endTime);
          endTimeRef.current = timerState.endTime;
          setTime(remaining);
          setIsActive(true);
          setIsPaused(false);
          startCountdownFromEndTime(timerState.endTime);
        } else {
          // Timer completed in background
          console.log('Timer completed while in background');
          await handleTimerCompletedInBackground();
          setTime(durationSeconds);
          setTotalTime(durationSeconds);
        }
      }
    } else {
      // No active timer state - update to current settings if not active
      if (!isActiveRef.current && !isPausedRef.current) {
        setTime(durationSeconds);
        setTotalTime(durationSeconds);
      }
    }
    
    // Refresh completed rests count
    await loadCompletedRests();
  };

  // Handle timer that completed while app was in background
  const handleTimerCompletedInBackground = async () => {
    console.log('Handling timer completion from background');
    
    // Update completed rests count
    const stats = await StorageService.getItem('stats') || {};
    const currentRests = stats.totalRests || 0;
    const newCount = currentRests + 1;
    stats.totalRests = newCount;
    await StorageService.setItem('stats', stats);
    setCompletedRests(newCount);
    
    // Clear timer state
    await NotificationService.clearTimerState();
    await NotificationService.stopTimerNotification();
    
    // Schedule next reminder
    await NotificationService.scheduleNextReminder();
    
    // Reset UI state
    setIsActive(false);
    setIsPaused(false);
    setEndTime(null);
    endTimeRef.current = null;
    
    // Vibrate to indicate completion
    const settings = await NotificationService.getSettings();
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

  const start = async () => {
    if (!isActive || isPaused) {
      const newEndTime = Date.now() + time * 1000;
      setEndTime(newEndTime);
      endTimeRef.current = newEndTime;
      setIsActive(true);
      setIsPaused(false);
      
      await NotificationService.startTimerNotification(newEndTime);
      startCountdownFromEndTime(newEndTime);
    }
  };

  const pause = async () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    
    setIsPaused(true);
    endTimeRef.current = null;
    
    await NotificationService.pauseTimerNotification(time);
  };

  const reset = async () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    
    const settings = await NotificationService.getSettings();
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    
    setIsActive(false);
    setIsPaused(false);
    setTime(durationSeconds);
    setTotalTime(durationSeconds);
    setEndTime(null);
    endTimeRef.current = null;
    
    await NotificationService.stopTimerNotification();
    await NotificationService.clearTimerState();
  };

  // Start countdown based on end time
  const startCountdownFromEndTime = (targetEndTime) => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
    }
    
    countdownInterval.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));
      
      if (remaining <= 0) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
        handleTimerCompletedWhileActive();
      } else {
        setTime(remaining);
        
        if (remaining % 5 === 0) {
          NotificationService.updateTimerNotification(remaining);
        }
      }
    }, 1000);
  };

  // Handle timer completion while app is active
  const handleTimerCompletedWhileActive = async () => {
    console.log('Timer completed while app is active');
    
    setIsActive(false);
    setIsPaused(false);
    setEndTime(null);
    endTimeRef.current = null;
    
    // Update completed rests count
    const newCount = completedRests + 1;
    setCompletedRests(newCount);
    await saveCompletedRests(newCount);
    
    // Clear timer state and stop notification
    await NotificationService.stopTimerNotification();
    await NotificationService.clearTimerState();
    
    // Schedule next reminder
    await NotificationService.scheduleNextReminder();
    
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
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalTime > 0 ? (totalTime - time) / totalTime : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Eye Rest</Text>
        <Text style={styles.subtitle}>Rest & Recharge</Text>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timerWrapper}>
          <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS}
              stroke="#E0E0E0"
              strokeWidth={STROKE_WIDTH}
              fill="white"
            />
            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS}
              stroke={theme.colors.primary}
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
            <Text style={styles.timerText}>{formatTime(time)}</Text>
            <Text style={styles.timerLabel}>
              {isActive 
                ? (isPaused ? "Paused" : "Relax your eyes") 
                : "Start when ready"
              }
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        {isActive && !isPaused ? (
          <TouchableOpacity style={styles.controlButton} onPress={pause}>
            <FontAwesomeIcon icon={faPause} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.controlButton} onPress={start}>
            <FontAwesomeIcon icon={faPlay} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.resetButton]} 
          onPress={reset}
          disabled={!isActive && time === totalTime}
        >
          <FontAwesomeIcon 
            icon={faRotateRight} 
            size={24} 
            color={!isActive && time === totalTime ? "#B2BEC3" : "#636E72"} 
          />
        </TouchableOpacity>
      </View>

      <Surface style={styles.statsCard}>
        <View style={styles.statsIcon}>
          <FontAwesomeIcon icon={faCheck} size={32} color="#FFE66D" />
        </View>
        <View style={styles.statsContent}>
          <Text style={styles.statsNumber}>{completedRests}</Text>
          <Text style={styles.statsLabel}>Eye rests completed</Text>
        </View>
      </Surface>

      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          Resting for 20 minutes every two hours has been proven to be beneficial for recharging your battery.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
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
  timerLabel: {
    fontSize: 18,
    color: '#636E72',
    marginTop: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    marginHorizontal: 15,
  },
  resetButton: {
    backgroundColor: '#F0F0F0',
  },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  statsIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFFBE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  statsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  statsLabel: {
    fontSize: 14,
    color: '#636E72',
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
});

export default TimerScreen;
