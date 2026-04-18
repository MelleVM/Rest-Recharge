import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, AppState, Animated, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme, MD3DarkTheme as PaperDarkTheme } from 'react-native-paper';
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
import GardenOverviewScreen from './src/screens/GardenOverviewScreen';
import FontTestScreen from './src/screens/FontTestScreen';
import NotificationService from './src/utils/NotificationService';
import StorageService from './src/utils/StorageService';
import RewardToast from './src/components/RewardToast';
import SplashScreen from './src/screens/SplashScreen';
import { FONTS } from './src/styles/fonts';
import { setDefaultFontFamily } from './src/utils/setDefaultFontFamily';
import { ThemeProvider, useAppTheme, lightColors, darkColors } from './src/context/ThemeContext';
import { RestModeEvent, WakeupLogEvent, PendingUnlocksEvent, ResetEvent, GardenScreenEvent } from './src/utils/EventEmitters';

// Re-export for backward compatibility
export { RestModeEvent, WakeupLogEvent, PendingUnlocksEvent, ResetEvent, GardenScreenEvent };

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

// Custom Tab Bar Component with raised center button
function CustomTabBar({ state, descriptors, navigation, pendingUnlocks, tabBarBg, inactiveColor, isRestMode }) {
  if (isRestMode) return null;
  
  return (
    <View style={tabBarStyles.container}>
      <View style={[tabBarStyles.tabBar, { backgroundColor: tabBarBg }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCenter = route.name === 'Timer';
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          const color = isFocused ? '#FF6B6B' : inactiveColor;
          
          // Center Timer button - raised and prominent
          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.8}
                style={tabBarStyles.centerButtonWrapper}
              >
                <View style={[
                  tabBarStyles.centerButton,
                  isFocused && tabBarStyles.centerButtonActive
                ]}>
                  <FontAwesomeIcon icon={faStopwatch} size={28} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            );
          }
          
          // Regular tab buttons
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={tabBarStyles.tabButton}
            >
              {route.name === 'Home' && (
                <FontAwesomeIcon icon={faFire} size={30} color={color} />
              )}
              {route.name === 'Garden' && (
                <View>
                  <FontAwesomeIcon icon={faSun} size={30} color={color} />
                  {pendingUnlocks > 0 && (
                    <View style={tabBarStyles.badge}>
                      <Animated.Text style={tabBarStyles.badgeText}>
                        {pendingUnlocks}
                      </Animated.Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 85,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 28,
    paddingBottom: 10,
  },
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonActive: {
    backgroundColor: '#FF5252',
    transform: [{ scale: 1.05 }],
  },
  badge: {
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
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

// Tab Navigator Component
function TabNavigator({ plantColor, isRestMode, pendingUnlocks, isDarkMode, colors: propColors }) {
  // Use rest mode styling when timer is active, otherwise use theme colors
  const colors = propColors || lightColors;
  const effectiveDark = isRestMode || isDarkMode;
  const bgColor = isRestMode ? '#121212' : colors.background;
  const tabBarBg = isRestMode ? '#121212' : colors.tabBarBackground;
  const inactiveColor = isRestMode ? '#444444' : colors.tabBarInactive;
  
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          pendingUnlocks={pendingUnlocks}
          tabBarBg={tabBarBg}
          inactiveColor={inactiveColor}
          isRestMode={isRestMode}
        />
      )}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: false,
        unmountOnBlur: false,
        sceneStyle: { backgroundColor: bgColor },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen name="Garden" component={GardenOverviewScreen} />
    </Tab.Navigator>
  );
}

// Navigation theme for NavigationContainer - created dynamically based on theme and rest mode
const getNavigationTheme = (isDarkMode, isRestMode, colors) => {
  const safeColors = colors || lightColors;
  const baseTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;
  const bgColor = isRestMode ? '#121212' : safeColors.background;
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: bgColor,
      card: safeColors.surface,
      text: safeColors.text,
      border: safeColors.border,
    },
  };
};

// Light theme for Paper
const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B6B',
    accent: '#4ECDC4',
    background: '#FFF9F0',
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

// Dark theme for Paper
const darkTheme = {
  ...PaperDarkTheme,
  colors: {
    ...PaperDarkTheme.colors,
    primary: '#FF6B6B',
    accent: '#4ECDC4',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    error: '#FF6B6B',
    disabled: '#555555',
    placeholder: '#808080',
    backdrop: 'rgba(0, 0, 0, 0.7)',
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

function AppContent() {
  const appTheme = useAppTheme();
  const isDarkMode = appTheme?.isDarkMode ?? false;
  const colors = appTheme?.colors ?? lightColors;
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [plantColor, setPlantColor] = useState('#4CAF50'); // Default to classic green
  const [isRestMode, setIsRestMode] = useState(false);
  const [isGardenScreen, setIsGardenScreen] = useState(false);
  const [pendingUnlocks, setPendingUnlocks] = useState(0);
  const navigationRef = React.useRef(null);
  
  // Determine effective dark mode (rest mode overrides theme)
  const effectiveDark = isRestMode || isDarkMode;
  const effectiveColors = isRestMode ? darkColors : colors;
  const paperTheme = effectiveDark ? darkTheme : lightTheme;

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
      <PaperProvider theme={paperTheme}>
        <StatusBar barStyle={effectiveDark ? "light-content" : "dark-content"} backgroundColor={effectiveColors.background} />
        <SplashScreen />
      </PaperProvider>
    );
  }

  if (showOnboarding) {
    return (
      <PaperProvider theme={paperTheme}>
        <SafeAreaView style={[styles.container, { backgroundColor: effectiveColors.background }]}>
          <StatusBar barStyle={effectiveDark ? "light-content" : "dark-content"} backgroundColor={effectiveColors.background} />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </SafeAreaView>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <View style={[styles.rootContainer, { backgroundColor: effectiveColors.background }]}>
        {!isGardenScreen && <SafeAreaView style={[styles.safeAreaTop, { backgroundColor: effectiveColors.background }]} />}
        <RewardToast />
        <NavigationContainer ref={navigationRef} onStateChange={loadPlantColor} theme={getNavigationTheme(isDarkMode, isRestMode, effectiveColors)}>
          <View style={[styles.container, { backgroundColor: effectiveColors.background }]}>
            <StatusBar barStyle={effectiveDark ? "light-content" : "dark-content"} backgroundColor={effectiveColors.background} />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs">
                {() => <TabNavigator plantColor={plantColor} isRestMode={isRestMode} pendingUnlocks={pendingUnlocks} isDarkMode={isDarkMode} colors={effectiveColors} />}
              </Stack.Screen>
              <Stack.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Settings',
                  headerStyle: {
                    backgroundColor: effectiveColors.background,
                  },
                  headerTintColor: effectiveColors.text,
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
                name="FontTest" 
                component={FontTestScreen}
                options={{
                  presentation: 'modal',
                  headerShown: true,
                  headerTitle: 'Font Test',
                  headerStyle: {
                    backgroundColor: effectiveColors.background,
                  },
                  headerTintColor: effectiveColors.text,
                }}
              />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </View>
    </PaperProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  safeAreaTop: {
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
