import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, Modal } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faGem } from '@fortawesome/free-solid-svg-icons/faGem';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faDroplet } from '@fortawesome/free-solid-svg-icons/faDroplet';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';
import { faLeaf } from '@fortawesome/free-solid-svg-icons/faLeaf';
import { faTree } from '@fortawesome/free-solid-svg-icons/faTree';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faCircle } from '@fortawesome/free-solid-svg-icons/faCircle';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import StorageService from '../utils/StorageService';
import { PlantColorEvent } from '../../App';

const POINTS_PER_STAGE = 30;

// Each plant has unique icon progression with FontAwesome icons
const PLANT_TYPES = [
  { 
    id: 'classic', 
    name: 'Classic Tree', 
    price: 0, 
    stageNames: ['Seed', 'Sprout', 'Sapling', 'Young', 'Mature', 'Grand'],
    color: '#4CAF50',
    bgColor: '#E8F5E9',
  },
  { 
    id: 'rose', 
    name: 'Rose', 
    price: 100, 
    stageNames: ['Seed', 'Sprout', 'Bud', 'Bloom', 'Full', 'Prize'],
    color: '#E91E63',
    bgColor: '#FCE4EC',
  },
  { 
    id: 'sunflower', 
    name: 'Sunflower', 
    price: 150, 
    stageNames: ['Seed', 'Sprout', 'Stem', 'Bud', 'Bloom', 'Giant'],
    color: '#FFC107',
    bgColor: '#FFFDE7',
  },
  { 
    id: 'bonsai', 
    name: 'Bonsai', 
    price: 200, 
    stageNames: ['Seed', 'Sprout', 'Young', 'Shaped', 'Mature', 'Master'],
    color: '#795548',
    bgColor: '#EFEBE9',
  },
  { 
    id: 'cherry', 
    name: 'Cherry Blossom', 
    price: 300, 
    stageNames: ['Seed', 'Sprout', 'Branch', 'Bud', 'Bloom', 'Sakura'],
    color: '#F48FB1',
    bgColor: '#FFF0F5',
  },
  { 
    id: 'succulent', 
    name: 'Succulent', 
    price: 250, 
    stageNames: ['Seed', 'Sprout', 'Small', 'Medium', 'Large', 'Lush'],
    color: '#66BB6A',
    bgColor: '#F1F8E9',
  },
];

// Get icon and size based on stage and plant type
const getStageIcon = (stage, plantId = 'classic') => {
  // Sunflower uses sun icon at later stages
  if (plantId === 'sunflower') {
    if (stage === 0) return faCircle; // Seed
    if (stage === 1) return faSeedling; // Sprout
    if (stage === 2) return faSeedling; // Stem
    if (stage === 3) return faSun; // Bud (starting to look like sun)
    if (stage === 4) return faSun; // Bloom
    return faSun; // Giant sunflower
  }
  
  // Default progression for other plants
  if (stage === 0) return faCircle; // Seed
  if (stage === 1) return faSeedling; // Sprout
  if (stage === 2) return faSeedling; // Small plant
  if (stage === 3) return faLeaf; // Growing
  if (stage === 4) return faTree; // Mature
  return faTree; // Max - with star
};

const getStageSize = (stage) => {
  const sizes = [24, 36, 48, 60, 72, 80];
  return sizes[stage] || 48;
};

const GardenScreen = () => {
  const navigation = useNavigation();
  const [gardenData, setGardenData] = useState({
    points: 0,
    unlockedPlants: ['classic'],
    selectedPlantType: 'classic',
    // Track growth per plant: { plantId: { stage: 0, points: 0 } }
    plantProgress: {
      classic: { stage: 0, points: 0 },
    },
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadGardenData();
    }, [])
  );

  const loadGardenData = async () => {
    const storedGardenData = await StorageService.getItem('gardenData');
    if (storedGardenData) {
      // Ensure plantProgress exists for all unlocked plants
      const plantProgress = storedGardenData.plantProgress || { classic: { stage: 0, points: 0 } };
      setGardenData({ ...storedGardenData, plantProgress });
    }
    
    // Check if this is the first time visiting the garden
    const hasSeenTutorial = await StorageService.getItem('gardenTutorialSeen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  };

  const dismissTutorial = async () => {
    setShowTutorial(false);
    await StorageService.setItem('gardenTutorialSeen', true);
  };

  // Get current plant's progress
  const getCurrentPlantProgress = () => {
    const progress = gardenData.plantProgress?.[gardenData.selectedPlantType];
    return progress || { stage: 0, points: 0 };
  };

  // Get the selected plant type data
  const getSelectedPlant = () => {
    return PLANT_TYPES.find(p => p.id === gardenData.selectedPlantType) || PLANT_TYPES[0];
  };

  const TOTAL_STAGES = 6;

  // Get growth progress for current plant (0-1)
  const getGrowthProgress = () => {
    const progress = getCurrentPlantProgress();
    if (progress.stage >= TOTAL_STAGES - 1) {
      return 1;
    }
    return progress.points / POINTS_PER_STAGE;
  };

  // Get points needed for next stage
  const getPointsToNextStage = () => {
    const progress = getCurrentPlantProgress();
    if (progress.stage >= TOTAL_STAGES - 1) {
      return 0;
    }
    return POINTS_PER_STAGE - progress.points;
  };

  // Water the current plant (spend points to grow it)
  const waterPlant = async () => {
    if (gardenData.points < 10) {
      Alert.alert('Not enough gems', 'You need at least 10 gems to water your plant.');
      return;
    }

    const progress = getCurrentPlantProgress();
    
    if (progress.stage >= TOTAL_STAGES - 1) {
      Alert.alert('Fully Grown!', 'This plant is already fully grown!');
      return;
    }

    let newPoints = progress.points + 10;
    let newStage = progress.stage;

    // Check if plant should advance to next stage
    if (newPoints >= POINTS_PER_STAGE) {
      newStage = Math.min(progress.stage + 1, TOTAL_STAGES - 1);
      newPoints = 0;
    }

    const updatedGardenData = {
      ...gardenData,
      points: gardenData.points - 10,
      plantProgress: {
        ...gardenData.plantProgress,
        [gardenData.selectedPlantType]: { stage: newStage, points: newPoints },
      },
    };

    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
  };

  // Select a plant (if unlocked)
  const selectPlant = async (plantType) => {
    if (!gardenData?.unlockedPlants?.includes(plantType.id)) {
      return;
    }
    const updatedGardenData = { ...gardenData, selectedPlantType: plantType.id };
    await StorageService.setItem('gardenData', updatedGardenData);
    setGardenData(updatedGardenData);
    // Emit color change to update navigation immediately
    PlantColorEvent.emit(plantType.color);
  };

  // Purchase/unlock a new plant
  const purchasePlant = async (plantType) => {
    if (gardenData?.unlockedPlants?.includes(plantType.id)) {
      // Already owned, just select it
      selectPlant(plantType);
      return;
    }
    
    if (gardenData.points < plantType.price) {
      Alert.alert('Not enough gems', `You need ${plantType.price - gardenData.points} more gems to unlock this plant.`);
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
              plantProgress: {
                ...gardenData.plantProgress,
                [plantType.id]: { stage: 0, points: 0 },
              },
            };
            await StorageService.setItem('gardenData', updatedGardenData);
            setGardenData(updatedGardenData);
            // Emit color change to update navigation immediately
            PlantColorEvent.emit(plantType.color);
          },
        },
      ]
    );
  };

  const selectedPlant = getSelectedPlant();
  const currentProgress = getCurrentPlantProgress();
  const totalStages = 6;
  const isFullyGrown = currentProgress.stage >= totalStages - 1;

  return (
    <>
      {/* First-time Tutorial Modal */}
      <Modal
        visible={showTutorial}
        transparent={true}
        animationType="fade"
        onRequestClose={dismissTutorial}
      >
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialModal}>
            <View style={styles.tutorialIconRow}>
              <FontAwesomeIcon icon={faSeedling} size={28} color="#4CAF50" />
              <FontAwesomeIcon icon={faGem} size={24} color="#A29BFE" />
              <FontAwesomeIcon icon={faTree} size={28} color="#4CAF50" />
            </View>
            <Text style={styles.tutorialTitle}>Welcome to Your Garden!</Text>
            <Text style={styles.tutorialText}>
              This is your virtual garden where you can grow plants by taking intermediate rests.
            </Text>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faGem} size={16} color="#A29BFE" />
              <Text style={styles.tutorialStepText}>
                Earn gems by completing eye rests
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faDroplet} size={16} color="#4ECDC4" />
              <Text style={styles.tutorialStepText}>
                Use gems to water and grow your plants
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faLock} size={16} color="#636E72" />
              <Text style={styles.tutorialStepText}>
                Unlock new plant types as you progress
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.tutorialButton, { backgroundColor: selectedPlant.color }]}
              onPress={dismissTutorial}
            >
              <Text style={styles.tutorialButtonText}>Let's Grow!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Garden</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <FontAwesomeIcon icon={faGear} size={24} color="#B2BEC3" />
          </TouchableOpacity>
        </View>

      {/* Main Plant Display Card */}
      <Surface style={[styles.plantCard, { backgroundColor: selectedPlant.bgColor }]}>
        {/* Plant Name */}
        <Text style={styles.plantName}>{selectedPlant.name}</Text>
        
        {/* Large Plant Icon */}
        <View style={styles.plantDisplayArea}>
          <View style={[styles.plantIconContainer, { backgroundColor: selectedPlant.color + '20' }]}>
            <FontAwesomeIcon 
              icon={getStageIcon(currentProgress.stage, selectedPlant.id)} 
              size={getStageSize(currentProgress.stage)} 
              color={selectedPlant.color} 
            />
            {isFullyGrown && (
              <View style={styles.starBadge}>
                <FontAwesomeIcon icon={faStar} size={16} color="#FFD700" />
              </View>
            )}
          </View>
        </View>

        {/* Stage Name */}
        <Text style={[styles.stageName, { color: selectedPlant.color }]}>
          {selectedPlant.stageNames[currentProgress.stage]}
        </Text>

        {/* Stage Progress Dots */}
        <View style={styles.stageDotsContainer}>
          {selectedPlant.stageNames.map((name, index) => {
            const isCompleted = index < currentProgress.stage;
            const isCurrent = index === currentProgress.stage;
            const isFuture = index > currentProgress.stage;
            
            return (
              <View key={index} style={styles.stageDotWrapper}>
                <View style={[
                  styles.stageDot,
                  isCompleted && { backgroundColor: selectedPlant.color },
                  isCurrent && styles.stageDotCurrent,
                  isCurrent && { borderColor: selectedPlant.color },
                  isFuture && styles.stageDotFuture,
                ]}>
                  {isCompleted ? (
                    <FontAwesomeIcon icon={faCheck} size={12} color="#FFFFFF" />
                  ) : isCurrent ? (
                    <FontAwesomeIcon icon={getStageIcon(index, selectedPlant.id)} size={14} color={selectedPlant.color} />
                  ) : (
                    <Text style={styles.stageDotNumber}>{index + 1}</Text>
                  )}
                </View>
                {index < totalStages - 1 && (
                  <View style={[
                    styles.stageLine,
                    isCompleted && { backgroundColor: selectedPlant.color },
                  ]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>
              {isFullyGrown ? 'Fully Grown!' : 'Progress to next stage'}
            </Text>
            <Text style={[styles.progressPercent, { color: selectedPlant.color }]}>
              {isFullyGrown ? '100%' : `${Math.round(getGrowthProgress() * 100)}%`}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${getGrowthProgress() * 100}%`, backgroundColor: selectedPlant.color }]} />
          </View>
          {!isFullyGrown && (
            <Text style={styles.progressHint}>
              {getPointsToNextStage()} more points needed
            </Text>
          )}
        </View>

        {/* Water Button */}
        <TouchableOpacity 
          style={[styles.waterButton, { backgroundColor: selectedPlant.color }, (gardenData.points < 10 || isFullyGrown) && styles.waterButtonDisabled]}
          onPress={waterPlant}
          disabled={gardenData.points < 10 || isFullyGrown}
        >
          <FontAwesomeIcon icon={faDroplet} size={20} color="#FFFFFF" />
          <Text style={styles.waterButtonText}>
            {isFullyGrown ? 'Fully Grown!' : 'Water (10 gems)'}
          </Text>
        </TouchableOpacity>
      </Surface>

      {/* Plant Collection */}
      <Text style={styles.sectionTitle}>Your Plants</Text>
      <Text style={styles.sectionSubtitle}>
        {gardenData?.unlockedPlants?.length || 0}/{PLANT_TYPES.length} unlocked • Tap to select
      </Text>

      <View style={styles.plantGrid}>
        {PLANT_TYPES.map((plant) => {
          const isUnlocked = gardenData?.unlockedPlants?.includes(plant.id);
          const isSelected = gardenData.selectedPlantType === plant.id;
          const canAfford = gardenData.points >= plant.price;
          const plantProgress = gardenData.plantProgress?.[plant.id] || { stage: 0, points: 0 };
          const plantIsFullyGrown = plantProgress.stage >= 5;
          
          return (
            <TouchableOpacity
              key={plant.id}
              style={[
                styles.plantGridItem,
                { backgroundColor: isUnlocked ? plant.bgColor : '#F5F5F5' },
                isSelected && styles.plantGridItemSelected,
                isSelected && { borderColor: plant.color },
              ]}
              onPress={() => purchasePlant(plant)}
              activeOpacity={0.7}
            >
              {/* Plant icon display */}
              <View style={[
                styles.plantGridIconBg,
                { backgroundColor: isUnlocked ? plant.color + '20' : '#E0E0E0' }
              ]}>
                {isUnlocked ? (
                  <FontAwesomeIcon 
                    icon={getStageIcon(plantProgress.stage, plant.id)} 
                    size={28} 
                    color={plant.color} 
                  />
                ) : (
                  <FontAwesomeIcon icon={faLock} size={20} color="#9E9E9E" />
                )}
                {plantIsFullyGrown && (
                  <View style={styles.miniStarBadge}>
                    <FontAwesomeIcon icon={faStar} size={10} color="#FFD700" />
                  </View>
                )}
              </View>
              
              {/* Plant name */}
              <Text style={[styles.plantGridName, !isUnlocked && styles.plantGridNameLocked]}>
                {plant.name}
              </Text>
              
              {/* Status indicator */}
              {isUnlocked ? (
                <View style={styles.plantStatusRow}>
                  <Text style={[styles.plantStageLabel, { color: plant.color }]}>
                    {plantIsFullyGrown ? 'Max' : plant.stageNames[plantProgress.stage]}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedDot, { backgroundColor: plant.color }]} />
                  )}
                </View>
              ) : (
                <View style={[styles.priceTag, !canAfford && styles.priceTagDisabled]}>
                  <FontAwesomeIcon icon={faGem} size={10} color={canAfford ? '#A29BFE' : '#B2BEC3'} />
                  <Text style={[styles.priceTagText, !canAfford && styles.priceTagTextDisabled]}>
                    {plant.price}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gemDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  settingsButton: {
    padding: 8,
  },
  gemText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  plantCard: {
    marginHorizontal: 20,
    borderRadius: 28,
    padding: 24,
    elevation: 4,
    alignItems: 'center',
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
  },
  plantDisplayArea: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  plantIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  starBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  stageName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stageDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stageDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageDotCurrent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  stageDotFuture: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  stageDotNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BDBDBD',
  },
  stageLine: {
    width: 12,
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressSection: {
    width: '100%',
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#636E72',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressHint: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 6,
    textAlign: 'center',
  },
  waterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4ECDC4',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    width: '100%',
  },
  waterButtonDisabled: {
    backgroundColor: '#B2BEC3',
  },
  waterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginHorizontal: 24,
    marginTop: 28,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 16,
  },
  plantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  plantGridItem: {
    width: '30%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  plantGridItemSelected: {
    borderWidth: 3,
  },
  plantGridIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  miniStarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    elevation: 1,
  },
  plantGridName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 4,
  },
  plantGridNameLocked: {
    color: '#9E9E9E',
  },
  plantStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plantStageLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priceTagDisabled: {
    backgroundColor: '#F0F0F0',
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6C5CE7',
  },
  priceTagTextDisabled: {
    color: '#B2BEC3',
  },
  bottomPadding: {
    height: 100,
  },
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tutorialModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  tutorialIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 15,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  tutorialStepText: {
    fontSize: 14,
    color: '#2D3436',
    flex: 1,
  },
  tutorialButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 20,
    marginTop: 16,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default GardenScreen;
