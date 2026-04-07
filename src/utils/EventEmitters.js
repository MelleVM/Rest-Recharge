// Event emitters for cross-component communication
// Moved from App.js to avoid circular dependencies

// Event emitter for triggering onboarding after reset
export const ResetEvent = {
  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit() {
    this.listeners.forEach(callback => callback());
  },
};

// Event emitter for Garden screen (to hide top safe area)
export const GardenScreenEvent = {
  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit(isActive) {
    this.listeners.forEach(callback => callback(isActive));
  },
};

// Event emitter for rest mode changes
export const RestModeEvent = {
  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit(isRestMode) {
    this.listeners.forEach(callback => callback(isRestMode));
  },
};

// Event emitter for showing wakeup log modal
export const WakeupLogEvent = {
  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit() {
    this.listeners.forEach(callback => callback());
  },
};

// Event emitter for pending flower unlocks badge
export const PendingUnlocksEvent = {
  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit(count) {
    this.listeners.forEach(callback => callback(count));
  },
};
