import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

// Configure notifications for the app
export const configureNotifications = () => {
  // Configure the notification channel
  PushNotification.configure({
    // (required) Called when a remote or local notification is opened or received
    onNotification: function(notification) {
      console.log('NOTIFICATION:', notification);
      
      // Process the notification
      if (notification.userInteraction) {
        // User tapped on notification
        console.log('User tapped on notification');
      }
      
      // Required on iOS only
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    },

    // IOS ONLY (optional): default: all - Permissions to register.
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },

    // Should the initial notification be popped automatically
    popInitialNotification: true,

    /**
     * (optional) default: true
     * - Specified if permissions (ios) and token (android and ios) will requested or not,
     * - if not, you must call PushNotificationsHandler.requestPermissions() later
     */
    requestPermissions: true,
  });

  // Create the default channel
  PushNotification.createChannel(
    {
      channelId: 'eye-rest-reminders',
      channelName: 'Eye Rest Reminders',
      channelDescription: 'Reminders to rest your eyes',
      playSound: true,
      soundName: 'default',
      importance: 4, // (4) - High importance: makes a sound and appears as a heads-up notification
      vibrate: true,
    },
    (created) => console.log(`Channel created: ${created}`)
  );
};
