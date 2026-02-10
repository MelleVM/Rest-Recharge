import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Vibration, TouchableOpacity, AppState, PermissionsAndroid, Platform, ScrollView, Modal } from 'react-native';
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
import Svg, { Circle } from 'react-native-svg';
import StorageService from '../utils/StorageService';
import NotificationService from '../utils/NotificationService';
import { ToastEvent } from '../components/RewardToast';
import { FONTS } from '../styles/fonts';

// Plant colors (synced with GardenScreen)
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
  { text: "Rest is not idleness, it is the key to greater productivity.", author: "John Lubbock" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Almost everything will work again if you unplug it for a few minutes.", author: "Anne Lamott" },
  { text: "Your calm mind is the ultimate weapon against your challenges.", author: "Bryant McGill" },
  { text: "The time to relax is when you don't have time for it.", author: "Sydney J. Harris" },
  { text: "Tension is who you think you should be. Relaxation is who you are.", author: "Chinese Proverb" },
  { text: "Rest when you're weary. Refresh and renew yourself.", author: "Ralph Marston" },
  { text: "Sometimes the most productive thing you can do is rest.", author: "Mark Black" },
  { text: "Your eyes are the windows to your soul. Take care of them.", author: "Unknown" },
  { text: "A moment of patience in a moment of anger saves a thousand moments of regret.", author: "Ali Ibn Abi Talib" },
  { text: "Breathe. Let go. And remind yourself that this very moment is the only one you know you have for sure.", author: "Oprah Winfrey" },
  { text: "Self-care is not selfish. You cannot serve from an empty vessel.", author: "Eleanor Brown" },
  { text: "In the midst of movement and chaos, keep stillness inside of you.", author: "Deepak Chopra" },
  { text: "Give your stress wings and let it fly away.", author: "Terri Guillemets" },
  { text: "The greatest weapon against stress is our ability to choose one thought over another.", author: "William James" },
];

const TimerScreen = () => {
  const navigation = useNavigation();
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(() => 
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );
  const [totalTime, setTotalTime] = useState(0);
  const [completedRests, setCompletedRests] = useState(0);
  const [gardenData, setGardenData] = useState({ points: 0 });
  const [showTutorial, setShowTutorial] = useState(false);
  const endTimeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const appState = useRef(AppState.currentState);
  const isInitialized = useRef(false);
  const isActiveRef = useRef(false);
  const theme = useTheme();

  // Keep refs in sync with state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

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
        await checkForCompletedTimer();
        
        // If timer is still active, verify it hasn't completed
        if (isActiveRef.current && endTimeRef.current) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
          if (remaining <= 0) {
            console.log('Timer completed while in background');
            NotificationService.stopTimerNotification();
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
        
        // Only update duration if timer is not active
        if (!isActiveRef.current) {
          const settings = await NotificationService.getSettings();
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
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    setTotalTime(durationSeconds);
    
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
      history.push({
        timestamp,
        date: new Date(timestamp).toLocaleDateString(),
        time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      // Keep only last 30 days of history
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(h => h.timestamp > thirtyDaysAgo);
      await StorageService.setItem('restHistory', filteredHistory);
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
    
    // Clear timer state
    await NotificationService.clearTimerState();
    await NotificationService.stopTimerNotification();
    
    // Reminder was already pre-scheduled when timer started, no need to schedule again
    
    // Clean up the stored completion time
    await StorageService.removeItem('lastCompletionTime');
    
    // Reset UI state
    setIsActive(false);
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
    lastUpdateRef.current = Date.now();
    
    const tick = () => {
      if (!endTimeRef.current) return;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
      
      // Only update state once per second
      const lastSecond = Math.floor((endTimeRef.current - lastUpdateRef.current) / 1000);
      if (remaining !== lastSecond || remaining === 0) {
        lastUpdateRef.current = now;
        
        if (remaining <= 0) {
          // Stop Live Activity and notification immediately when timer completes
          NotificationService.stopTimerNotification();
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
      setIsActive(true);
      
      await NotificationService.startTimerNotification(newEndTime, false);
      startTimerLoop();
    }
  };

  const cancel = async () => {
    stopTimer();
    
    // Award reduced gems for canceling (5 instead of 10)
    const currentGardenData = await StorageService.getItem('gardenData') || { points: 0 };
    const updatedGardenData = {
      ...currentGardenData,
      points: (currentGardenData.points || 0) + 5,
    };
    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
    
    // Show toast notification
    ToastEvent.show('energy', 0, 'Timer cancelled');
    
    // Stop timer and clear state
    await NotificationService.stopTimerNotification();
    await NotificationService.clearTimerState();
    
    // Schedule next reminder from now (cancels the pre-scheduled one)
    await NotificationService.scheduleNextReminder();
    
    // Reset UI
    const settings = await NotificationService.getSettings();
    const durationMinutes = settings.restDuration || 20;
    const durationSeconds = durationMinutes * 60;
    
    setIsActive(false);
    setTime(durationSeconds);
    setTotalTime(durationSeconds);
    endTimeRef.current = null;
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
    
    // Clear timer state and stop notification
    await NotificationService.stopTimerNotification();
    await NotificationService.clearTimerState();
    
    // Store completion time for history tracking
    await StorageService.setItem('lastCompletionTime', completionTime);
    
    // Reminder was already pre-scheduled when timer started, no need to schedule again
    
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
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialModal}>
            <Text style={styles.tutorialTitle}>Eye Rest Timer</Text>
            <Text style={styles.tutorialText}>
              Give your eyes a break with timed rest sessions. Close your eyes and relax while the timer counts down.
            </Text>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faPlay} size={16} color="#4ECDC4" />
              <Text style={styles.tutorialStepText}>
                Press play to start your rest session
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faEye} size={16} color="#FF6B6B" />
              <Text style={styles.tutorialStepText}>
                Close your eyes and relax until the timer ends
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faBolt} size={16} color="#FFC107" />
              <Text style={styles.tutorialStepText}>
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

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Rest & Recharge</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <FontAwesomeIcon icon={faGear} size={28} color="#B2BEC3" />
          </TouchableOpacity>
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
              {!isActive && time === 0
                ? "Click to collect your reward 💎"
                : isActive 
                  ? "Relax your eyes" 
                  : "Start when ready"
              }
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        {isActive ? (
          <TouchableOpacity 
            style={[styles.controlButton, styles.cancelButton]} 
            onPress={cancel}
          >
            <FontAwesomeIcon icon={faTimes} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={start}
          >
            <FontAwesomeIcon icon={faPlay} size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.quoteCard}>
        <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
        <Text style={styles.quoteAuthor}>— {currentQuote.author}</Text>
      </View>

      <View style={styles.bottomPadding} />
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#2D3436',
    lineHeight: 24,
    textAlign: 'center',
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#636E72',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tutorialModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
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
    color: '#2D3436',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 15,
    color: '#636E72',
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
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  tutorialStepText: {
    fontSize: 14,
    color: '#2D3436',
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
});

export default TimerScreen;
