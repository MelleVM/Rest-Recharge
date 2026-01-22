import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons/faBriefcase';
import { faGraduationCap } from '@fortawesome/free-solid-svg-icons/faGraduationCap';
import { faHeart } from '@fortawesome/free-solid-svg-icons/faHeart';
import { faBatteryHalf } from '@fortawesome/free-solid-svg-icons/faBatteryHalf';
import { faVirus } from '@fortawesome/free-solid-svg-icons/faVirus';
import { faFire } from '@fortawesome/free-solid-svg-icons/faFire';
import { faClock } from '@fortawesome/free-solid-svg-icons/faClock';
import { faBell } from '@fortawesome/free-solid-svg-icons/faBell';
import { faHourglass } from '@fortawesome/free-solid-svg-icons/faHourglass';
import { faBan } from '@fortawesome/free-solid-svg-icons/faBan';
import StorageService from '../utils/StorageService';
import NotificationService from '../utils/NotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QUESTIONS = [
  {
    id: 'purpose',
    title: 'What brings you here?',
    subtitle: 'Select your main purpose for using this app',
    type: 'single',
    options: [
      { id: 'work', label: 'Work / Office', icon: faBriefcase, color: '#74B9FF' },
      { id: 'study', label: 'Study / Learning', icon: faGraduationCap, color: '#A29BFE' },
      { id: 'health', label: 'Health & Recovery', icon: faHeart, color: '#FF6B6B' },
      { id: 'general', label: 'General Wellness', icon: faSun, color: '#FFE66D' },
    ],
  },
  {
    id: 'condition',
    title: 'Are you dealing with any of these?',
    subtitle: 'This helps us personalize your experience',
    type: 'single',
    options: [
      { id: 'chronic_fatigue', label: 'Chronic Tiredness', icon: faBatteryHalf, color: '#636E72' },
      { id: 'post_covid', label: 'Post-COVID Recovery', icon: faVirus, color: '#00B894' },
      { id: 'burnout', label: 'Burnout', icon: faFire, color: '#FF6B6B' },
      { id: 'none', label: 'None of these', icon: faBan, color: '#B2BEC3' },
    ],
  },
  {
    id: 'wakeupTime',
    title: 'When do you usually wake up?',
    subtitle: 'We\'ll schedule your rest reminders accordingly',
    type: 'time',
  },
  {
    id: 'restInterval',
    title: 'How often should we remind you?',
    subtitle: 'Recommended: every 2 hours',
    type: 'single',
    options: [
      { id: '60', label: 'Every hour', icon: faClock, color: '#FF6B6B' },
      { id: '90', label: 'Every 1.5 hours', icon: faClock, color: '#FFE66D' },
      { id: '120', label: 'Every 2 hours', icon: faClock, color: '#4ECDC4', recommended: true },
      { id: '180', label: 'Every 3 hours', icon: faClock, color: '#74B9FF' },
    ],
  },
  {
    id: 'restDuration',
    title: 'How long should each rest be?',
    subtitle: 'Recommended: 20 minutes',
    type: 'single',
    options: [
      { id: '10', label: '10 minutes', icon: faHourglass, color: '#74B9FF' },
      { id: '15', label: '15 minutes', icon: faHourglass, color: '#FFE66D' },
      { id: '20', label: '20 minutes', icon: faHourglass, color: '#4ECDC4', recommended: true },
      { id: '30', label: '30 minutes', icon: faHourglass, color: '#A29BFE' },
    ],
  },
];

const OnboardingScreen = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    purpose: null,
    condition: null,
    wakeupTime: { hour: 7, minute: 0 },
    restInterval: '120',
    restDuration: '20',
  });
  const scrollViewRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = QUESTIONS[currentStep];
  const isLastStep = currentStep === QUESTIONS.length - 1;
  const canProceed = currentQuestion.type === 'time' 
    ? true 
    : answers[currentQuestion.id] !== null;

  const animateProgress = (step) => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / QUESTIONS.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleNext = async () => {
    if (isLastStep) {
      await saveOnboardingData();
      onComplete();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      animateProgress(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      animateProgress(prevStep);
    }
  };

  const handleOptionSelect = (optionId) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleTimeChange = (type, delta) => {
    setAnswers(prev => {
      const current = prev.wakeupTime;
      let newHour = current.hour;
      let newMinute = current.minute;

      if (type === 'hour') {
        newHour = (current.hour + delta + 24) % 24;
      } else {
        newMinute = (current.minute + delta + 60) % 60;
      }

      return {
        ...prev,
        wakeupTime: { hour: newHour, minute: newMinute },
      };
    });
  };

  const saveOnboardingData = async () => {
    const onboardingData = {
      purpose: answers.purpose,
      condition: answers.condition,
      usualWakeupTime: answers.wakeupTime,
      completedAt: Date.now(),
    };

    await StorageService.setItem('onboardingData', onboardingData);

    const settings = await StorageService.getItem('settings') || {};
    settings.restInterval = parseInt(answers.restInterval, 10);
    settings.restDuration = parseInt(answers.restDuration, 10);
    settings.wakeupNotificationEnabled = true;
    await StorageService.setItem('settings', settings);

    await StorageService.setItem('onboardingCompleted', true);
    
    // Schedule daily wake-up notification
    await NotificationService.scheduleWakeupNotification();
  };

  const formatTime = (hour, minute) => {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const renderOptionCard = (option) => {
    const isSelected = answers[currentQuestion.id] === option.id;
    
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.optionCard,
          isSelected && styles.optionCardSelected,
          isSelected && { borderColor: option.color },
        ]}
        onPress={() => handleOptionSelect(option.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
          <FontAwesomeIcon icon={option.icon} size={24} color={option.color} />
        </View>
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          {option.label}
        </Text>
        {option.recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        )}
        {isSelected && (
          <View style={[styles.checkIcon, { backgroundColor: option.color }]}>
            <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTimePicker = () => {
    const { hour, minute } = answers.wakeupTime;
    
    return (
      <View style={styles.timePickerContainer}>
        <Surface style={styles.timePickerCard}>
          <View style={styles.timePickerRow}>
            {/* Hour */}
            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => handleTimeChange('hour', 1)}
              >
                <Text style={styles.timeButtonText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>{hour.toString().padStart(2, '0')}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => handleTimeChange('hour', -1)}
              >
                <Text style={styles.timeButtonText}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            {/* Minute */}
            <View style={styles.timeColumn}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => handleTimeChange('minute', 15)}
              >
                <Text style={styles.timeButtonText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>{minute.toString().padStart(2, '0')}</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => handleTimeChange('minute', -15)}
              >
                <Text style={styles.timeButtonText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>

        <View style={styles.quickTimeOptions}>
          {[6, 7, 8, 9].map((h) => (
            <TouchableOpacity
              key={h}
              style={[
                styles.quickTimeButton,
                hour === h && minute === 0 && styles.quickTimeButtonActive,
              ]}
              onPress={() => setAnswers(prev => ({
                ...prev,
                wakeupTime: { hour: h, minute: 0 },
              }))}
            >
              <Text style={[
                styles.quickTimeText,
                hour === h && minute === 0 && styles.quickTimeTextActive,
              ]}>
                {h}:00
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep + 1} of {QUESTIONS.length}
        </Text>
      </View>

      {/* Question Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
        <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>

        {currentQuestion.type === 'single' && (
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map(renderOptionCard)}
          </View>
        )}

        {currentQuestion.type === 'time' && renderTimePicker()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentStep > 0 ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <FontAwesomeIcon icon={faChevronLeft} size={18} color="#636E72" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.7}
        >
          <Text style={styles.nextButtonText}>
            {isLastStep ? 'Get Started' : 'Continue'}
          </Text>
          <FontAwesomeIcon
            icon={isLastStep ? faCheck : faChevronRight}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#B2BEC3',
    textAlign: 'right',
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  questionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionCardSelected: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginLeft: 14,
  },
  optionLabelSelected: {
    fontWeight: 'bold',
  },
  recommendedBadge: {
    backgroundColor: '#E8F8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    alignItems: 'center',
  },
  timePickerCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeButton: {
    width: 60,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  timeButtonText: {
    fontSize: 18,
    color: '#636E72',
  },
  timeValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#2D3436',
    marginVertical: 8,
    width: 80,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2D3436',
    marginHorizontal: 8,
  },
  quickTimeOptions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  quickTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickTimeButtonActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  quickTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  quickTimeTextActive: {
    color: '#FFFFFF',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#DFE6E9',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default OnboardingScreen;
