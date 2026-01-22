import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';
import StorageService from './StorageService';

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
    };
  }

  configure = () => {
    PushNotification.configure({
      onNotification: function(notification) {
        console.log('NOTIFICATION:', notification);
        
        if (notification.userInteraction) {
          console.log('User tapped on notification');
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
        soundName: 'default',
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

  startTimerNotification = async (endTime) => {
    await StorageService.setItem('timerEndTime', endTime);
    
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    PushNotification.cancelLocalNotification('999');

    PushNotification.localNotification({
      channelId: 'eye-rest-timer',
      id: '999',
      title: '👁️ Eye Rest in Progress',
      message: `${timeString} remaining - Close your eyes and relax`,
      ongoing: true,
      autoCancel: false,
      vibrate: false,
      playSound: false,
      priority: 'max',
      visibility: 'public',
      importance: 'max',
      ignoreInForeground: false,
      onlyAlertOnce: true,
      largeIcon: '',
      smallIcon: 'ic_notification',
    });

    const completionTime = new Date(endTime);
    PushNotification.localNotificationSchedule({
      channelId: 'eye-rest-reminders',
      id: '998',
      title: '🎉 Eye Rest Complete!',
      message: 'Great job! Your eyes are refreshed.',
      date: completionTime,
      allowWhileIdle: true,
      vibrate: true,
      playSound: true,
      soundName: 'default',
    });

    console.log('Timer notification started:', timeString);
  };

  updateTimerNotification = (remainingSeconds) => {
    if (remainingSeconds <= 0) return;
    
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    PushNotification.localNotification({
      channelId: 'eye-rest-timer',
      id: '999',
      title: '👁️ Eye Rest in Progress',
      message: `${timeString} remaining - Close your eyes and relax`,
      ongoing: true,
      autoCancel: false,
      vibrate: false,
      playSound: false,
      priority: 'max',
      visibility: 'public',
      importance: 'max',
      ignoreInForeground: false,
      onlyAlertOnce: true,
      largeIcon: '',
      smallIcon: 'ic_notification',
    });
  };

  stopTimerNotification = async () => {
    await StorageService.removeItem('timerEndTime');
    PushNotification.cancelLocalNotification('999');
    PushNotification.cancelLocalNotification('998');
    console.log('Timer notification stopped');
  };

  pauseTimerNotification = async (remainingSeconds) => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    await StorageService.setItem('timerPaused', { remaining: remainingSeconds });
    await StorageService.removeItem('timerEndTime');

    PushNotification.cancelLocalNotification('998');

    PushNotification.localNotification({
      channelId: 'eye-rest-timer',
      id: '999',
      title: '⏸️ Eye Rest Paused',
      message: `${timeString} remaining - Tap to resume`,
      ongoing: true,
      autoCancel: false,
      vibrate: false,
      playSound: false,
      priority: 'max',
      visibility: 'public',
      importance: 'max',
      ignoreInForeground: false,
      onlyAlertOnce: true,
      largeIcon: '',
      smallIcon: 'ic_notification',
    });
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
        // Timer has completed - return completed state
        return { isActive: true, isCompleted: true, remaining: 0, endTime };
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
    
    for (let i = 1; i <= reminderCount; i++) {
      const reminderTime = new Date(now);
      reminderTime.setMinutes(reminderTime.getMinutes() + (i * intervalMinutes));
      
      if (reminderTime.getDate() === now.getDate()) {
        const nextReminder = {
          id: `reminder-${i}`,
          timestamp: reminderTime.getTime(),
          formattedTime: reminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    const reminderTime = new Date(now.getTime() + intervalMinutes * 60 * 1000);
    
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
    });
    
    await StorageService.setItem('nextReminderTime', nextReminder);
    
    console.log('Next reminder scheduled for:', nextReminder.formattedTime, 'in', intervalMinutes, 'minutes');
    
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
      soundName: 'default',
    });
  };
}

export default new NotificationService();
