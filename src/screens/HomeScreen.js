import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, AppState, Modal, Image } from 'react-native';
import { Text, Surface, useTheme, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import NotificationService from '../utils/NotificationService';
import StorageService from '../utils/StorageService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
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
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { ToastEvent } from '../components/RewardToast';
import { FONTS } from '../styles/fonts';
import { FLOWER_TYPES, getFlowersInUnlockOrder } from '../config/flowerConfig';

// Plant types with colors (synced with GardenScreen)
const PLANT_TYPES = {
  classic: { name: 'Classic Tree', color: '#4CAF50' },
  rose: { name: 'Rose', color: '#E91E63' },
  sunflower: { name: 'Sunflower', color: '#FFC107' },
  bonsai: { name: 'Bonsai', color: '#795548' },
  cherry: { name: 'Cherry Blossom', color: '#F48FB1' },
  succulent: { name: 'Succulent', color: '#66BB6A' },
};

// Get icon based on stage and plant type
const getStageIcon = (stage, plantId = 'classic') => {
  // Sunflower uses sun icon at later stages
  if (plantId === 'sunflower') {
    if (stage === 0) return faCircle;
    if (stage <= 2) return faSeedling;
    return faSun;
  }
  // Default progression
  if (stage === 0) return faCircle;
  if (stage <= 2) return faSeedling;
  if (stage === 3) return faLeaf;
  return faTree;
};

const HomeScreen = () => {
  const navigation = useNavigation();
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
  const [unlockedFlower, setUnlockedFlower] = useState(null);
  const [lastWakeupInfo, setLastWakeupInfo] = useState(null);
  const [restHistory, setRestHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wakeupHours, setWakeupHours] = useState({});
  const [showRestModal, setShowRestModal] = useState(false);
  const [editingRest, setEditingRest] = useState(null);
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [selectedMinute, setSelectedMinute] = useState(Math.floor(new Date().getMinutes() / 5) * 5);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderHour, setReminderHour] = useState(new Date().getHours());
  const [reminderMinute, setReminderMinute] = useState(0);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  const [activeTab, setActiveTab] = useState('activity');
  const isInitialized = useRef(false);
  const weekScrollRef = useRef(null);
  const hourScrollRef = useRef(null);
  const minuteScrollRef = useRef(null);
  const reminderHourScrollRef = useRef(null);
  const reminderMinuteScrollRef = useRef(null);
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
      const storedStats = await StorageService.getItem('stats') || {};
      const previousTotalRests = storedStats.totalRests || 0;
      const newTotalRests = previousTotalRests + 1;
      storedStats.totalRests = newTotalRests;
      await StorageService.setItem('stats', storedStats);
      setStats(prev => ({ ...prev, totalRests: newTotalRests }));
      
      // Check for newly unlocked flowers
      const flowers = getFlowersInUnlockOrder();
      const newlyUnlocked = flowers.find(
        flower => flower.unlockAtRests > previousTotalRests && flower.unlockAtRests <= newTotalRests
      );
      if (newlyUnlocked) {
        setTimeout(() => {
          setUnlockedFlower(newlyUnlocked);
        }, 500);
      }
      
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

  // Calculate streak data based on rest history
  const calculateStreakData = (history) => {
    const DAILY_GOAL = 4; // 4 rests per day to maintain streak
    const today = new Date();
    const dailyRestCounts = {};
    
    // Count rests per day
    history.forEach(rest => {
      const dateKey = rest.date;
      dailyRestCounts[dateKey] = (dailyRestCounts[dateKey] || 0) + 1;
    });
    
    // Calculate current streak (consecutive days with 4+ rests, going backwards from today)
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Check if today has the goal met
    const todayKey = today.toLocaleDateString();
    const todayRests = dailyRestCounts[todayKey] || 0;
    
    // Start checking from yesterday if today's goal isn't met yet
    if (todayRests < DAILY_GOAL) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Count consecutive days backwards
    for (let i = 0; i < 365; i++) {
      const dateKey = checkDate.toLocaleDateString();
      const restsOnDay = dailyRestCounts[dateKey] || 0;
      
      if (restsOnDay >= DAILY_GOAL) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // Calculate longest streak ever
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Object.keys(dailyRestCounts).sort();
    
    if (sortedDates.length > 0) {
      let prevDate = new Date(sortedDates[0]);
      
      sortedDates.forEach(dateStr => {
        const currentDate = new Date(dateStr);
        const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
        
        if (dailyRestCounts[dateStr] >= DAILY_GOAL) {
          if (dayDiff <= 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
        
        prevDate = currentDate;
      });
    }
    
    return { currentStreak, longestStreak };
  };

  // Get streak status for a specific date
  const getStreakStatusForDate = (date) => {
    const DAILY_GOAL = 4;
    const rests = getRestsForDate(date);
    const restCount = rests.length;
    
    return {
      count: restCount,
      goalMet: restCount >= DAILY_GOAL,
      isToday: isSameDay(date, new Date())
    };
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
      
      // Handle next reminder - only display if still valid, don't auto-schedule
      if (storedNextReminder) {
        const now = Date.now();
        if (storedNextReminder.timestamp > now) {
          setNextReminderTime(storedNextReminder);
        } else {
          // Reminder has passed, clear it
          await StorageService.removeItem('nextReminderTime');
          setNextReminderTime(null);
        }
      }
      
      // Handle stats
      if (storedStats) {
        setStats(storedStats);
      }
      
      // Load garden data
      const storedGardenData = await StorageService.getItem('gardenData');
      if (storedGardenData) {
        setGardenData(storedGardenData);
      }
      
      // Calculate streak data
      const calculatedStreak = calculateStreakData(storedHistory);
      setStreakData(calculatedStreak);
      
      // Check if this is the first time visiting home
      const hasSeenTutorial = await StorageService.getItem('homeTutorialSeen');
      if (!hasSeenTutorial) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissTutorial = async () => {
    setShowTutorial(false);
    await StorageService.setItem('homeTutorialSeen', true);
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
      
      const reminder = await NotificationService.scheduleNextReminder();
      if (reminder) {
        setNextReminderTime(reminder);
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
    const defaultHour = isSameDay(selectedDate, now) ? now.getHours() : 12;
    setSelectedHour(defaultHour);
    setEditingRest(null);
    setShowRestModal(true);
  };

  // Auto-scroll to selected hour and minute when rest modal opens
  useEffect(() => {
    if (showRestModal) {
      setTimeout(() => {
        const itemHeight = 46; // timePickerItem total height (10 padding top + 10 bottom + 18 text + 4 margin top + 4 bottom)
        const scrollViewHeight = 150; // Height of the scroll view
        const centerOffset = (scrollViewHeight - itemHeight) / 2;
        
        // Scroll hour picker
        if (hourScrollRef.current) {
          const hourScrollPosition = selectedHour * itemHeight - centerOffset;
          hourScrollRef.current.scrollTo({ y: Math.max(0, hourScrollPosition), animated: true });
        }
        
        // Scroll minute picker
        if (minuteScrollRef.current) {
          const minuteIndex = selectedMinute / 5; // Convert minute to index (0, 5, 10... -> 0, 1, 2...)
          const minuteScrollPosition = minuteIndex * itemHeight - centerOffset;
          minuteScrollRef.current.scrollTo({ y: Math.max(0, minuteScrollPosition), animated: true });
        }
      }, 100);
    }
  }, [showRestModal, selectedHour, selectedMinute]);

  // Auto-scroll to selected hour and minute when reminder modal opens
  useEffect(() => {
    if (showReminderModal) {
      setTimeout(() => {
        const itemHeight = 46;
        const scrollViewHeight = 150;
        const centerOffset = (scrollViewHeight - itemHeight) / 2;
        
        // Scroll hour picker
        if (reminderHourScrollRef.current) {
          const hourScrollPosition = reminderHour * itemHeight - centerOffset;
          reminderHourScrollRef.current.scrollTo({ y: Math.max(0, hourScrollPosition), animated: true });
        }
        
        // Scroll minute picker
        if (reminderMinuteScrollRef.current) {
          const minuteIndex = reminderMinute / 5;
          const minuteScrollPosition = minuteIndex * itemHeight - centerOffset;
          reminderMinuteScrollRef.current.scrollTo({ y: Math.max(0, minuteScrollPosition), animated: true });
        }
      }, 100);
    }
  }, [showReminderModal, reminderHour, reminderMinute]);

  // Open modal to edit an existing rest
  const openEditRestModal = (rest) => {
    const restDate = new Date(rest.timestamp);
    setSelectedHour(restDate.getHours());
    setSelectedMinute(Math.floor(restDate.getMinutes() / 5) * 5);
    setEditingRest(rest);
    setShowRestModal(true);
  };

  // Save rest (add new or update existing)
  const saveRest = async () => {
    try {
      const restDate = new Date(selectedDate);
      restDate.setHours(selectedHour, selectedMinute, 0, 0);
      
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
        
        // Update stats - get fresh from storage to ensure accuracy
        const storedStats = await StorageService.getItem('stats') || { totalRests: 0 };
        const previousTotalRests = storedStats.totalRests || 0;
        const newTotalRests = previousTotalRests + 1;
        const updatedStats = { ...stats, ...storedStats, totalRests: newTotalRests };
        await StorageService.setItem('stats', updatedStats);
        setStats(updatedStats);
        
        // Check for newly unlocked flowers
        const flowers = getFlowersInUnlockOrder();
        console.log('Checking unlock: previous=', previousTotalRests, 'new=', newTotalRests);
        const newlyUnlocked = flowers.find(
          flower => flower.unlockAtRests > previousTotalRests && flower.unlockAtRests <= newTotalRests
        );
        console.log('Newly unlocked flower:', newlyUnlocked?.name || 'none');
        
        // Award points and grow plant
        await awardPointsForRest();
        
        // Show unlock popup after a short delay (after rest modal closes)
        if (newlyUnlocked) {
          console.log('Setting unlocked flower:', newlyUnlocked.name);
          setTimeout(() => {
            setUnlockedFlower(newlyUnlocked);
          }, 500);
        }
      }

      // Filter to keep only last 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = updatedHistory.filter(h => h.timestamp > thirtyDaysAgo);
      
      await StorageService.setItem('restHistory', filteredHistory);
      setRestHistory(filteredHistory);
      
      // Recalculate streak
      const calculatedStreak = calculateStreakData(filteredHistory);
      setStreakData(calculatedStreak);
      
      setShowRestModal(false);
      setEditingRest(null);
    } catch (error) {
      console.log('Error saving rest:', error);
    }
  };

  // Open reminder edit modal
  const openReminderModal = () => {
    if (nextReminderTime) {
      const reminderDate = new Date(nextReminderTime.timestamp);
      setReminderHour(reminderDate.getHours());
      setReminderMinute(Math.floor(reminderDate.getMinutes() / 5) * 5);
    } else {
      const now = new Date();
      setReminderHour(now.getHours() + 1);
      setReminderMinute(0);
    }
    setShowReminderModal(true);
  };

  // Save new reminder time
  const saveReminderTime = async () => {
    try {
      const reminderDate = new Date();
      reminderDate.setHours(reminderHour, reminderMinute, 0, 0);
      
      // If the time is in the past, set it for tomorrow
      if (reminderDate <= new Date()) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }
      
      await NotificationService.scheduleCustomReminder(reminderDate.getTime());
      
      // Update the displayed time
      setNextReminderTime({
        timestamp: reminderDate.getTime(),
        formattedTime: reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      
      setShowReminderModal(false);
    } catch (error) {
      console.log('Error saving reminder time:', error);
    }
  };

  // Delete a rest
  const deleteRest = async (rest) => {
    try {
      const updatedHistory = restHistory.filter(r => r.timestamp !== rest.timestamp);
      await StorageService.setItem('restHistory', updatedHistory);
      setRestHistory(updatedHistory);
      
      // Recalculate streak
      const calculatedStreak = calculateStreakData(updatedHistory);
      setStreakData(calculatedStreak);
      
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

  // Plant growth stages and points
  const PLANT_STAGES = ['seed', 'sprout', 'seedling', 'growing', 'mature', 'blooming'];
  const POINTS_PER_REST = 10;
  const POINTS_TO_GROW = 50; // Points needed to advance to next stage
  
  // Award energy to sunflower garden and grow all planted flowers
  const awardPointsForRest = async () => {
    // Update sunflower garden energy and grow all planted flowers
    const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || { energy: 0.5, plots: [] };
    const energyGained = 0.25; // 25% energy per rest
    const newEnergy = Math.min(1.0, (sunflowerGarden.energy || 0.5) + energyGained);
    
    // Increment restsGiven for ALL planted flowers
    const updatedPlots = (sunflowerGarden.plots || []).map(plot => {
      if (plot.flowerType && plot.isUnlocked) {
        return {
          ...plot,
          restsGiven: (plot.restsGiven || 0) + 1,
        };
      }
      return plot;
    });
    
    await StorageService.setItem('sunflowerGarden', {
      ...sunflowerGarden,
      plots: updatedPlots,
      energy: newEnergy,
      lastEnergyUpdate: Date.now(),
    });
    
    // Show toast notification for energy gained
    ToastEvent.show('energy', Math.round(energyGained * 100), 'Rest completed!');
  };

  // Get plant icon based on growth stage
  const getPlantIcon = (stage) => {
    switch (stage) {
      case 'seed': return faSeedling;
      case 'sprout': return faSeedling;
      case 'seedling': return faLeaf;
      case 'growing': return faLeaf;
      case 'mature': return faTree;
      case 'blooming': return faTree;
      default: return faSeedling;
    }
  };

  // Get plant color based on growth stage
  const getPlantColor = (stage) => {
    switch (stage) {
      case 'seed': return '#8B4513';
      case 'sprout': return '#90EE90';
      case 'seedling': return '#32CD32';
      case 'growing': return '#228B22';
      case 'mature': return '#006400';
      case 'blooming': return '#FF69B4';
      default: return '#90EE90';
    }
  };

  // Get plant size based on growth stage
  const getPlantSize = (stage) => {
    const sizes = { seed: 24, sprout: 32, seedling: 40, growing: 48, mature: 56, blooming: 64 };
    return sizes[stage] || 32;
  };

  // Calculate progress to next stage
  const getGrowthProgress = () => {
    const currentStageIndex = PLANT_STAGES.indexOf(gardenData.currentPlant);
    const pointsForCurrentStage = currentStageIndex * POINTS_TO_GROW;
    const pointsForNextStage = (currentStageIndex + 1) * POINTS_TO_GROW;
    const progressPoints = gardenData.points - pointsForCurrentStage;
    const neededPoints = pointsForNextStage - pointsForCurrentStage;
    return Math.min(1, Math.max(0, progressPoints / neededPoints));
  };

  // Generate hours for the hour picker (all 24 hours)
  const getAvailableHours = () => {
    return Array.from({ length: 24 }, (_, i) => i);
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

  // Streak Circle Component
  const StreakCircle = ({ date }) => {
    const status = getStreakStatusForDate(date);
    const dayLabel = date.toLocaleDateString([], { weekday: 'short' }).substring(0, 1);
    
    return (
      <View style={styles.streakCircleContainer}>
        <View style={[
          styles.streakCircle,
          status.goalMet && styles.streakCircleComplete,
          status.isToday && styles.streakCircleToday,
          !status.goalMet && status.count > 0 && styles.streakCirclePartial,
        ]}>
          {status.goalMet && (
            <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" />
          )}
          {!status.goalMet && status.count > 0 && (
            <Text style={styles.streakCircleCount}>{status.count}</Text>
          )}
        </View>
        <Text style={[
          styles.streakCircleLabel,
          status.isToday && styles.streakCircleLabelToday,
        ]}>{dayLabel}</Text>
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

  // Get plant theme color for gems display
  const plantTheme = PLANT_TYPES[gardenData.selectedPlantType] || PLANT_TYPES.classic;
  const plantColor = plantTheme.color;

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
            <Text style={styles.tutorialTitle}>Welcome to Rest & Recharge!</Text>
            <Text style={styles.tutorialText}>
              Take regular breaks to rest your eyes and stay refreshed throughout the day.
            </Text>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faSun} size={16} color="#FFE66D" />
              <Text style={styles.tutorialStepText}>
                Log your wake-up time each morning
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faBell} size={16} color="#FF6B6B" />
              <Text style={styles.tutorialStepText}>
                Get reminders for regular eye rests
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faBolt} size={16} color="#FFC107" />
              <Text style={styles.tutorialStepText}>
                Earn energy and grow your sunflower
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

      {/* Flower Unlocked Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={unlockedFlower !== null}
        onRequestClose={() => setUnlockedFlower(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Flower Unlocked!</Text>
              <TouchableOpacity
                onPress={() => setUnlockedFlower(null)}
                style={styles.modalCloseButton}
              >
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            
            {unlockedFlower && (
              <View style={styles.unlockModalBody}>
                <View style={[styles.unlockFlowerCircle, { borderColor: unlockedFlower.color }]}>
                  <Image
                    source={unlockedFlower.growthStages[unlockedFlower.growthStages.length - 1].image}
                    style={styles.unlockFlowerImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.unlockFlowerName}>{unlockedFlower.name}</Text>
                <Text style={[styles.unlockFlowerRarity, { color: unlockedFlower.color }]}>
                  {unlockedFlower.rarity}
                </Text>
                <Text style={styles.unlockFlowerDescription}>
                  {unlockedFlower.description}
                </Text>
              </View>
            )}
            
            <View style={styles.unlockModalButtons}>
              <TouchableOpacity 
                style={styles.unlockModalSecondaryButton}
                onPress={() => setUnlockedFlower(null)}
              >
                <Text style={styles.unlockModalSecondaryButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.unlockModalPrimaryButton, { backgroundColor: unlockedFlower?.color || '#4CAF50' }]}
                onPress={() => {
                  setUnlockedFlower(null);
                  navigation.navigate('GardenOverview');
                }}
              >
                <Text style={styles.unlockModalPrimaryButtonText}>Go to Garden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Minimal Header */}
        <View style={styles.minimalHeader}>
          <Text style={styles.minimalHeaderTitle}>Rest & Recharge</Text>
          <TouchableOpacity 
            style={styles.settingsIconButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <FontAwesomeIcon icon={faGear} size={28} color="#B2BEC3" />
          </TouchableOpacity>
        </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Status Section - Flat Design */}
        {(() => {
          const plantType = PLANT_TYPES[gardenData.selectedPlantType] || PLANT_TYPES.classic;
          const plantProgress = gardenData.plantProgress?.[gardenData.selectedPlantType] || { stage: 0, points: 0 };
          const isFullyGrown = plantProgress.stage >= 5;
          const stageProgressPercent = isFullyGrown ? 100 : (plantProgress.points / 30) * 100;
          return (
            <>


              {/* Quick Actions Grid */}
              <View style={styles.flatActionsGrid}>
                <TouchableOpacity
                  onPress={!wakeupTime ? logWakeupTime : null}
                  activeOpacity={wakeupTime ? 1 : 0.7}
                  style={[styles.flatActionCard, wakeupTime && styles.flatActionCardDone]}
                >
                  <FontAwesomeIcon
                    icon={wakeupTime ? faCheck : faSun}
                    size={20}
                    color={wakeupTime ? '#10B981' : '#F59E0B'}
                  />
                  <Text style={styles.flatActionLabel}>{wakeupTime ? 'Woke up' : 'Log wake-up'}</Text>
                  <Text style={styles.flatActionValue}>
                    {wakeupTime ? wakeupTime.formattedTime : 'Tap here'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={openReminderModal}
                  activeOpacity={0.7}
                  style={styles.flatActionCard}
                >
                  <FontAwesomeIcon icon={faBell} size={20} color="#EF4444" />
                  <Text style={styles.flatActionLabel}>Next reminder</Text>
                  <Text style={styles.flatActionValue}>
                    {nextReminderTime ? nextReminderTime.formattedTime : 'Set time'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.flatActionCard}>
                  <FontAwesomeIcon icon={faFire} size={20} color="#3B82F6" />
                  <Text style={styles.flatActionLabel}>Today's rests</Text>
                  <Text style={styles.flatActionValue}>{getRestsForDate(new Date()).length}</Text>
                </View>
              </View>
            </>
          );
        })()}

        {/* Flat Tab Navigation */}
        <View style={styles.flatTabContainer}>
          <TouchableOpacity
            style={[styles.flatTab, activeTab === 'activity' && styles.flatTabActive]}
            onPress={() => setActiveTab('activity')}
            activeOpacity={0.7}
          >
            <Text style={[styles.flatTabText, activeTab === 'activity' && styles.flatTabTextActive]}>
              Activity
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.flatTab, activeTab === 'streak' && styles.flatTabActive]}
            onPress={() => setActiveTab('streak')}
            activeOpacity={0.7}
          >
            <Text style={[styles.flatTabText, activeTab === 'streak' && styles.flatTabTextActive]}>
              Streak
            </Text>
          </TouchableOpacity>
        </View>

        {/* Activity Tab Content */}
        {activeTab === 'activity' && (
          <>
        {/* Day Selector - Simplified */}
        <View style={styles.daySelector}>
          {getLast7Days().slice(-5).map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentDay = isSameDay(date, new Date());
            const rests = getRestsForDate(date);
            const dayLetter = isCurrentDay ? 'Today' : date.toLocaleDateString([], { weekday: 'short' }).charAt(0);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
                style={[styles.dayItem, isSelected && styles.dayItemSelected]}
              >
                <Text style={[styles.dayLetter, isSelected && styles.dayLetterSelected]}>{dayLetter}</Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{date.getDate()}</Text>
                {rests.length > 0 && <View style={[styles.dayDot, isSelected && styles.dayDotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline Card - Flat */}
        <View style={styles.flatCard}>
          <View style={styles.flatCardHeader}>
            <TouchableOpacity onPress={goToPreviousDay} style={styles.flatNavButton}>
              <FontAwesomeIcon icon={faChevronLeft} size={14} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.flatCardTitle}>{formatDateHeader(selectedDate)}</Text>
            <TouchableOpacity
              onPress={goToNextDay}
              style={[styles.flatNavButton, isSelectedToday && styles.flatNavButtonDisabled]}
              disabled={isSelectedToday}
            >
              <FontAwesomeIcon icon={faChevronRight} size={14} color={isSelectedToday ? '#D1D5DB' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timelineScrollContent}>
              <DayTimeline date={selectedDate} rests={selectedDateRests} />
            </View>
          </ScrollView>

          <View style={styles.flatLegend}>
            <View style={styles.flatLegendItem}>
              <View style={styles.flatLegendDiamond} />
              <Text style={styles.flatLegendText}>Rested</Text>
            </View>
            <View style={styles.flatLegendItem}>
              <View style={[styles.flatLegendLine, { backgroundColor: '#10B981' }]} />
              <Text style={styles.flatLegendText}>On track</Text>
            </View>
            <View style={styles.flatLegendItem}>
              <View style={[styles.flatLegendLine, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.flatLegendText}>Needs rest</Text>
            </View>
          </View>
        </View>

        {/* Rest List - Flat */}
        <View style={styles.flatCard}>
          <View style={styles.flatCardHeader}>
            <Text style={styles.flatCardTitle}>
              {selectedDateRests.length > 0 ? 'Completed Rests' : 'No rests yet'}
            </Text>
            <TouchableOpacity
              style={styles.flatAddButton}
              onPress={openAddRestModal}
              activeOpacity={0.7}
            >
              <FontAwesomeIcon icon={faPlus} size={12} color="#10B981" />
              <Text style={styles.flatAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {selectedDateRests.length > 0 ? (
            <View style={styles.flatRestList}>
              {[...selectedDateRests]
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((rest, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.flatRestItem}
                    onPress={() => openEditRestModal(rest)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.flatRestDot} />
                    <Text style={styles.flatRestTime}>{rest.time}</Text>
                    <FontAwesomeIcon icon={faPencil} size={12} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
            </View>
          ) : (
            <View style={styles.flatEmptyState}>
              <Text style={styles.flatEmptyText}>
                {isSelectedToday ? 'Start your first rest session' : 'No rests recorded'}
              </Text>
            </View>
          )}
        </View>

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
              <Text style={styles.modalLabel}>Select Time</Text>
              <View style={styles.timePickerRow}>
                {/* Hour Picker */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Hour</Text>
                  <ScrollView 
                    ref={hourScrollRef}
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.timePickerScrollContent}
                  >
                    {getAvailableHours().map(hour => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timePickerItem,
                          selectedHour === hour && styles.timePickerItemSelected,
                        ]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            selectedHour === hour && styles.timePickerItemTextSelected,
                          ]}
                        >
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <Text style={styles.timePickerSeparator}>:</Text>
                
                {/* Minute Picker (5-min intervals) */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Min</Text>
                  <ScrollView 
                    ref={minuteScrollRef}
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.timePickerScrollContent}
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(minute => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timePickerItem,
                          selectedMinute === minute && styles.timePickerItemSelected,
                        ]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            selectedMinute === minute && styles.timePickerItemTextSelected,
                          ]}
                        >
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.modalNote}>
                Logging rest for {formatDateHeader(selectedDate)} at{' '}
                {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
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
                <TouchableOpacity style={styles.saveButton} onPress={saveRest}>
                  <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Reminder Time Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReminderModal}
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Reminder Time</Text>
              <TouchableOpacity
                onPress={() => setShowReminderModal(false)}
                style={styles.modalCloseButton}
              >
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>When should we remind you?</Text>
              <View style={styles.timePickerRow}>
                {/* Hour Picker */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Hour</Text>
                  <ScrollView 
                    ref={reminderHourScrollRef}
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.timePickerScrollContent}
                  >
                    {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timePickerItem,
                          reminderHour === hour && styles.timePickerItemSelected,
                        ]}
                        onPress={() => setReminderHour(hour)}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            reminderHour === hour && styles.timePickerItemTextSelected,
                          ]}
                        >
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <Text style={styles.timePickerSeparator}>:</Text>
                
                {/* Minute Picker (5-min intervals) */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.timePickerLabel}>Min</Text>
                  <ScrollView 
                    ref={reminderMinuteScrollRef}
                    style={styles.timePickerScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.timePickerScrollContent}
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(minute => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timePickerItem,
                          reminderMinute === minute && styles.timePickerItemSelected,
                        ]}
                        onPress={() => setReminderMinute(minute)}
                      >
                        <Text
                          style={[
                            styles.timePickerItemText,
                            reminderMinute === minute && styles.timePickerItemTextSelected,
                          ]}
                        >
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <Text style={styles.modalNote}>
                Next reminder at {reminderHour.toString().padStart(2, '0')}:{reminderMinute.toString().padStart(2, '0')}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <View style={styles.modalFooterButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowReminderModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveReminderTime}>
                  <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

          </>
        )}

        {/* Streak Tab Content */}
        {activeTab === 'streak' && (
          <>
            {/* Streak Stats Row */}
            <View style={styles.flatStreakStats}>
              <View style={styles.flatStreakMain}>
                <FontAwesomeIcon icon={faFire} size={28} color="#EF4444" />
                <Text style={styles.flatStreakNumber}>{streakData.currentStreak}</Text>
                <Text style={styles.flatStreakLabel}>day streak</Text>
              </View>
              <View style={styles.flatStreakBest}>
                <Text style={styles.flatStreakBestLabel}>Best</Text>
                <Text style={styles.flatStreakBestNum}>{streakData.longestStreak}</Text>
              </View>
            </View>

            {/* Week Progress - Flat */}
            <View style={styles.flatCard}>
              <Text style={styles.flatCardTitle}>This Week</Text>
              <View style={styles.flatStreakWeek}>
                {getLast7Days().map((date, index) => {
                  const status = getStreakStatusForDate(date);
                  const dayLabel = date.toLocaleDateString([], { weekday: 'short' }).substring(0, 2);
                  return (
                    <View key={index} style={styles.flatStreakDay}>
                      <View style={[
                        styles.flatStreakCircle,
                        status.goalMet && styles.flatStreakCircleDone,
                        status.isToday && styles.flatStreakCircleToday,
                        !status.goalMet && status.count > 0 && styles.flatStreakCirclePartial,
                      ]}>
                        {status.goalMet ? (
                          <FontAwesomeIcon icon={faCheck} size={14} color="#FFFFFF" />
                        ) : status.count > 0 ? (
                          <Text style={styles.flatStreakCount}>{status.count}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.flatStreakDayLabel, status.isToday && styles.flatStreakDayLabelToday]}>
                        {dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.flatStreakGoal}>Complete 4 rests per day to maintain streak</Text>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  // Base Container
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
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Minimal Header
  minimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  minimalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#505255',
    fontFamily: FONTS.regular,
  },
  settingsIconButton: {
    padding: 8,
  },

  // Flat Plant Row
  flatPlantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  flatPlantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatPlantInfo: {
    flex: 1,
    marginLeft: 14,
  },
  flatPlantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flatPlantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  flatGemsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flatGemsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flatProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flatProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  flatProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  flatProgressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    minWidth: 50,
    textAlign: 'right',
  },

  // Flat Actions Grid
  flatActionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  flatActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  flatActionCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  flatActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  flatActionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },

  // Flat Tab Navigation
  flatTabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  flatTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  flatTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1F2937',
  },
  flatTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  flatTabTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },

  // Day Selector - Simplified
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayItemSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  dayLetter: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dayLetterSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 8,
  },
  dayDotSelected: {
    backgroundColor: '#FFFFFF',
  },

  // Flat Card
  flatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  flatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flatCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  flatNavButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatNavButtonDisabled: {
    backgroundColor: '#FAFAFA',
  },

  // Flat Legend
  flatLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  flatLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flatLegendDiamond: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#10B981',
  },
  flatLegendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  flatLegendText: {
    fontSize: 11,
    color: '#6B7280',
  },

  // Flat Add Button
  flatAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
  },
  flatAddButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },

  // Flat Rest List
  flatRestList: {
    gap: 10,
  },
  flatRestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  flatRestDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  flatRestTime: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  flatEmptyState: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  flatEmptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  // Flat Streak Styles
  flatStreakStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  flatStreakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flatStreakNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
  },
  flatStreakLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  flatStreakBest: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  flatStreakBestLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flatStreakBestNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D97706',
  },
  flatStreakWeek: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  flatStreakDay: {
    alignItems: 'center',
    gap: 6,
  },
  flatStreakCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatStreakCircleDone: {
    backgroundColor: '#10B981',
  },
  flatStreakCircleToday: {
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  flatStreakCirclePartial: {
    backgroundColor: '#FDE68A',
  },
  flatStreakCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  flatStreakDayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  flatStreakDayLabelToday: {
    color: '#1F2937',
    fontWeight: '600',
  },
  flatStreakGoal: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Tip Container
  tipContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
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
    color: '#9CA3AF',
  },
  weekOverviewCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
  timelineScrollContent: {
    minWidth: 500,
    paddingRight: 10,
  },
  timelineLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  timelineSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timelineMarkerContainer: {
    width: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDiamond: {
    width: 18,
    height: 18,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDiamondCurrent: {
    backgroundColor: '#EF4444',
  },
  timelineDiamondInner: {
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '0deg' }],
  },
  timelineSmallDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9CA3AF',
  },
  timelineSmallDotFuture: {
    backgroundColor: '#E5E7EB',
  },
  timelineSmallDotCurrent: {
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timelineLineSegment: {
    flex: 1,
    height: 3,
    backgroundColor: '#10B981',
    marginHorizontal: -2,
  },
  timelineLineWarning: {
    backgroundColor: '#F59E0B',
  },
  timelineLineFuture: {
    backgroundColor: '#E5E7EB',
  },
  timelineLabelsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  timelineLabelSlot: {
    flex: 1,
    alignItems: 'center',
  },
  timelineHour: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timePickerColumn: {
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 8,
  },
  timePickerScroll: {
    height: 150,
    width: 70,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timePickerScrollContent: {
    paddingVertical: 8,
  },
  timePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    marginVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  timePickerItemSelected: {
    backgroundColor: '#1F2937',
  },
  timePickerItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#636E72',
  },
  timePickerItemTextSelected: {
    color: '#FFFFFF',
  },
  timePickerSeparator: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
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
    borderTopColor: '#E5E7EB',
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
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 40,
    marginBottom: 12,
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
  // Streak Card Styles
  streakCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCurrentNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  streakCurrentLabel: {
    fontSize: 13,
    color: '#95A5A6',
    fontWeight: '500',
  },
  streakBestContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  streakBestLabel: {
    fontSize: 11,
    color: '#F39C12',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakBestNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F39C12',
    marginTop: 2,
  },
  streakDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 20,
  },
  streakCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  streakCircleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  streakCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  streakCircleComplete: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  streakCircleToday: {
    borderColor: '#FFE66D',
    borderWidth: 3,
    shadowColor: '#FFE66D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  streakCirclePartial: {
    backgroundColor: '#FFE4B5',
    borderColor: '#FFE4B5',
  },
  streakCircleCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F39C12',
  },
  streakCircleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#95A5A6',
  },
  streakCircleLabelToday: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  streakGoalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  streakGoalText: {
    fontSize: 12,
    color: '#95A5A6',
    fontStyle: 'italic',
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#95A5A6',
  },
  tabTextActive: {
    color: '#2C3E50',
  },
  // Unlock Modal Styles
  unlockModalBody: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  unlockFlowerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockFlowerImage: {
    width: 80,
    height: 80,
  },
  unlockFlowerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 4,
  },
  unlockFlowerRarity: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  unlockFlowerDescription: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  unlockModalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  unlockModalSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  unlockModalSecondaryButtonText: {
    color: '#636E72',
    fontSize: 15,
    fontWeight: '600',
  },
  unlockModalPrimaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockModalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeScreen;
