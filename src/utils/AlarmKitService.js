import { NativeModules, Platform } from 'react-native';

const { AlarmKitModule } = NativeModules;

class AlarmKitService {
  async isSupported() {
    if (Platform.OS !== 'ios') {
      return { supported: false };
    }

    if (!AlarmKitModule) {
      console.log('AlarmKitService: Native module not available');
      return { supported: false };
    }

    try {
      return await AlarmKitModule.isSupported();
    } catch (error) {
      console.error('AlarmKitService: Error checking support', error);
      return { supported: false };
    }
  }

  async requestAuthorization() {
    if (Platform.OS !== 'ios' || !AlarmKitModule) {
      return { authorized: false };
    }

    try {
      const result = await AlarmKitModule.requestAuthorization();
      console.log('AlarmKitService: Authorization result', result);
      return result;
    } catch (error) {
      console.error('AlarmKitService: Authorization error', error);
      return { authorized: false, error: error.message };
    }
  }

  async getAuthorizationStatus() {
    if (Platform.OS !== 'ios' || !AlarmKitModule) {
      return { authorized: false };
    }

    try {
      return await AlarmKitModule.getAuthorizationStatus();
    } catch (error) {
      console.error('AlarmKitService: Error getting auth status', error);
      return { authorized: false };
    }
  }

  async scheduleCountdownAlarm(durationSeconds, title = 'Eye Rest Complete!', soundEnabled = true) {
    if (Platform.OS !== 'ios' || !AlarmKitModule) {
      console.log('AlarmKitService: Not available on this platform');
      return { success: false, reason: 'not_supported' };
    }

    try {
      const result = await AlarmKitModule.scheduleCountdownAlarm(durationSeconds, title, soundEnabled);
      console.log('AlarmKitService: Alarm scheduled', result);
      return result;
    } catch (error) {
      console.error('AlarmKitService: Failed to schedule alarm', error);
      return { success: false, error: error.message };
    }
  }

  async cancelAlarm() {
    if (Platform.OS !== 'ios' || !AlarmKitModule) {
      return { success: false };
    }

    try {
      const result = await AlarmKitModule.cancelAlarm();
      console.log('AlarmKitService: Alarm cancelled', result);
      return result;
    } catch (error) {
      console.error('AlarmKitService: Failed to cancel alarm', error);
      return { success: false, error: error.message };
    }
  }

  async pauseAlarm() {
    if (Platform.OS !== 'ios' || !AlarmKitModule) {
      return { success: false };
    }

    try {
      const result = await AlarmKitModule.pauseAlarm();
      console.log('AlarmKitService: Alarm paused', result);
      return result;
    } catch (error) {
      console.error('AlarmKitService: Failed to pause alarm', error);
      return { success: false, error: error.message };
    }
  }

  async resumeAlarm() {
    if (Platform.OS !== 'ios' || !AlarmKitModule) {
      return { success: false };
    }

    try {
      const result = await AlarmKitModule.resumeAlarm();
      console.log('AlarmKitService: Alarm resumed', result);
      return result;
    } catch (error) {
      console.error('AlarmKitService: Failed to resume alarm', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AlarmKitService();
