import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, AppState } from 'react-native';
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
  const [lastWakeupInfo, setLastWakeupInfo] = useState(null);
  const theme = useTheme();

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen focused - refreshing data');
      loadData();
      updateGreeting();
    }, [])
  );

  // Also refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App active - refreshing HomeScreen data');
        loadData();
        updateGreeting();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

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

  const loadData = async () => {
    try {
      const storedWakeupTime = await StorageService.getItem('wakeupTime');
      const storedNextReminder = await StorageService.getItem('nextReminderTime');
      const storedStats = await StorageService.getItem('stats');
      
      // Handle wakeup time
      if (storedWakeupTime) {
        if (isToday(storedWakeupTime.date)) {
          setWakeupTime(storedWakeupTime);
        } else {
          setLastWakeupInfo(storedWakeupTime);
          setWakeupTime(null);
        }
      }
      
      // Handle next reminder - check if it's still valid
      if (storedNextReminder) {
        const now = Date.now();
        if (storedNextReminder.timestamp > now) {
          // Reminder is still in the future
          setNextReminderTime(storedNextReminder);
        } else {
          // Reminder has passed, schedule a new one
          console.log('Stored reminder has passed, scheduling new one');
          const newReminder = await NotificationService.scheduleNextReminder();
          setNextReminderTime(newReminder);
        }
      } else {
        // No reminder exists, schedule one
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
      
      // Schedule reminders based on wakeup time
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting} {greetingIcon}</Text>
        <Text style={styles.title}>Rest & Recharge</Text>
      </View>

      <TouchableOpacity 
        onPress={!wakeupTime ? logWakeupTime : null}
        activeOpacity={wakeupTime ? 1 : 0.8}
        style={styles.bigCardContainer}
      >
        <ImageBackground 
          source={wakeupTime ? require('../../background_01.jpeg') : require('../../background_02.jpeg')}
          style={styles.bigCard}
          imageStyle={styles.backgroundImage}
        >
          <View style={[styles.bigCardOverlay, { backgroundColor: 'rgba(0,0,0,0.0)' }]}>
            <View style={styles.bigCardIcon}>
              <FontAwesomeIcon 
                icon={wakeupTime ? faCheck : faSun} 
                size={60} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.bigCardTitle}>
              {wakeupTime ? "You're Up! 🎉" : "Log Wake-up"}
            </Text>
            <Text style={styles.bigCardSubtitle}>
              {wakeupTime 
                ? `Woke up at ${wakeupTime.formattedTime}` 
                : "Tap to start your day!"
              }
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>

      {!wakeupTime && lastWakeupInfo && (
        <Surface style={styles.lastWakeupCard}>
          <View style={styles.lastWakeupIconContainer}>
            <FontAwesomeIcon icon={faCalendarDay} size={24} color="#636E72" />
          </View>
          <View style={styles.lastWakeupContent}>
            <Text style={styles.lastWakeupLabel}>Last Wake-up</Text>
            <Text style={styles.lastWakeupInfo}>
              {lastWakeupInfo.formattedTime} on {lastWakeupInfo.date}
            </Text>
          </View>
        </Surface>
      )}

      {nextReminderTime && (
        <Surface style={styles.reminderCard}>
          <View style={styles.reminderIconContainer}>
            <FontAwesomeIcon icon={faBell} size={32} color="#FF6B6B" />
          </View>
          <View style={styles.reminderContent}>
            <Text style={styles.reminderLabel}>Next Eye Rest</Text>
            <Text style={styles.reminderTime}>{nextReminderTime.formattedTime}</Text>
          </View>
        </Surface>
      )}

      <Text style={styles.sectionTitle}>Your Progress</Text>
      
      <View style={styles.statsRow}>
        <Surface style={[styles.statCard, { backgroundColor: '#4ECDC4' }]}>
          <FontAwesomeIcon icon={faEyeSlash} size={36} color="#FFFFFF" />
          <Text style={[styles.statNumber, { color: '#FFFFFF' }]}>{stats.totalRests}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Eye Rests</Text>
        </Surface>
        
        <Surface style={[styles.statCard, { backgroundColor: '#FF6B6B' }]}>
          <FontAwesomeIcon icon={faFire} size={36} color="#FFFFFF" />
          <Text style={[styles.statNumber, { color: '#FFFFFF' }]}>{stats.streakDays}</Text>
          <Text style={[styles.statLabel, { color: '#FFFFFF' }]}>Streak 🔥</Text>
        </Surface>
      </View>

      <Surface style={styles.tipCard}>
        <Text style={styles.tipEmoji}>💡</Text>
        <Text style={styles.tipText}>
          Rest your eyes every 2 hours for 20 minutes to stay fresh and energized!
        </Text>
      </Surface>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  bigCardContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  bigCard: {
    width: '100%',
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    borderRadius: 30,
    opacity: 0.85,
  },
  bigCardOverlay: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  bigCardIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  bigCardTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bigCardSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  lastWakeupCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  lastWakeupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastWakeupContent: {
    marginLeft: 12,
    flex: 1,
  },
  lastWakeupLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '600',
  },
  lastWakeupInfo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  reminderCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  reminderIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderContent: {
    marginLeft: 16,
    flex: 1,
  },
  reminderLabel: {
    fontSize: 14,
    color: '#636E72',
    fontWeight: '600',
  },
  reminderTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginHorizontal: 24,
    marginTop: 30,
    marginBottom: 16,
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
  tipText: {
    flex: 1,
    fontSize: 16,
    color: '#636E72',
    lineHeight: 24,
  },
  bottomPadding: {
    height: 100,
  },
});

export default HomeScreen;
