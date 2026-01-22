import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
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
import PushNotification from 'react-native-push-notification';
import StorageService from '../utils/StorageService';
import NotificationService from '../utils/NotificationService';

// Separate Modal Component to prevent re-renders
const InputModal = React.memo(({ visible, onClose, title, value, onChangeText, onSave, label, note }) => {
  const [localValue, setLocalValue] = useState(value);
  
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{label}</Text>
                <RNTextInput
                  style={styles.input}
                  value={localValue}
                  onChangeText={setLocalValue}
                  keyboardType="numeric"
                  placeholder="Enter minutes"
                  placeholderTextColor="#B2BEC3"
                  autoFocus={true}
                />
                <Text style={styles.inputNote}>{note}</Text>
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
  { id: 'chronic_fatigue', label: 'Chronic Tiredness', icon: faBatteryHalf, color: '#636E72' },
  { id: 'post_covid', label: 'Post-COVID Recovery', icon: faVirus, color: '#00B894' },
  { id: 'burnout', label: 'Burnout', icon: faFire, color: '#FF6B6B' },
  { id: 'none', label: 'None of these', icon: faBan, color: '#B2BEC3' },
];

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [wakeupNotificationEnabled, setWakeupNotificationEnabled] = useState(true);
  const [restInterval, setRestInterval] = useState(120);
  const [restDuration, setRestDuration] = useState(20);
  const [activeModal, setActiveModal] = useState(null);
  
  // Profile/Onboarding data
  const [purpose, setPurpose] = useState(null);
  const [condition, setCondition] = useState(null);
  const [usualWakeupTime, setUsualWakeupTime] = useState({ hour: 7, minute: 0 });
  
  const theme = useTheme();

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
      
      // Load onboarding/profile data
      const onboardingData = await StorageService.getItem('onboardingData');
      if (onboardingData) {
        setPurpose(onboardingData.purpose || null);
        setCondition(onboardingData.condition || null);
        setUsualWakeupTime(onboardingData.usualWakeupTime || { hour: 7, minute: 0 });
      }
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = useCallback(async () => {
    try {
      const settings = { 
        notificationsEnabled, 
        vibrationEnabled,
        wakeupNotificationEnabled,
        restInterval,
        restDuration
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
  }, [notificationsEnabled, vibrationEnabled, wakeupNotificationEnabled, restInterval, restDuration]);

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
              setPurpose(null);
              setCondition(null);
              setUsualWakeupTime({ hour: 7, minute: 0 });
              
              Alert.alert(
                'Reset Complete ✨', 
                'All data has been reset to defaults.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      if (navigation && navigation.navigate) {
                        navigation.navigate('Home');
                      }
                    }
                  }
                ]
              );
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
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Rest & Recharge</Text>
        </View>

        <Text style={styles.sectionTitle}>Your Profile</Text>
        <Surface style={styles.section}>
          <SettingItem
            icon={faUser}
            iconBg="#74B9FF"
            title="Purpose"
            subtitle={getPurposeLabel()}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => setActiveModal('purpose')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={faHeart}
            iconBg="#FF6B6B"
            title="Health Condition"
            subtitle={getConditionLabel()}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => setActiveModal('condition')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={faSun}
            iconBg="#FFE66D"
            title="Usual Wake-up Time"
            subtitle={formatWakeupTime()}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => setActiveModal('wakeupTime')}
          />
        </Surface>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Surface style={styles.section}>
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
          <View style={styles.divider} />
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
          <View style={styles.divider} />
          <SettingItem
            icon={faMobile}
            iconBg="#4ECDC4"
            title="Vibration"
            subtitle="Buzz when timer ends"
            rightComponent={
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                color="#4ECDC4"
                disabled={!notificationsEnabled}
              />
            }
          />
        </Surface>

        <Text style={styles.sectionTitle}>Timer Settings</Text>
        <Surface style={styles.section}>
          <SettingItem
            icon={faClock}
            iconBg="#FFE66D"
            title="Rest Interval"
            subtitle={`Remind every ${restInterval} minutes`}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => setActiveModal('interval')}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={faHourglass}
            iconBg="#74B9FF"
            title="Rest Duration"
            subtitle={`Rest for ${restDuration} minutes`}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => setActiveModal('duration')}
          />
        </Surface>

        <Text style={styles.sectionTitle}>About</Text>
        <Surface style={styles.section}>
          <SettingItem
            icon={faCircleInfo}
            iconBg="#FFE66D"
            title="Version"
            subtitle="1.0.0"
          />
          <View style={styles.divider} />
          <SettingItem
            icon={faCircleQuestion}
            iconBg="#74B9FF"
            title="Help & Support"
            subtitle="Get tips and assistance"
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={faShield}
            iconBg="#A29BFE"
            title="Privacy Policy"
            subtitle="How we protect your data"
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => {}}
          />
        </Surface>

        <TouchableOpacity style={styles.resetButton} onPress={resetAllData} activeOpacity={0.8}>
          <FontAwesomeIcon icon={faTrashCan} size={24} color="#FF6B6B" />
          <Text style={styles.resetText}>Reset All Data</Text>
        </TouchableOpacity>

        <Text style={styles.resetWarning}>
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

      {/* Purpose Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={activeModal === 'purpose'}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Purpose</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {PURPOSE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    purpose === option.id && styles.optionItemSelected,
                    purpose === option.id && { borderColor: option.color },
                  ]}
                  onPress={() => handlePurposeSelect(option.id)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <FontAwesomeIcon icon={option.icon} size={20} color={option.color} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Health Condition</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {CONDITION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionItem,
                    condition === option.id && styles.optionItemSelected,
                    condition === option.id && { borderColor: option.color },
                  ]}
                  onPress={() => handleConditionSelect(option.id)}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                    <FontAwesomeIcon icon={option.icon} size={20} color={option.color} />
                  </View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wake-up Time</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeButton}>
                <FontAwesomeIcon icon={faTimes} size={22} color="#636E72" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.timePickerRow}>
                <View style={styles.timeColumn}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      hour: (prev.hour + 1) % 24
                    }))}
                  >
                    <Text style={styles.timeButtonText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>
                    {usualWakeupTime.hour.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      hour: (prev.hour - 1 + 24) % 24
                    }))}
                  >
                    <Text style={styles.timeButtonText}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeColumn}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      minute: (prev.minute + 15) % 60
                    }))}
                  >
                    <Text style={styles.timeButtonText}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>
                    {usualWakeupTime.minute.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setUsualWakeupTime(prev => ({
                      ...prev,
                      minute: (prev.minute - 15 + 60) % 60
                    }))}
                  >
                    <Text style={styles.timeButtonText}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.quickTimeRow}>
                {[6, 7, 8, 9].map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.quickTimeBtn,
                      usualWakeupTime.hour === h && usualWakeupTime.minute === 0 && styles.quickTimeBtnActive,
                    ]}
                    onPress={() => setUsualWakeupTime({ hour: h, minute: 0 })}
                  >
                    <Text style={[
                      styles.quickTimeTxt,
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
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setActiveModal(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: '#FFFFFF',
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
    color: '#B2BEC3',
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
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    backgroundColor: '#FFFFFF',
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
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginLeft: 12,
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
});

export default SettingsScreen;
