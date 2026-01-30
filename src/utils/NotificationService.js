import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import StorageService from './StorageService';
import LiveActivityService from './LiveActivityService';

class NotificationService {
  constructor() {
    this.configure();
    this.defaultSettings = {
      notificationsEnabled: true,
      vibrationEnabled: true,
      darkModeEnabled: false,
      restInterval: 120,
      restDuration: 20,
      temporaryInterval: null,
      wakeupNotificationEnabled: true,
      quietHoursStart: 22, // 10 PM
      quietHoursEnd: 7,    // 7 AM
    };
  }

  // Check if a given time is during quiet hours (night time)
  isQuietHours = (date, settings) => {
    const hour = date.getHours();
    const start = settings.quietHoursStart ?? 22;
    const end = settings.quietHoursEnd ?? 7;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return hour >= start || hour < end;
    }
    // Handle same-day quiet hours (e.g., 01:00 to 06:00)
    return hour >= start && hour < end;
  };

  // Get the next time after quiet hours end (2 hours after usual wake-up time)
  getNextActiveTime = async (date, settings) => {
    const nextActive = new Date(date);
    
    if (this.isQuietHours(date, settings)) {
      // Get the user's usual wake-up time
      const onboardingData = await StorageService.getItem('onboardingData');
      let wakeupHour = settings.quietHoursEnd ?? 7; // Default to quiet hours end
      let wakeupMinute = 0;
      
      if (onboardingData && onboardingData.usualWakeupTime) {
        wakeupHour = onboardingData.usualWakeupTime.hour;
        wakeupMinute = onboardingData.usualWakeupTime.minute || 0;
      }
      
      // Schedule 2 hours after usual wake-up time
      nextActive.setHours(wakeupHour, wakeupMinute, 0, 0);
      nextActive.setHours(nextActive.getHours() + 2);
      
      // If we're past midnight but before wake-up, it's the same day
      // If we're before midnight, it's the next day
      if (date.getHours() >= (settings.quietHoursStart ?? 22)) {
        nextActive.setDate(nextActive.getDate() + 1);
      }
    }
    
    return nextActive;
  };

  configure = (navigationCallback) => {
    this.navigationCallback = navigationCallback;
    
    PushNotification.configure({
      onNotification: (notification) => {
        console.log('NOTIFICATION:', notification);
        console.log('Notification data:', notification.data);
        console.log('Notification userInfo:', notification.userInfo);
        
        if (notification.userInteraction) {
          console.log('User tapped on notification');
          
          // Check both data and userInfo for cross-platform compatibility
          const screen = notification.data?.screen || notification.userInfo?.screen;
          console.log('Screen to navigate to:', screen);
          
          if (screen === 'Timer' && this.navigationCallback) {
            console.log('Navigating to Timer screen');
            this.navigationCallback('Timer');
          } else {
            console.log('Navigation callback not available or no screen specified');
          }
        }
        
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    });

    this.createDefaultChannel();
    this.createTimerChannel();
    this.createWakeupChannel();
  };

  createDefaultChannel = () => {
    PushNotification.createChannel(
      {
        channelId: 'eye-rest-reminders',
        channelName: 'Eye Rest Reminders',
        channelDescription: 'Reminders to rest your eyes',
        playSound: true,
        soundName: 'alarm.wav',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Reminders channel created: ${created}`)
    );
  };

  createTimerChannel = () => {
    PushNotification.createChannel(
      {
        channelId: 'eye-rest-timer',
        channelName: 'Eye Rest Timer',
        channelDescription: 'Shows the active eye rest timer',
        playSound: false,
        importance: 4,
        vibrate: false,
      },
      (created) => console.log(`Timer channel created: ${created}`)
    );
  };

  createWakeupChannel = () => {
    PushNotification.createChannel(
      {
        channelId: 'wakeup-reminder',
        channelName: 'Wake-up Reminder',
        channelDescription: 'Daily reminder to log your wake-up time',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Wakeup channel created: ${created}`)
    );
  };

  scheduleWakeupNotification = async () => {
    PushNotification.cancelLocalNotification('wakeup-daily');
    
    const settings = await this.getSettings();
    if (!settings.notificationsEnabled || !settings.wakeupNotificationEnabled) {
      console.log('Wakeup notification disabled');
      return null;
    }
    
    const onboardingData = await StorageService.getItem('onboardingData');
    if (!onboardingData || !onboardingData.usualWakeupTime) {
      console.log('No usual wakeup time set');
      return null;
    }
    
    const { hour, minute } = onboardingData.usualWakeupTime;
    
    const now = new Date();
    const wakeupTime = new Date();
    wakeupTime.setHours(hour, minute, 0, 0);
    
    if (wakeupTime <= now) {
      wakeupTime.setDate(wakeupTime.getDate() + 1);
    }
    
    PushNotification.localNotificationSchedule({
      channelId: 'wakeup-reminder',
      id: 'wakeup-daily',
      title: '☀️ Good Morning!',
      message: 'Tap to log your wake-up time and start your rest schedule',
      date: wakeupTime,
      allowWhileIdle: true,
      vibrate: settings.vibrationEnabled,
      playSound: true,
      soundName: 'default',
      repeatType: 'day',
    });
    
    console.log('Wakeup notification scheduled for:', wakeupTime.toLocaleTimeString());
    return wakeupTime;
  };

  cancelWakeupNotification = () => {
    PushNotification.cancelLocalNotification('wakeup-daily');
    console.log('Wakeup notification cancelled');
  };

  updateWakeupTime = async (hour, minute) => {
    const onboardingData = await StorageService.getItem('onboardingData') || {};
    onboardingData.usualWakeupTime = { hour, minute };
    await StorageService.setItem('onboardingData', onboardingData);
    
    await this.scheduleWakeupNotification();
    return onboardingData;
  };

  startTimerNotification = async (endTime, isResumingFromPause = false) => {
    await StorageService.setItem('timerEndTime', endTime);
    
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Start Live Activity (iOS 16.1+) - no fallback notification needed
    if (isResumingFromPause) {
      // Resume existing Live Activity instead of creating new one
      await LiveActivityService.updateTimer(remaining, false);
      console.log('Live Activity resumed from pause');
    } else {
      // Start new Live Activity
      await LiveActivityService.startTimer(remaining);
      console.log('Live Activity started for timer');
    }
    
    // Cancel any existing ongoing notification and old reminder
    PushNotification.cancelLocalNotification('999');
    PushNotification.cancelLocalNotification('1'); // Cancel old reminder if resuming
    
    // Schedule the next reminder for when this timer completes
    // This ensures reminder is scheduled even if app is closed when timer finishes
    // This works for both new timers and resumed timers with the new end time
    const settings = await this.getSettings();
    const intervalMinutes = settings.temporaryInterval || settings.restInterval;
    const nextReminderTime = new Date(endTime + (intervalMinutes * 60 * 1000));
    
    PushNotification.localNotificationSchedule({
      channelId: 'eye-rest-reminders',
      id: '1',
      title: 'Time for an Eye Rest 👁️',
      message: `Close your eyes for ${settings.restDuration} minutes to recharge`,
      date: nextReminderTime,
      allowWhileIdle: true,
      vibrate: settings.vibrationEnabled,
      playSound: true,
      soundName: 'default',
      userInfo: { screen: 'Timer' },
      data: { screen: 'Timer' },
    });
    
    await StorageService.setItem('nextReminderTime', {
      id: 'next-reminder',
      timestamp: nextReminderTime.getTime(),
      formattedTime: nextReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: nextReminderTime.toLocaleDateString(),
    });
    
    console.log('Next reminder pre-scheduled for:', nextReminderTime.toLocaleTimeString());

    const completionTime = new Date(endTime);
    PushNotification.localNotificationSchedule({
      channelId: 'eye-rest-reminders',
      id: '998',
      title: 'Eye Rest Complete!',
      message: 'Great job. Press to collect your reward!',
      date: completionTime,
      allowWhileIdle: true,
      vibrate: true,
      playSound: true,
      soundName: 'alarm.wav',
      userInfo: { screen: 'Timer' },
      data: { screen: 'Timer' },
    });

    console.log('Timer notification started:', timeString);
  };

  updateTimerNotification = async (remainingSeconds) => {
    // Stop Live Activity when timer reaches 0 or goes negative
    if (remainingSeconds <= 0) {
      console.log('Timer reached 0, stopping Live Activity');
      await LiveActivityService.stopTimer();
      return;
    }
    
    // Update Live Activity only - no notification needed
    await LiveActivityService.updateTimer(remainingSeconds, false);
  };

  stopTimerNotification = async () => {
    await StorageService.removeItem('timerEndTime');
    
    // Stop Live Activity if active
    await LiveActivityService.stopTimer();
    
    // Cancel all timer-related notifications including pre-scheduled reminder
    PushNotification.cancelLocalNotification('999');
    PushNotification.cancelLocalNotification('998');
    PushNotification.cancelLocalNotification('1'); // Cancel pre-scheduled reminder
    
    // Clear the stored next reminder time
    await StorageService.removeItem('nextReminderTime');
    
    console.log('Timer notification stopped');
  };

  pauseTimerNotification = async (remainingSeconds) => {
    await StorageService.setItem('timerPaused', { remaining: remainingSeconds });
    await StorageService.removeItem('timerEndTime');

    // Update Live Activity to paused state - no notification needed
    await LiveActivityService.updateTimer(remainingSeconds, true);

    // Cancel completion notification, ongoing notifications, and pre-scheduled reminder
    PushNotification.cancelLocalNotification('998');
    PushNotification.cancelLocalNotification('999');
    PushNotification.cancelLocalNotification('1'); // Cancel pre-scheduled reminder
    
    // Clear the stored next reminder time since we cancelled it
    await StorageService.removeItem('nextReminderTime');
  };

  getTimerState = async () => {
    const endTime = await StorageService.getItem('timerEndTime');
    const pausedState = await StorageService.getItem('timerPaused');
    
    if (pausedState) {
      return { isPaused: true, remaining: pausedState.remaining, isActive: true };
    }
    
    if (endTime) {
      const now = Date.now();
      const remaining = Math.floor((endTime - now) / 1000);
      
      if (remaining > 0) {
        return { isActive: true, remaining, endTime };
      } else {
        // Timer has completed - store completion time and return completed state
        const completionTime = endTime; // endTime is when it actually completed
        await StorageService.setItem('lastCompletionTime', completionTime);
        return { isActive: true, isCompleted: true, remaining: 0, endTime, completionTime };
      }
    }
    
    return null;
  };

  clearTimerState = async () => {
    await StorageService.removeItem('timerEndTime');
    await StorageService.removeItem('timerPaused');
  };

  scheduleReminders = async (wakeupTime) => {
    this.cancelAllNotifications();
    
    const settings = await this.getSettings();
    
    if (!settings.notificationsEnabled) {
      return [];
    }
    
    const reminders = [];
    const now = new Date(wakeupTime);
    
    const intervalMinutes = settings.temporaryInterval || settings.restInterval;
    const intervalHours = intervalMinutes / 60;
    const maxHours = 12;
    const reminderCount = Math.floor(maxHours / intervalHours);
    
    // Check if wake-up is during quiet hours - if so, schedule first reminder anyway
    const isNightWakeup = this.isQuietHours(now, settings);
    
    for (let i = 1; i <= reminderCount; i++) {
      const reminderTime = new Date(now);
      reminderTime.setMinutes(reminderTime.getMinutes() + (i * intervalMinutes));
      
      // Skip reminders during quiet hours, EXCEPT for the first one if user woke up at night
      if (this.isQuietHours(reminderTime, settings) && !(isNightWakeup && i === 1)) {
        continue;
      }
      
      // For night wake-ups, allow reminders even if they cross into the next day
      const isSameDay = reminderTime.getDate() === now.getDate();
      const isNextDayNightWakeup = isNightWakeup && reminderTime.getDate() === now.getDate() + 1;
      
      if (isSameDay || isNextDayNightWakeup) {
        const nextReminder = {
          id: `reminder-${i}`,
          timestamp: reminderTime.getTime(),
          formattedTime: reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: reminderTime.toLocaleDateString(),
        };
        
        reminders.push(nextReminder);
        
        PushNotification.localNotificationSchedule({
          channelId: 'eye-rest-reminders',
          id: String(i),
          title: 'Time for an Eye Rest 👁️',
          message: `Close your eyes for ${settings.restDuration} minutes to recharge`,
          date: reminderTime,
          allowWhileIdle: true,
          vibrate: settings.vibrationEnabled,
          playSound: true,
          soundName: 'default',
        });
        
        // For night wake-ups, only schedule the first reminder
        if (isNightWakeup) {
          break;
        }
      }
    }
    
    if (reminders.length > 0) {
      await StorageService.setItem('nextReminderTime', reminders[0]);
    }
    
    return reminders;
  };

  scheduleNextReminder = async () => {
    // Cancel existing reminder notifications (but not timer notifications)
    PushNotification.cancelLocalNotification('1');
    
    const settings = await this.getSettings();
    
    if (!settings.notificationsEnabled) {
      await StorageService.removeItem('nextReminderTime');
      return null;
    }
    
    const intervalMinutes = settings.temporaryInterval || settings.restInterval;
    
    const now = new Date();
    let reminderTime = new Date(now.getTime() + intervalMinutes * 60 * 1000);
    
    // If the reminder would be during quiet hours, schedule for 2 hours after usual wake-up time
    if (this.isQuietHours(reminderTime, settings)) {
      reminderTime = await this.getNextActiveTime(reminderTime, settings);
      console.log('Reminder moved to 2 hours after wake-up:', reminderTime.toLocaleTimeString());
    }
    
    const nextReminder = {
      id: 'next-reminder',
      timestamp: reminderTime.getTime(),
      formattedTime: reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: reminderTime.toLocaleDateString(),
    };
    
    PushNotification.localNotificationSchedule({
      channelId: 'eye-rest-reminders',
      id: '1',
      title: 'Time for an Eye Rest 👁️',
      message: `Close your eyes for ${settings.restDuration} minutes to recharge`,
      date: reminderTime,
      allowWhileIdle: true,
      vibrate: settings.vibrationEnabled,
      playSound: true,
      soundName: 'default',
      userInfo: { screen: 'Timer' },
      data: { screen: 'Timer' },
    });
    
    await StorageService.setItem('nextReminderTime', nextReminder);
    
    console.log('Next reminder scheduled for:', nextReminder.formattedTime, 'in', intervalMinutes, 'minutes');
    
    return nextReminder;
  };

  // Schedule a custom reminder at a specific time
  scheduleCustomReminder = async (timestamp) => {
    // Cancel existing reminder notifications
    PushNotification.cancelLocalNotification('1');
    
    const settings = await this.getSettings();
    const reminderTime = new Date(timestamp);
    
    const nextReminder = {
      id: 'next-reminder',
      timestamp: reminderTime.getTime(),
      formattedTime: reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: reminderTime.toLocaleDateString(),
    };
    
    PushNotification.localNotificationSchedule({
      channelId: 'eye-rest-reminders',
      id: '1',
      title: 'Time for an Eye Rest 👁️',
      message: `Close your eyes for ${settings.restDuration} minutes to recharge`,
      date: reminderTime,
      allowWhileIdle: true,
      vibrate: settings.vibrationEnabled,
      playSound: true,
      soundName: 'default',
      userInfo: { screen: 'Timer' },
      data: { screen: 'Timer' },
    });
    
    await StorageService.setItem('nextReminderTime', nextReminder);
    
    console.log('Custom reminder scheduled for:', nextReminder.formattedTime);
    
    return nextReminder;
  };

  getSettings = async () => {
    try {
      const settings = await StorageService.getItem('settings');
      if (settings) {
        return { ...this.defaultSettings, ...settings };
      }
      return this.defaultSettings;
    } catch (error) {
      console.log('Error getting settings:', error);
      return this.defaultSettings;
    }
  };

  setTemporaryInterval = async (minutes) => {
    const settings = await this.getSettings();
    settings.temporaryInterval = minutes;
    await StorageService.setItem('settings', settings);
    
    // Schedule next reminder with new interval
    await this.scheduleNextReminder();
    
    return settings;
  };

  clearTemporaryInterval = async () => {
    const settings = await this.getSettings();
    settings.temporaryInterval = null;
    await StorageService.setItem('settings', settings);
    
    // Schedule next reminder with normal interval
    await this.scheduleNextReminder();
    
    return settings;
  };

  updateRestInterval = async (minutes) => {
    const settings = await this.getSettings();
    settings.restInterval = minutes;
    await StorageService.setItem('settings', settings);
    
    // If no temporary interval, reschedule with new interval
    if (!settings.temporaryInterval) {
      await this.scheduleNextReminder();
    }
    
    return settings;
  };

  updateRestDuration = async (minutes) => {
    const settings = await this.getSettings();
    settings.restDuration = minutes;
    await StorageService.setItem('settings', settings);
    return settings;
  };

  cancelAllNotifications = () => {
    PushNotification.cancelAllLocalNotifications();
  };

  testNotification = () => {
    PushNotification.localNotification({
      channelId: 'eye-rest-reminders',
      title: '🔔 Test Notification',
      message: 'Notifications are working!',
      playSound: true,
      soundName: 'alarm.wav',
    });
  };
}

export default new NotificationService();
