import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, AppState, Animated } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TimerScreen from './src/screens/TimerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import GardenScreen from './src/screens/GardenScreen';
import GardenOverviewScreen from './src/screens/GardenOverviewScreen';
import FontTestScreen from './src/screens/FontTestScreen';
import NotificationService from './src/utils/NotificationService';
import StorageService from './src/utils/StorageService';
import RewardToast from './src/components/RewardToast';
import SplashScreen from './src/screens/SplashScreen';
import { FONTS } from './src/styles/fonts';
import { setDefaultFontFamily } from './src/utils/setDefaultFontFamily';

setDefaultFontFamily();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Plant colors (synced with GardenScreen)
const PLANT_COLORS = {
  classic: '#4CAF50',
  rose: '#E91E63',
  sunflower: '#FFC107',
  bonsai: '#795548',
  cherry: '#F48FB1',
  succulent: '#66BB6A',
};

// Simple event emitter for plant color changes
export const PlantColorEvent = {
  listeners: [],
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },
  emit(color) {
    this.listeners.forEach(callback => callback(color));
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

// Event emitter for rest mode (dark mode during timer)
export const RestModeEvent = {
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

// Tab Navigator Component
function TabNavigator({ plantColor, isRestMode, pendingUnlocks }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return <FontAwesomeIcon icon={faFire} size={32} color={color} />;
          } else if (route.name === 'Timer') {
            return <FontAwesomeIcon icon={faStopwatch} size={32} color={color} />;
          } else if (route.name === 'Garden') {
            return (
              <View>
                <FontAwesomeIcon icon={faSun} size={32} color={color} />
                {pendingUnlocks > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: '#FF6B6B',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Animated.Text style={{
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 'bold',
                    }}>{pendingUnlocks}</Animated.Text>
                  </View>
                )}
              </View>
            );
          }
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: isRestMode ? '#444444' : '#B2BEC3',
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: false,
        unmountOnBlur: false,
        sceneStyle: { backgroundColor: isRestMode ? '#121212' : '#FFF9F0' },
        tabBarStyle: isRestMode ? { display: 'none' } : {
          backgroundColor: '#FFF9F0',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: 80,
          paddingBottom: 28,
          paddingTop: 16,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen name="Garden" component={GardenOverviewScreen} />
    </Tab.Navigator>
  );
}

// Navigation theme for NavigationContainer - created dynamically based on rest mode
const getNavigationTheme = (isRestMode) => ({
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    background: isRestMode ? '#121212' : '#FFF9F0',
  },
});

// Fun, comic-style theme with bold colors
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B6B',      // Coral red
    accent: '#4ECDC4',       // Teal
    background: '#FFF9F0',   // Warm cream
    surface: '#FFFFFF',
    text: '#2D3436',
    error: '#FF6B6B',
    disabled: '#DFE6E9',
    placeholder: '#B2BEC3',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  fonts: {
    regular: {
      fontFamily: FONTS.regular,
      fontWeight: '400',
    },
    medium: {
      fontFamily: FONTS.medium,
      fontWeight: '500',
    },
    light: {
      fontFamily: FONTS.regular,
      fontWeight: '300',
    },
    thin: {
      fontFamily: FONTS.regular,
      fontWeight: '100',
    },
  },
  roundness: 20,
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [plantColor, setPlantColor] = useState('#4CAF50'); // Default to classic green
  const [isRestMode, setIsRestMode] = useState(false);
  const [isGardenScreen, setIsGardenScreen] = useState(false);
  const [pendingUnlocks, setPendingUnlocks] = useState(0);
  const navigationRef = React.useRef(null);

  const loadPendingUnlocks = async () => {
    const pending = await StorageService.getItem('pendingFlowerUnlocks') || [];
    setPendingUnlocks(pending.length);
  };

  const loadPlantColor = async () => {
    const gardenData = await StorageService.getItem('gardenData');
    if (gardenData?.selectedPlantType) {
      setPlantColor(PLANT_COLORS[gardenData.selectedPlantType] || '#4CAF50');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const splashMinTime = new Promise(resolve => setTimeout(resolve, 1500));

      // Configure notifications with navigation callback and wakeup log callback
      NotificationService.configure(
        (screenName) => {
          if (navigationRef.current) {
            navigationRef.current.navigate(screenName);
          }
        },
        () => {
          // Emit wakeup log event to show modal in HomeScreen
          WakeupLogEvent.emit();
        }
      );
      
      // Check if onboarding has been completed
      const onboardingCompleted = await StorageService.getItem('onboardingCompleted');
      setShowOnboarding(!onboardingCompleted);
      
      // Load plant color
      await loadPlantColor();
      
      // Load pending unlocks count
      await loadPendingUnlocks();

      await splashMinTime;
      setIsLoading(false);
    };
    
    initialize();
    
    // Refresh plant color and pending unlocks when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadPlantColor();
        loadPendingUnlocks();
      }
    });
    
    // Subscribe to plant color changes from GardenScreen
    const unsubscribePlantColor = PlantColorEvent.subscribe((color) => {
      setPlantColor(color);
    });
    
    // Subscribe to reset event to show onboarding again
    const unsubscribeReset = ResetEvent.subscribe(() => {
      setShowOnboarding(true);
      setPlantColor('#4CAF50'); // Reset to default color
    });
    
    // Subscribe to rest mode changes
    const unsubscribeRestMode = RestModeEvent.subscribe((active) => {
      setIsRestMode(active);
    });
    
    // Subscribe to garden screen changes
    const unsubscribeGardenScreen = GardenScreenEvent.subscribe((active) => {
      setIsGardenScreen(active);
    });
    
    // Subscribe to pending unlocks changes
    const unsubscribePendingUnlocks = PendingUnlocksEvent.subscribe((count) => {
      setPendingUnlocks(count);
    });
    
    return () => {
      appStateSubscription.remove();
      unsubscribePlantColor();
      unsubscribeReset();
      unsubscribeRestMode();
      unsubscribeGardenScreen();
      unsubscribePendingUnlocks();
    };
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF9F0" />
        <SplashScreen />
      </PaperProvider>
    );
  }

  if (showOnboarding) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFF9F0" />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </SafeAreaView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <View style={[styles.rootContainer, isRestMode && styles.restModeRoot]}>
        {!isGardenScreen && <SafeAreaView style={[styles.safeAreaTop, isRestMode && styles.restModeSafeArea]} />}
        <RewardToast />
        <NavigationContainer ref={navigationRef} onStateChange={loadPlantColor} theme={getNavigationTheme(isRestMode)}>
          <View style={[styles.container, isRestMode && styles.restModeContainer]}>
            <StatusBar barStyle={isRestMode ? "light-content" : "dark-content"} backgroundColor={isRestMode ? "#121212" : "#FFF9F0"} />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs">
                {() => <TabNavigator plantColor={plantColor} isRestMode={isRestMode} pendingUnlocks={pendingUnlocks} />}
              </Stack.Screen>
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Settings',
                  headerStyle: {
                    backgroundColor: '#FFF9F0',
                  },
                  headerTintColor: '#2D3436',
                }}
              />
              <Stack.Screen 
                name="GardenOverview" 
                component={GardenOverviewScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="GardenDetail" 
                component={GardenScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="FontTest" 
                component={FontTestScreen}
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Font Test',
                  headerStyle: {
                    backgroundColor: '#FFF9F0',
                  },
                  headerTintColor: '#2D3436',
                }}
              />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  safeAreaTop: {
    backgroundColor: '#FFF9F0',
  },
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
  restModeRoot: {
    backgroundColor: '#121212',
  },
  restModeSafeArea: {
    backgroundColor: '#121212',
  },
  restModeContainer: {
    backgroundColor: '#121212',
  },
});

export default App;
