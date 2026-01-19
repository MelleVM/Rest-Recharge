import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, TextInput as RNTextInput } from 'react-native';
import { Switch, Surface, Text, useTheme } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faMobile } from '@fortawesome/free-solid-svg-icons/faMobile';
import { faMoon } from '@fortawesome/free-solid-svg-icons/faMoon';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faCircleQuestion } from '@fortawesome/free-solid-svg-icons/faCircleQuestion';
import { faShield } from '@fortawesome/free-solid-svg-icons/faShield';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons/faTrashCan';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faHourglass } from '@fortawesome/free-solid-svg-icons/faHourglass';
import { faStopwatch } from '@fortawesome/free-solid-svg-icons/faStopwatch';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
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

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [restInterval, setRestInterval] = useState(120);
  const [restDuration, setRestDuration] = useState(20);
  const [temporaryInterval, setTemporaryInterval] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await NotificationService.getSettings();
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
      setVibrationEnabled(settings.vibrationEnabled ?? true);
      setDarkModeEnabled(settings.darkModeEnabled ?? false);
      setRestInterval(settings.restInterval ?? 120);
      setRestDuration(settings.restDuration ?? 20);
      setTemporaryInterval(settings.temporaryInterval);
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const saveSettings = useCallback(async () => {
    try {
      const settings = { 
        notificationsEnabled, 
        vibrationEnabled, 
        darkModeEnabled,
        restInterval,
        restDuration,
        temporaryInterval
      };
      await StorageService.setItem('settings', settings);

      if (notificationsEnabled) {
        PushNotification.createChannel(
          { channelId: 'eye-rest-reminders', channelName: 'Eye Rest Reminders', vibrate: vibrationEnabled },
          (created) => console.log(`Channel created: ${created}`)
        );
      } else {
        PushNotification.deleteChannel('eye-rest-reminders');
      }
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  }, [notificationsEnabled, vibrationEnabled, darkModeEnabled, restInterval, restDuration, temporaryInterval]);

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
              PushNotification.cancelAllLocalNotifications();
              
              if (NotificationService.clearTimerState) {
                await NotificationService.clearTimerState();
              }
              
              if (NotificationService.stopTimerNotification) {
                await NotificationService.stopTimerNotification();
              }
              
              await StorageService.clear();
              
              setNotificationsEnabled(true);
              setVibrationEnabled(true);
              setDarkModeEnabled(false);
              setRestInterval(120);
              setRestDuration(20);
              setTemporaryInterval(null);
              
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

  const handleTempIntervalSave = async (value) => {
    const newTempInterval = parseInt(value, 10);
    if (!isNaN(newTempInterval) && newTempInterval > 0) {
      setTemporaryInterval(newTempInterval);
      await NotificationService.setTemporaryInterval(newTempInterval);
      Alert.alert(
        'Temporary Interval Set',
        `Reminders will now occur every ${newTempInterval} minutes until you clear this setting.`
      );
    }
    setActiveModal(null);
  };

  const clearTemporaryInterval = async () => {
    setTemporaryInterval(null);
    await NotificationService.clearTemporaryInterval();
    Alert.alert(
      'Temporary Interval Cleared',
      `Reminders will now follow your normal interval setting of ${restInterval} minutes.`
    );
  };

  const setTenMinuteInterval = async () => {
    setTemporaryInterval(10);
    await NotificationService.setTemporaryInterval(10);
    Alert.alert(
      'Testing Mode Activated',
      'Reminders will now occur every 10 minutes for testing purposes.'
    );
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
          <Text style={styles.title}>Settings ⚙️</Text>
          <Text style={styles.subtitle}>Rest & Recharge</Text>
        </View>

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
          <View style={styles.divider} />
          <SettingItem
            icon={faStopwatch}
            iconBg="#A29BFE"
            title="Temporary Interval"
            subtitle={temporaryInterval ? `Currently set to ${temporaryInterval} minutes` : "Use normal interval"}
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={() => {
              if (temporaryInterval) {
                Alert.alert(
                  'Temporary Interval',
                  `Current temporary interval: ${temporaryInterval} minutes`,
                  [
                    { text: 'Clear', onPress: clearTemporaryInterval, style: 'destructive' },
                    { text: 'Change', onPress: () => setActiveModal('tempInterval') },
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              } else {
                setActiveModal('tempInterval');
              }
            }}
          />
        </Surface>

        <Text style={styles.sectionTitle}>Testing</Text>
        <Surface style={styles.section}>
          <SettingItem
            icon={faStopwatch}
            iconBg="#FF6B6B"
            title="10-Minute Test Mode"
            subtitle="Set reminders to every 10 minutes"
            rightComponent={<FontAwesomeIcon icon={faChevronRight} size={16} color="#B2BEC3" />}
            onPress={setTenMinuteInterval}
          />
        </Surface>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <Surface style={styles.section}>
          <SettingItem
            icon={faMoon}
            iconBg="#636E72"
            title="Dark Mode"
            subtitle="Coming soon!"
            rightComponent={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                color="#4ECDC4"
                disabled={true}
              />
            }
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

      <InputModal
        visible={activeModal === 'tempInterval'}
        onClose={() => setActiveModal(null)}
        title="Set Temporary Interval"
        value={temporaryInterval ? temporaryInterval.toString() : ''}
        onSave={handleTempIntervalSave}
        label="Minutes between reminders (temporary)"
        note="This will override your normal interval until you clear it"
      />
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
});

export default SettingsScreen;
