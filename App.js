import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
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
import NotificationService from './src/utils/NotificationService';

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
  useEffect(() => {
    NotificationService.configure();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <SafeAreaView style={styles.container}>
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
        </SafeAreaView>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
});

export default App;
