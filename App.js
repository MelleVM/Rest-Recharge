import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons/faHouse';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import TimerScreen from './src/screens/TimerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import NotificationService from './src/utils/NotificationService';
import StorageService from './src/utils/StorageService';

const Tab = createBottomTabNavigator();

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

  useEffect(() => {
    const initialize = async () => {
      NotificationService.configure();
      
      // Check if onboarding has been completed
      const onboardingCompleted = await StorageService.getItem('onboardingCompleted');
      setShowOnboarding(!onboardingCompleted);
      setIsLoading(false);
    };
    
    initialize();
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
        <NavigationContainer>
          <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF9F0" />
            <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                if (route.name === 'Home') {
                  return <FontAwesomeIcon icon={faHouse} size={28} color={color} />;
                } else if (route.name === 'Timer') {
                  return <FontAwesomeIcon icon={faStopwatch} size={28} color={color} />;
                } else if (route.name === 'Settings') {
                  return <FontAwesomeIcon icon={faGear} size={28} color={color} />;
                }
              },
              tabBarActiveTintColor: '#FF6B6B',
              tabBarInactiveTintColor: '#B2BEC3',
              headerShown: false,
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
                fontSize: 14,
                fontWeight: 'bold',
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Timer" component={TimerScreen} />
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
