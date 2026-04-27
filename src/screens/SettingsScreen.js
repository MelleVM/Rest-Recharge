import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, TextInput as RNTextInput, Linking } from 'react-native';
import { version } from '../../package.json';
import { Switch, Surface, Text, useTheme } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faMobile } from '@fortawesome/free-solid-svg-icons/faMobile';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons/faCircleQuestion';
import { faShield } from '@fortawesome/free-solid-svg-icons/faShield';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faHourglass } from '@fortawesome/free-solid-svg-icons/faHourglass';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faUser } from '@fortawesome/free-solid-svg-icons/faUser';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons/faBriefcase';
import { faGraduationCap } from '@fortawesome/free-solid-svg-icons/faGraduationCap';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faBatteryHalf } from '@fortawesome/free-solid-svg-icons/faBatteryHalf';
import { faVirus } from '@fortawesome/free-solid-svg-icons/faVirus';
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';
import { faLeaf } from '@fortawesome/free-solid-svg-icons/faLeaf';
import { faTree } from '@fortawesome/free-solid-svg-icons/faTree';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faWrench } from '@fortawesome/free-solid-svg-icons/faWrench';
import { faBullseye } from '@fortawesome/free-solid-svg-icons/faBullseye';
import { faStore } from '@fortawesome/free-solid-svg-icons/faStore';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faLockOpen } from '@fortawesome/free-solid-svg-icons/faLockOpen';
import { faRotateLeft } from '@fortawesome/free-solid-svg-icons/faRotateLeft';
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon';
import { faPalette } from '@fortawesome/free-solid-svg-icons/faPalette';
import { faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons/faCircleHalfStroke';
import { faChartSimple } from '@fortawesome/free-solid-svg-icons/faChartSimple';
import PushNotification from 'react-native-push-notification';
import StorageService from '../utils/StorageService';
import NotificationService from '../utils/NotificationService';
import { STREAK_MODES, DEFAULT_DAILY_MINUTES_GOAL } from '../utils/StreakCalculator';
import { ToastEvent } from '../components/RewardToast';
import { ResetEvent } from '../utils/EventEmitters';
import { useAppTheme } from '../context/ThemeContext';

console.log('[SettingsScreen] Module loaded');

const THEME_OPTIONS = [
  { id: 'light', label: 'Light', icon: faSun, color: '#F59E0B' },
  { id: 'dark', label: 'Dark', icon: faMoon, color: '#6C5CE7' },
  { id: 'auto', label: 'Automatic', icon: faCircleHalfStroke, color: '#4ECDC4' },
];

// Separate Modal Component to prevent re-renders
const InputModal = React.memo(({ visible, onClose, title, value, onChangeText, onSave, label, note }) => {
  const [localValue, setLocalValue] = useState(value);
  const appTheme = useAppTheme();
  const colors = appTheme?.colors ?? {
    background: '#FFF9F0',
    surface: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    inputBackground: '#F0F0F0',
    modalOverlay: 'rgba(0,0,0,0.5)',
  };
  
  useEffect(() => {
    if (visible) {
      setLocalValue(value);
    }
  }, [visible, value]);
  
  const handleSave = () => {
    onSave(localValue);
  };
  
  const isValid = localValue && !isNaN(parseInt(localValue, 10)) && parseInt(localValue, 10) > 0;
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalContainer}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.inputBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                <FontAwesomeIcon icon={faTimes} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
                <RNTextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBackground }]}
                  value={localValue}
                  onChangeText={setLocalValue}
                  keyboardType="numeric"
                  placeholder="Enter minutes"
                  placeholderTextColor={colors.textMuted}
                  autoFocus={true}
                />
                <Text style={[styles.inputNote, { color: colors.textMuted }]}>{note}</Text>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  !isValid && styles.disabledButton
                ]} 
                onPress={handleSave}
                disabled={!isValid}
              >
                <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const PURPOSE_OPTIONS = [
  { id: 'work', label: 'Work / Office', icon: faBriefcase, color: '#74B9FF' },
  { id: 'study', label: 'Study / Learning', icon: faGraduationCap, color: '#A29BFE' },
  { id: 'health', label: 'Health & Recovery', icon: faHeart, color: '#FF6B6B' },
  { id: 'general', label: 'General Wellness', icon: faSun, color: '#FFE66D' },
];

const CONDITION_OPTIONS = [
  { id: 'chronic_fatigue', label: 'Chronic Fatigue', icon: faBatteryHalf, color: '#636E72' },
  { id: 'me_cfs', label: 'ME/CFS', icon: faBatteryHalf, color: '#9B59B6' },
  { id: 'post_covid', label: 'Post-COVID Recovery', icon: faVirus, color: '#00B894' },
  { id: 'burnout', label: 'Burnout', icon: faFire, color: '#FF6B6B' },
  { id: 'none', label: 'None of these', icon: faBan, color: '#B2BEC3' },
];

const PLANT_TYPES = [
  { id: 'classic', name: 'Classic', icon: faSeedling, color: '#4CAF50', price: 0, description: 'The original plant' },
  { id: 'rose', name: 'Rose', icon: faLeaf, color: '#E91E63', price: 100, description: 'A beautiful rose bush' },
  { id: 'sunflower', name: 'Sunflower', icon: faSeedling, color: '#FFC107', price: 150, description: 'Bright and cheerful' },
  { id: 'bonsai', name: 'Bonsai', icon: faTree, color: '#795548', price: 200, description: 'Ancient and wise' },
  { id: 'cherry', name: 'Cherry Blossom', icon: faTree, color: '#F8BBD9', price: 300, description: 'Delicate pink blooms' },
  { id: 'cactus', name: 'Cactus', icon: faSeedling, color: '#8BC34A', price: 250, description: 'Low maintenance friend' },
];

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [wakeupNotificationEnabled, setWakeupNotificationEnabled] = useState(true);
  const [restInterval, setRestInterval] = useState(120);
  const [restDuration, setRestDuration] = useState(20);
  const [dailyGoal, setDailyGoal] = useState(4);
  const [streakMode, setStreakMode] = useState(STREAK_MODES.RESTS);
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState(DEFAULT_DAILY_MINUTES_GOAL);
  const [activeModal, setActiveModal] = useState(null);
  
  // Profile/Onboarding data
  const [purpose, setPurpose] = useState(null);
  const [condition, setCondition] = useState(null);
  const [usualWakeupTime, setUsualWakeupTime] = useState({ hour: 7, minute: 0 });
  
  // Garden data
  const [gardenData, setGardenData] = useState({
    points: 0,
    unlockedPlants: ['classic'],
    selectedPlantType: 'classic',
  });
  
  const theme = useTheme();
  const appTheme = useAppTheme();
  const themeMode = appTheme?.themeMode ?? 'light';
  const setThemeMode = appTheme?.setThemeMode ?? (() => {});
  const isDarkMode = appTheme?.isDarkMode ?? false;
  const colors = appTheme?.colors ?? {
    background: '#FFF9F0',
    surface: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    divider: '#F0F0F0',
    inputBackground: '#F0F0F0',
    modalOverlay: 'rgba(0,0,0,0.5)',
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await NotificationService.getSettings();
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
      setVibrationEnabled(settings.vibrationEnabled ?? true);
      setWakeupNotificationEnabled(settings.wakeupNotificationEnabled ?? true);
      setRestInterval(settings.restInterval ?? 120);
      setRestDuration(settings.restDuration ?? 20);
      setDailyGoal(settings.dailyGoal ?? 4);
      setStreakMode(settings.streakMode === STREAK_MODES.MINUTES ? STREAK_MODES.MINUTES : STREAK_MODES.RESTS);
      setDailyMinutesGoal(settings.dailyMinutesGoal ?? DEFAULT_DAILY_MINUTES_GOAL);
      
      // Load onboarding/profile data
      const onboardingData = await StorageService.getItem('onboardingData');
      if (onboardingData) {
        setPurpose(onboardingData.purpose || null);
        setCondition(onboardingData.condition || null);
        setUsualWakeupTime(onboardingData.usualWakeupTime || { hour: 7, minute: 0 });
      }
      
      // Load garden data
      const storedGardenData = await StorageService.getItem('gardenData');
      if (storedGardenData) {
        setGardenData(storedGardenData);
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };
  
  // Purchase a plant type
  const purchasePlant = async (plantType) => {
    if (gardenData?.unlockedPlants?.includes(plantType.id)) {
      // Already owned, just select it
      const updatedGardenData = { ...gardenData, selectedPlantType: plantType.id };
      await StorageService.setItem('gardenData', updatedGardenData);
      setGardenData(updatedGardenData);
      setActiveModal(null);
      return;
    }
    
    if (gardenData.points < plantType.price) {
      Alert.alert('Not enough points', `You need ${plantType.price - gardenData.points} more points to unlock this plant.`);
      return;
    }
    
    Alert.alert(
      `Unlock ${plantType.name}?`,
      `This will cost ${plantType.price} points.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            const updatedGardenData = {
              ...gardenData,
              points: gardenData.points - plantType.price,
              unlockedPlants: [...(gardenData.unlockedPlants || []), plantType.id],
              selectedPlantType: plantType.id,
            };
            await StorageService.setItem('gardenData', updatedGardenData);
            setGardenData(updatedGardenData);
            setActiveModal(null);
          },
        },
      ]
    );
  };

  // Dev functions
  const devAddPoints = async (amount) => {
    const updatedGardenData = {
      ...gardenData,
      points: gardenData.points + amount,
    };
    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
    ToastEvent.show('gems', amount, 'Dev bonus!');
  };

  const devUnlockAllFlowers = async () => {
    const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || {};
    const stats = await StorageService.getItem('stats') || {};
    
    // Set totalRests high enough to unlock all flowers (300+ for poppy)
    const updatedStats = { ...stats, totalRests: 500 };
    await StorageService.setItem('stats', updatedStats);
    
    // Update garden data with high totalRests
    const updatedGarden = { ...sunflowerGarden, totalRests: 500 };
    await StorageService.setItem('sunflowerGarden', updatedGarden);
    
    Alert.alert('Flowers Unlocked', 'All flowers have been unlocked! Go to the Garden to see them.');
  };

  const devResetFlowerProgress = async () => {
    Alert.alert(
      'Reset Flower Progress?',
      'This will reset your flower unlock progress to 0 rests. Your planted flowers will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || {};
            const stats = await StorageService.getItem('stats') || {};
            
            // Reset totalRests to 0
            const updatedStats = { ...stats, totalRests: 0 };
            await StorageService.setItem('stats', updatedStats);
            
            // Update garden data
            const updatedGarden = { ...sunflowerGarden, totalRests: 0 };
            await StorageService.setItem('sunflowerGarden', updatedGarden);
            
            Alert.alert('Progress Reset', 'Flower unlock progress has been reset to 0.');
          },
        },
      ]
    );
  };

  const devClearAllPlots = async () => {
    Alert.alert(
      'Clear All Plots?',
      'This will remove all planted flowers and reset all plots to empty. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const sunflowerGarden = await StorageService.getItem('sunflowerGarden') || {};
            
            // Reset all plots to empty (keep unlock status)
            const clearedPlots = (sunflowerGarden.plots || []).map(plot => ({
              ...plot,
              flowerType: null,
              restsGiven: 0,
              plantedDate: null,
            }));
            
            const updatedGarden = { 
              ...sunflowerGarden, 
              plots: clearedPlots,
            };
            await StorageService.setItem('sunflowerGarden', updatedGarden);
            
            Alert.alert('Plots Cleared', 'All plots have been cleared. You can now plant new flowers.');
          },
        },
      ]
    );
  };

  const saveSettings = useCallback(async () => {
    try {
      // Merge with existing settings so fields not managed by this screen
      // (e.g. alarmSoundEnabled, temporaryInterval) are preserved.
      const existingSettings = await NotificationService.getSettings();
      const settings = {
        ...existingSettings,
        notificationsEnabled,
        vibrationEnabled,
        wakeupNotificationEnabled,
        restInterval,
        restDuration,
        dailyGoal,
        streakMode,
        dailyMinutesGoal,
      };
      await StorageService.setItem('settings', settings);

      if (notificationsEnabled) {
        PushNotification.createChannel(
          { channelId: 'eye-rest-reminders', channelName: 'Eye Rest Reminders', vibrate: vibrationEnabled },
          (created) => console.log(`Channel created: ${created}`)
        );
        
        // Update wake-up notification based on setting
        if (wakeupNotificationEnabled) {
          await NotificationService.scheduleWakeupNotification();
        } else {
          NotificationService.cancelWakeupNotification();
        }
      } else {
        PushNotification.deleteChannel('eye-rest-reminders');
        NotificationService.cancelWakeupNotification();
      }
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  }, [notificationsEnabled, vibrationEnabled, wakeupNotificationEnabled, restInterval, restDuration, dailyGoal, streakMode, dailyMinutesGoal]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  const resetAllData = async () => {
    Alert.alert(
      'Reset Everything? 🗑️',
      'This will delete all your progress and settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              // Cancel all notifications
              PushNotification.cancelAllLocalNotifications();
              
              // Cancel wake-up notification specifically
              NotificationService.cancelWakeupNotification();
              
              if (NotificationService.clearTimerState) {
                await NotificationService.clearTimerState();
              }
              
              if (NotificationService.stopTimerNotification) {
                await NotificationService.stopTimerNotification();
              }
              
              // Clear all storage (includes restHistory, wakeupTime, stats, onboardingData, etc.)
              await StorageService.clear();
              
              // Reset local state
              setNotificationsEnabled(true);
              setVibrationEnabled(true);
              setWakeupNotificationEnabled(true);
              setRestInterval(120);
              setRestDuration(20);
              setDailyGoal(4);
              setStreakMode(STREAK_MODES.RESTS);
              setDailyMinutesGoal(DEFAULT_DAILY_MINUTES_GOAL);
              setPurpose(null);
              setCondition(null);
              setUsualWakeupTime({ hour: 7, minute: 0 });
              
              // Emit reset event to trigger onboarding
              ResetEvent.emit();
            } catch (error) {
              console.error('Error during reset:', error);
              Alert.alert('Oops! 😅', 'Something went wrong while resetting data.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleIntervalSave = (value) => {
    const newInterval = parseInt(value, 10);
    if (!isNaN(newInterval) && newInterval > 0) {
      setRestInterval(newInterval);
      NotificationService.updateRestInterval(newInterval);
    }
    setActiveModal(null);
  };

  const handleDurationSave = (value) => {
    const newDuration = parseInt(value, 10);
    if (!isNaN(newDuration) && newDuration > 0) {
      setRestDuration(newDuration);
      NotificationService.updateRestDuration(newDuration);
    }
    setActiveModal(null);
  };

  const handleDailyGoalSave = (value) => {
    const newGoal = parseInt(value, 10);
    if (!isNaN(newGoal) && newGoal > 0 && newGoal <= 10) {
      setDailyGoal(newGoal);
    }
    setActiveModal(null);
  };

  const handleDailyMinutesGoalSave = (value) => {
    const newGoal = parseInt(value, 10);
    if (!isNaN(newGoal) && newGoal > 0 && newGoal <= 1440) {
      setDailyMinutesGoal(newGoal);
    }
    setActiveModal(null);
  };

  const handleStreakModeSelect = (mode) => {
    if (mode === STREAK_MODES.MINUTES || mode === STREAK_MODES.RESTS) {
      setStreakMode(mode);
    }
    setActiveModal(null);
  };

  const handlePurposeSelect = async (purposeId) => {
    setPurpose(purposeId);
    const onboardingData = await StorageService.getItem('onboardingData') || {};
    onboardingData.purpose = purposeId;
    await StorageService.setItem('onboardingData', onboardingData);
    setActiveModal(null);
  };

  const handleConditionSelect = async (conditionId) => {
    setCondition(conditionId);
    const onboardingData = await StorageService.getItem('onboardingData') || {};
    onboardingData.condition = conditionId;
    await StorageService.setItem('onboardingData', onboardingData);
    setActiveModal(null);
  };

  const handleWakeupTimeSave = async (hour, minute) => {
    setUsualWakeupTime({ hour, minute });
    await NotificationService.updateWakeupTime(hour, minute);
    setActiveModal(null);
  };

  const getPurposeLabel = () => {
    const option = PURPOSE_OPTIONS.find(o => o.id === purpose);
    return option ? option.label : 'Not set';
  };

  const getConditionLabel = () => {
    const option = CONDITION_OPTIONS.find(o => o.id === condition);
    return option ? option.label : 'Not set';
  };

  const formatWakeupTime = () => {
    const h = usualWakeupTime.hour.toString().padStart(2, '0');
    const m = usualWakeupTime.minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const SettingItem = ({ icon, iconBg, title, subtitle, rightComponent, onPress }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <FontAwesomeIcon icon={icon} size={22} color="#FFFFFF" />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Rest & Recharge</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Profile</Text>
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingItem
            icon={faUser}
            iconBg="#74B9FF"
            title="Purpose"
            subtitle={getPurposeLabel()}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('purpose')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faHeart}
            iconBg="#FF6B6B"
            title="Health Condition"
            subtitle={getConditionLabel()}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('condition')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faSun}
            iconBg="#FFE66D"
            title="Usual Wake-up Time"
            subtitle={formatWakeupTime()}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('wakeupTime')}
          />
        </Surface>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingItem
            icon={faBell}
            iconBg="#FF6B6B"
            title="Reminders"
            subtitle="Get notified for eye rests"
            rightComponent={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color="#4ECDC4"
              />
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faSun}
            iconBg="#FFE66D"
            title="Wake-up Reminder"
            subtitle="Daily notification at wake-up time"
            rightComponent={
              <Switch
                value={wakeupNotificationEnabled}
                onValueChange={setWakeupNotificationEnabled}
                color="#4ECDC4"
                disabled={!notificationsEnabled}
              />
            }
          />
        </Surface>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Timer Settings</Text>
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingItem
            icon={faClock}
            iconBg="#FFE66D"
            title="Rest Interval"
            subtitle={`Remind every ${restInterval} minutes`}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('interval')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faHourglass}
            iconBg="#74B9FF"
            title="Rest Duration"
            subtitle={`Rest for ${restDuration} minutes`}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('duration')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faChartSimple}
            iconBg="#8B5CF6"
            title="Streak Mode"
            subtitle={streakMode === STREAK_MODES.MINUTES ? 'Based on minutes rested per day' : 'Based on rests per day'}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('streakMode')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          {streakMode === STREAK_MODES.MINUTES ? (
            <SettingItem
              icon={faBullseye}
              iconBg="#10B981"
              title="Daily Goal"
              subtitle={`${dailyMinutesGoal} minutes per day`}
              rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
              onPress={() => setActiveModal('dailyMinutesGoal')}
            />
          ) : (
            <SettingItem
              icon={faBullseye}
              iconBg="#10B981"
              title="Daily Goal"
              subtitle={`${dailyGoal} rests per day`}
              rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
              onPress={() => setActiveModal('dailyGoal')}
            />
          )}
        </Surface>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingItem
            icon={faPalette}
            iconBg="#A29BFE"
            title="Theme"
            subtitle={THEME_OPTIONS.find(t => t.id === themeMode)?.label || 'Light'}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => setActiveModal('theme')}
          />
        </Surface>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
        <Surface style={[styles.section, { backgroundColor: colors.surface }]}>
          <SettingItem
            icon={faCircleInfo}
            iconBg="#FFE66D"
            title="Version"
            subtitle={version}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faCircleQuestion}
            iconBg="#74B9FF"
            title="Help & Support"
            subtitle="Get tips and assistance"
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => Linking.openURL('https://www.vdigital.nl/rechargerest-support.html')}
          />
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <SettingItem
            icon={faShield}
            iconBg="#A29BFE"
            title="Privacy Policy"
            subtitle="How we protect your data"
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color={colors.textMuted} />}
            onPress={() => Linking.openURL('https://www.vdigital.nl/rechargerest-privacy-policy.html')}
          />
        </Surface>

        {/*<Text style={styles.sectionTitle}>Developer Options</Text>*/}
        {/*<Surface style={styles.section}>*/}
        {/*  <SettingItem*/}
        {/*    icon={faLockOpen}*/}
        {/*    iconBg="#4CAF50"*/}
        {/*    title="Unlock All Flowers"*/}
        {/*    subtitle="Unlock all flower types in the garden"*/}
        {/*    rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}*/}
        {/*    onPress={devUnlockAllFlowers}*/}
        {/*  />*/}
        {/*  <View style={styles.divider} />*/}
        {/*  <SettingItem*/}
        {/*    icon={faRotateLeft}*/}
        {/*    iconBg="#FF9800"*/}
        {/*    title="Reset Flower Progress"*/}
        {/*    subtitle="Reset flower unlock progress to 0"*/}
        {/*    rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}*/}
        {/*    onPress={devResetFlowerProgress}*/}
        {/*  />*/}
        {/*  <View style={styles.divider} />*/}
        {/*  <SettingItem*/}
        {/*    icon={faTrashCan}*/}
        {/*    iconBg="#E74C3C"*/}
        {/*    title="Clear All Plots"*/}
        {/*    subtitle="Remove all planted flowers"*/}
        {/*    rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}*/}
        {/*    onPress={devClearAllPlots}*/}
        {/*  />*/}
        {/*  <View style={styles.divider} />*/}
        {/*  <SettingItem*/}
        {/*    icon={faBell}*/}
        {/*    iconBg="#FFE66D"*/}
        {/*    title="Test Wakeup Reminder"*/}
        {/*    subtitle="Schedule a wakeup notification in 1 minute"*/}
        {/*    rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}*/}
        {/*    onPress={async () => {*/}
        {/*      await NotificationService.scheduleTestWakeupNotification();*/}
        {/*      Alert.alert('Test Scheduled', 'A wakeup reminder will appear in 1 minute');*/}
        {/*    }}*/}
        {/*  />*/}
        {/*  <View style={styles.divider} />*/}
        {/*  <SettingItem*/}
        {/*    icon={faSun}*/}
        {/*    iconBg="#FF9800"*/}
        {/*    title="Clear Today's Wakeup"*/}
        {/*    subtitle="Remove wakeup time for current day"*/}
        {/*    rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}*/}
        {/*    onPress={async () => {*/}
        {/*      await StorageService.removeItem('wakeupTime');*/}
        {/*      Alert.alert('Cleared', 'Today\'s wakeup time has been removed');*/}
        {/*    }}*/}
        {/*  />*/}
        {/*</Surface>*/}

        <TouchableOpacity style={[styles.resetButton, { backgroundColor: colors.surface }]} onPress={resetAllData} activeOpacity={0.8}>
          <FontAwesomeIcon icon={faTrashCan} size={24} color="#FF6B6B" />
          <Text style={styles.resetText}>Reset All Data</Text>
        </TouchableOpacity>

        <Text style={[styles.resetWarning, { color: colors.textMuted }]}>
          This will delete all your progress 😢
        </Text>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <InputModal
        visible={activeModal === 'interval'}
        onClose={() => setActiveModal(null)}
        title="Set Rest Interval"
        value={restInterval.toString()}
        onSave={handleIntervalSave}
        label="Minutes between reminders"
        note="How often you'll be reminded to take an eye rest"
      />

      <InputModal
        visible={activeModal === 'duration'}
        onClose={() => setActiveModal(null)}
        title="Set Rest Duration"
        value={restDuration.toString()}
        onSave={handleDurationSave}
        label="Minutes per rest"
        note="How long each eye rest should last"
      />

      <InputModal
        visible={activeModal === 'dailyGoal'}
        onClose={() => setActiveModal(null)}
        title="Set Daily Goal"
        value={dailyGoal.toString()}
        onSave={handleDailyGoalSave}
        label="Rests per day"
        note="How many rests you want to complete each day to maintain your streak"
      />

      <InputModal
        visible={activeModal === 'dailyMinutesGoal'}
        onClose={() => setActiveModal(null)}
        title="Set Daily Minutes Goal"
        value={dailyMinutesGoal.toString()}
        onSave={handleDailyMinutesGoalSave}
        label="Minutes per day"
        note="How many total minutes you want to rest each day to maintain your streak"
      />

      {/* Streak Mode Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'streakMode'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Streak Mode</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                <FontAwesomeIcon icon={faTimes} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputNote, { color: colors.textMuted, marginBottom: 12 }]}>
                Choose how your daily goal and streak are tracked.
              </Text>
              {[
                { id: STREAK_MODES.RESTS, label: 'Rests per day', description: 'Streak is kept by completing N rests each day', icon: faBullseye, color: '#10B981' },
                { id: STREAK_MODES.MINUTES, label: 'Minutes per day', description: 'Streak is kept by resting N minutes each day', icon: faClock, color: '#8B5CF6' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    { backgroundColor: colors.inputBackground },
                    streakMode === option.id && styles.optionItemSelected,
                    streakMode === option.id && { borderColor: option.color },
                  ]}
                  onPress={() => handleStreakModeSelect(option.id)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <FontAwesomeIcon icon={option.icon} size={22} color={option.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.optionLabel, { color: colors.text, marginLeft: 0, flex: 0 }]}>{option.label}</Text>
                    <Text style={[styles.inputNote, { color: colors.textMuted, marginTop: 2 }]}>{option.description}</Text>
                  </View>
                  {streakMode === option.id && (
                    <FontAwesomeIcon icon={faCheck} size={18} color={option.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Purpose Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'purpose'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Purpose</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                <FontAwesomeIcon icon={faTimes} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {PURPOSE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    { backgroundColor: colors.inputBackground },
                    purpose === option.id && styles.optionItemSelected,
                    purpose === option.id && { borderColor: option.color },
                  ]}
                  onPress={() => handlePurposeSelect(option.id)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <FontAwesomeIcon icon={option.icon} size={20} color={option.color} />
                  </View>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                  {purpose === option.id && (
                    <View style={[styles.optionCheck, { backgroundColor: option.color }]}>
                      <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Condition Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'condition'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Health Condition</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                <FontAwesomeIcon icon={faTimes} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {CONDITION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    { backgroundColor: colors.inputBackground },
                    condition === option.id && styles.optionItemSelected,
                    condition === option.id && { borderColor: option.color },
                  ]}
                  onPress={() => handleConditionSelect(option.id)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <FontAwesomeIcon icon={option.icon} size={20} color={option.color} />
                  </View>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                  {condition === option.id && (
                    <View style={[styles.optionCheck, { backgroundColor: option.color }]}>
                      <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Wake-up Time Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'wakeupTime'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Wake-up Time</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                <FontAwesomeIcon icon={faTimes} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.timePickerRow}>
                <View style={styles.timeColumn}>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.inputBackground }]}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      hour: (prev.hour + 1) % 24
                    }))}
                  >
                    <Text style={[styles.timeButtonText, { color: colors.textSecondary }]}>▲</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: colors.text }]}>
                    {usualWakeupTime.hour.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.inputBackground }]}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      hour: (prev.hour - 1 + 24) % 24
                    }))}
                  >
                    <Text style={[styles.timeButtonText, { color: colors.textSecondary }]}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                <View style={styles.timeColumn}>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.inputBackground }]}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      minute: (prev.minute + 15) % 60
                    }))}
                  >
                    <Text style={[styles.timeButtonText, { color: colors.textSecondary }]}>▲</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValue, { color: colors.text }]}>
                    {usualWakeupTime.minute.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.inputBackground }]}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      minute: (prev.minute - 15 + 60) % 60
                    }))}
                  >
                    <Text style={[styles.timeButtonText, { color: colors.textSecondary }]}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.quickTimeRow}>
                {[6, 7, 8, 9].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.quickTimeBtn,
                      { backgroundColor: colors.inputBackground },
                      usualWakeupTime.hour === h && usualWakeupTime.minute === 0 && styles.quickTimeBtnActive,
                    ]}
                    onPress={() => setUsualWakeupTime({ hour: h, minute: 0 })}
                  >
                    <Text style={[
                      styles.quickTimeTxt,
                      { color: colors.textSecondary },
                      usualWakeupTime.hour === h && usualWakeupTime.minute === 0 && styles.quickTimeTxtActive,
                    ]}>
                      {h}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.inputBackground }]}
                onPress={() => setActiveModal(null)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => handleWakeupTimeSave(usualWakeupTime.hour, usualWakeupTime.minute)}
              >
                <FontAwesomeIcon icon={faCheck} size={16} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'theme'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Theme</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={[styles.closeButton, { backgroundColor: colors.inputBackground }]}>
                <FontAwesomeIcon icon={faTimes} size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    { backgroundColor: colors.inputBackground, alignItems: 'center' },
                    themeMode === option.id && styles.optionItemSelected,
                    themeMode === option.id && { borderColor: option.color },
                  ]}
                  onPress={() => {
                    setThemeMode(option.id);
                    setActiveModal(null);
                  }}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <FontAwesomeIcon icon={option.icon} size={20} color={option.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.optionLabel, { color: colors.text, marginLeft: 0 }]}>{option.label}</Text>
                    {option.id === 'auto' && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        Follows device settings
                      </Text>
                    )}
                  </View>
                  {themeMode === option.id && (
                    <View style={[styles.optionCheck, { backgroundColor: option.color }]}>
                      <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Plant Shop Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'plantShop'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.shopModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plant Collection</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            <View style={styles.shopPointsHeader}>
              <FontAwesomeIcon icon={faGem} size={18} color="#A29BFE" />
              <Text style={styles.shopPointsText}>{gardenData.points} points available</Text>
            </View>
            <ScrollView style={styles.plantList}>
              {PLANT_TYPES.map((plant) => {
                const isUnlocked = gardenData?.unlockedPlants?.includes(plant.id);
                const isSelected = gardenData.selectedPlantType === plant.id;
                const canAfford = gardenData.points >= plant.price;
                
                return (
                  <TouchableOpacity
                    key={plant.id}
                    style={[
                      styles.plantItem,
                      isSelected && styles.plantItemSelected,
                    ]}
                    onPress={() => purchasePlant(plant)}
                  >
                    <View style={[styles.plantIcon, { backgroundColor: plant.color + '20' }]}>
                      <FontAwesomeIcon icon={plant.icon} size={24} color={plant.color} />
                    </View>
                    <View style={styles.plantInfo}>
                      <Text style={styles.plantName}>{plant.name}</Text>
                      <Text style={styles.plantDescription}>{plant.description}</Text>
                    </View>
                    <View style={styles.plantPrice}>
                      {isUnlocked ? (
                        isSelected ? (
                          <View style={styles.selectedBadge}>
                            <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
                          </View>
                        ) : (
                          <Text style={styles.ownedText}>Owned</Text>
                        )
                      ) : (
                        <View style={[styles.priceBadge, !canAfford && styles.priceBadgeDisabled]}>
                          {!canAfford && <FontAwesomeIcon icon={faLock} size={10} color="#B2BEC3" />}
                          <FontAwesomeIcon icon={faGem} size={10} color={canAfford ? '#A29BFE' : '#B2BEC3'} />
                          <Text style={[styles.priceText, !canAfford && styles.priceTextDisabled]}>
                            {plant.price}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 18,
    color: '#636E72',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#636E72',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 32,
    padding: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    elevation: 2,
  },
  resetText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginLeft: 12,
  },
  resetWarning: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 120,
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  disabledButton: {
    backgroundColor: '#DFE6E9',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#636E72',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 15,
    fontSize: 18,
    color: '#2D3436',
    marginBottom: 8,
  },
  inputNote: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    elevation: 2,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  optionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeButton: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#636E72',
  },
  timeValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2D3436',
    marginVertical: 8,
    width: 70,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#2D3436',
    marginHorizontal: 8,
  },
  quickTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  quickTimeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
  },
  quickTimeBtnActive: {
    backgroundColor: '#4ECDC4',
  },
  quickTimeTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  quickTimeTxtActive: {
    color: '#FFFFFF',
  },
  shopHeader: {
    padding: 16,
    paddingBottom: 0,
  },
  pointsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  pointsAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  shopModalContent: {
    maxHeight: '80%',
  },
  shopPointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F3F0FF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  shopPointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  plantList: {
    maxHeight: 400,
    paddingHorizontal: 16,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  plantItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  plantIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantInfo: {
    flex: 1,
    marginLeft: 14,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  plantDescription: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  plantPrice: {
    alignItems: 'flex-end',
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceBadgeDisabled: {
    backgroundColor: '#F0F0F0',
  },
  priceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  priceTextDisabled: {
    color: '#B2BEC3',
  },
  ownedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen;
