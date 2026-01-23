import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, ActivityIndicator, View, AppState, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons/faHouse';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TimerScreen from './src/screens/TimerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import GardenScreen from './src/screens/GardenScreen';
import NotificationService from './src/utils/NotificationService';
import StorageService from './src/utils/StorageService';
import RewardToast from './src/components/RewardToast';

const Tab = createBottomTabNavigator();

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
  roundness: 20,
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [plantColor, setPlantColor] = useState('#4CAF50'); // Default to classic green

  const loadPlantColor = async () => {
    const gardenData = await StorageService.getItem('gardenData');
    if (gardenData?.selectedPlantType) {
      setPlantColor(PLANT_COLORS[gardenData.selectedPlantType] || '#4CAF50');
    }
  };

  useEffect(() => {
    const initialize = async () => {
      NotificationService.configure();
      
      // Check if onboarding has been completed
      const onboardingCompleted = await StorageService.getItem('onboardingCompleted');
      setShowOnboarding(!onboardingCompleted);
      
      // Load plant color
      await loadPlantColor();
      
      setIsLoading(false);
    };
    
    initialize();
    
    // Refresh plant color when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadPlantColor();
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
    
    return () => {
      appStateSubscription.remove();
      unsubscribePlantColor();
      unsubscribeReset();
    };
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <View style={styles.loadingContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFF9F0" />
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
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
      <View style={styles.rootContainer}>
        <SafeAreaView style={styles.safeAreaTop} />
        <RewardToast />
        <NavigationContainer onStateChange={loadPlantColor}>
          <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF9F0" />
            <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                if (route.name === 'Home') {
                  return <FontAwesomeIcon icon={faHouse} size={24} color={color} />;
                } else if (route.name === 'Timer') {
                  return <FontAwesomeIcon icon={faStopwatch} size={24} color={color} />;
                } else if (route.name === 'Garden') {
                  return <FontAwesomeIcon icon={faSeedling} size={24} color={color} />;
                } else if (route.name === 'Settings') {
                  return <FontAwesomeIcon icon={faGear} size={24} color={color} />;
                }
              },
              tabBarActiveTintColor: plantColor,
              tabBarInactiveTintColor: '#B2BEC3',
              headerShown: false,
              tabBarHideOnKeyboard: true,
              lazy: false,
              animation: 'fade',
              sceneStyle: { backgroundColor: '#FFF9F0' },
              tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopWidth: 0,
                elevation: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                height: 80,
                paddingBottom: 15,
                paddingTop: 10,
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: 'bold',
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Timer" component={TimerScreen} />
            <Tab.Screen name="Garden" component={GardenScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
          </View>
        </NavigationContainer>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeAreaTop: {
    backgroundColor: '#FFF9F0',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
});

export default App;
