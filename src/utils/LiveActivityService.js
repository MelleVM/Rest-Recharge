import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

class LiveActivityService {
  constructor() {
    this.isAvailable = Platform.OS === 'ios' && LiveActivityModule != null;
    console.log('LiveActivityService initialized:', {
      platform: Platform.OS,
      moduleExists: LiveActivityModule != null,
      isAvailable: this.isAvailable
    });
  }

  async checkSupport() {
    if (!this.isAvailable) {
      return { supported: false, enabled: false };
    }

    try {
      const result = await LiveActivityModule.isSupported();
      return result;
    } catch (error) {
      console.log('Error checking Live Activity support:', error);
      return { supported: false, enabled: false };
    }
  }

  async startTimer(durationSeconds) {
    console.log('startTimer called with duration:', durationSeconds);
    
    if (!this.isAvailable) {
      console.log('Live Activities not available - isAvailable:', this.isAvailable);
      console.log('LiveActivityModule:', LiveActivityModule);
      return null;
    }

    try {
      console.log('Calling LiveActivityModule.startTimer...');
      const result = await LiveActivityModule.startTimer(durationSeconds);
      console.log('Live Activity started successfully:', result);
      return result;
    } catch (error) {
      console.error('Error starting Live Activity:', error);
      console.error('Error details:', error.message, error.code);
      return null;
    }
  }

  async updateTimer(remainingSeconds, isPaused = false) {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const result = await LiveActivityModule.updateTimer(remainingSeconds, isPaused);
      return result;
    } catch (error) {
      console.log('Error updating Live Activity:', error);
      return null;
    }
  }

  async stopTimer() {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const result = await LiveActivityModule.stopTimer();
      console.log('Live Activity stopped:', result);
      return result;
    } catch (error) {
      console.log('Error stopping Live Activity:', error);
      return null;
    }
  }
}

export default new LiveActivityService();
