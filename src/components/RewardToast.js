import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { useAppTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const NOTCH_OFFSET = Platform.OS === 'ios' ? 50 : 20; // Extra offset for iOS notch/Dynamic Island

// Event emitter for showing toasts
export const ToastEvent = {
  listeners: [],
  show: (type, amount, message) => {
    ToastEvent.listeners.forEach(listener => listener(type, amount, message));
  },
  subscribe: (listener) => {
    ToastEvent.listeners.push(listener);
    return () => {
      ToastEvent.listeners = ToastEvent.listeners.filter(l => l !== listener);
    };
  }
};

const RewardToast = () => {
  const appTheme = useAppTheme();
  const isDarkMode = appTheme?.isDarkMode ?? false;
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState('gems');
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const slideAnim = useState(new Animated.Value(-100))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const unsubscribe = ToastEvent.subscribe((toastType, toastAmount, toastMessage) => {
      setType(toastType);
      setAmount(toastAmount);
      setMessage(toastMessage);
      setVisible(true);

      // Animate in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: NOTCH_OFFSET,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setVisible(false);
        });
      }, 3000);
    });

    return unsubscribe;
  }, [slideAnim, fadeAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={[styles.content, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.85)' }]}>
        {type === 'gems' && (
          <FontAwesomeIcon icon={faGem} size={24} color="#FFD700" style={styles.icon} />
        )}
        {type === 'energy' && (
          <FontAwesomeIcon icon={faBolt} size={24} color="#FFC107" style={styles.icon} />
        )}
        <View style={styles.textContainer}>
          {(type === 'gems' || type === 'energy') && (
            <Text style={[styles.amount, type === 'energy' && styles.amountEnergy, isDarkMode && styles.amountDark]}>
              +{amount}{type === 'energy' ? '%' : ''}
            </Text>
          )}
          {(type === 'success' || type === 'info') && message.includes('\n') ? (
            <>
              <Text style={[styles.title, isDarkMode && styles.titleDark]}>
                {message.split('\n')[0]}
              </Text>
              <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
                {message.split('\n')[1]}
              </Text>
            </>
          ) : (
            <Text style={[styles.message, isDarkMode && styles.messageDark]}>{message}</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: (width - 300) / 2,
    width: 300,
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 2,
  },
  amountEnergy: {
    color: '#FFC107',
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  amountDark: {
    color: '#2D3436',
  },
  messageDark: {
    color: '#2D3436',
  },
  titleDark: {
    color: '#2D3436',
  },
  subtitleDark: {
    color: 'rgba(45, 52, 54, 0.75)',
  },
});

export default RewardToast;
