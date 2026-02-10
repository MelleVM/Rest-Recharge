import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faSun } from '@fortawesome/free-solid-svg-icons/faSun';
import { faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faListUl } from '@fortawesome/free-solid-svg-icons/faListUl';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import StorageService from '../utils/StorageService';
import { FONTS } from '../styles/fonts';
import { FLOWER_TYPES, PLOT_UNLOCK_REQUIREMENTS, MAX_PLOTS, ENERGY_DECAY_RATE, ENERGY_PER_REST, MAX_ENERGY } from '../config/flowerConfig';
import FlowerTimeline from '../components/FlowerTimeline';
import FlowerSelection from '../components/FlowerSelection';


const GardenScreen = ({ navigation, route }) => {
  const [gardenData, setGardenData] = useState({
    energy: 0.5,
    totalRests: 0,
    lastEnergyUpdate: Date.now(),
    plots: [],
  });
  const [currentPlotIndex, setCurrentPlotIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFlowerSelection, setShowFlowerSelection] = useState(false);
  const [energyBarWidth, setEnergyBarWidth] = useState(0);

  // Load garden data on focus
  useFocusEffect(
    useCallback(() => {
      loadGardenData();
      // Handle navigation parameter for plot index
      if (route.params?.plotIndex !== undefined) {
        setCurrentPlotIndex(route.params.plotIndex);
      }
    }, [route.params?.plotIndex])
  );

  // Update energy decay periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateEnergyDecay();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [gardenData]);

  const loadGardenData = async () => {
    const stored = await StorageService.getItem('sunflowerGarden');
    const stats = await StorageService.getItem('stats');
    const totalRests = stats?.totalRests || 0;

    const now = Date.now();
    let gardenState;

    if (stored) {
      // Check if this is old format (single flower) or new format (multi-plot)
      if (!stored.plots) {
        // Migrate from old format to new format
        const timeSinceUpdate = now - (stored.lastEnergyUpdate || now);
        const energyLost = timeSinceUpdate * ENERGY_DECAY_RATE;
        const newEnergy = Math.max(0, (stored.energy || 0.5) - energyLost);

        gardenState = {
          energy: newEnergy,
          totalRests,
          lastEnergyUpdate: now,
          plots: [
            {
              id: 0,
              flowerType: 'sunflower',
              restsGiven: stored.totalRests || 0,
              plantedDate: stored.lastRestTime || now,
              isUnlocked: true,
            }
          ],
        };
      } else {
        // New format - calculate energy decay
        const timeSinceUpdate = now - (stored.lastEnergyUpdate || now);
        const energyLost = timeSinceUpdate * ENERGY_DECAY_RATE;
        const newEnergy = Math.max(0, (stored.energy || 0.5) - energyLost);

        gardenState = {
          ...stored,
          energy: newEnergy,
          totalRests,
          lastEnergyUpdate: now,
        };
      }
    } else {
      // Initialize new garden with first plot
      gardenState = {
        energy: 0.5,
        totalRests,
        lastEnergyUpdate: now,
        plots: [
          {
            id: 0,
            flowerType: 'sunflower',
            restsGiven: 0,
            plantedDate: now,
            isUnlocked: true,
          }
        ],
      };
    }

    // Ensure all plots up to MAX_PLOTS exist in the data structure
    const plots = [...(gardenState.plots || [])];
    for (let i = plots.length; i < MAX_PLOTS; i++) {
      const unlockReq = PLOT_UNLOCK_REQUIREMENTS.find(req => req.plotIndex === i);
      plots.push({
        id: i,
        flowerType: null,
        restsGiven: 0,
        plantedDate: null,
        isUnlocked: totalRests >= (unlockReq?.restsRequired || 0),
      });
    }

    // Update unlock status for all plots based on current total rests
    plots.forEach((plot, index) => {
      const unlockReq = PLOT_UNLOCK_REQUIREMENTS.find(req => req.plotIndex === index);
      plot.isUnlocked = totalRests >= (unlockReq?.restsRequired || 0);
    });

    gardenState.plots = plots;

    setGardenData(gardenState);
    await StorageService.setItem('sunflowerGarden', gardenState);
    
    // Check if this is the first time visiting garden
    const hasSeenTutorial = await StorageService.getItem('gardenTutorialSeen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  };

  const dismissTutorial = async () => {
    setShowTutorial(false);
    await StorageService.setItem('gardenTutorialSeen', true);
  };

  const updateEnergyDecay = async () => {
    const now = Date.now();
    const timeSinceUpdate = now - gardenData.lastEnergyUpdate;
    const energyLost = timeSinceUpdate * ENERGY_DECAY_RATE;
    
    if (energyLost > 0.01) { // Only update if meaningful change
      const newEnergy = Math.max(0, gardenData.energy - energyLost);
      const updatedData = {
        ...gardenData,
        energy: newEnergy,
        lastEnergyUpdate: now,
      };
      setGardenData(updatedData);
      await StorageService.setItem('sunflowerGarden', updatedData);
    }
  };

  // Get current plot
  const getCurrentPlot = () => {
    return gardenData.plots[currentPlotIndex] || null;
  };

  // Get growth stages for current plot's flower type
  const getGrowthStages = (flowerType) => {
    return FLOWER_TYPES[flowerType]?.growthStages || [];
  };

  // Get current growth stage based on rests given to this plot
  const getCurrentStage = (plot) => {
    if (!plot || !plot.flowerType) return null;
    const stages = getGrowthStages(plot.flowerType);
    let currentStage = stages[0];
    for (const stage of stages) {
      if (plot.restsGiven >= stage.restsNeeded) {
        currentStage = stage;
      }
    }
    return currentStage;
  };

  // Get next stage info
  const getNextStage = (plot) => {
    if (!plot || !plot.flowerType) return null;
    const stages = getGrowthStages(plot.flowerType);
    const currentStage = getCurrentStage(plot);
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      return stages[currentIndex + 1];
    }
    return null;
  };

  // Get progress to next stage (0-1)
  const getProgressToNextStage = (plot) => {
    if (!plot || !plot.flowerType) return 0;
    const currentStage = getCurrentStage(plot);
    const nextStage = getNextStage(plot);
    if (!nextStage) return 1;

    const restsInCurrentStage = plot.restsGiven - currentStage.restsNeeded;
    const restsNeededForNext = nextStage.restsNeeded - currentStage.restsNeeded;
    return Math.min(1, restsInCurrentStage / restsNeededForNext);
  };

  // Navigation handlers
  const goToPreviousPlot = () => {
    if (currentPlotIndex > 0) {
      setCurrentPlotIndex(currentPlotIndex - 1);
    }
  };

  const goToNextPlot = () => {
    if (currentPlotIndex < gardenData.plots.length - 1) {
      setCurrentPlotIndex(currentPlotIndex + 1);
    }
  };

  // Get current plot data
  const currentPlot = getCurrentPlot();
  const currentStage = getCurrentStage(currentPlot);
  const nextStage = getNextStage(currentPlot);
  const progressToNext = getProgressToNextStage(currentPlot);

  // Determine flower health status based on energy
  const getHealthStatus = () => {
    if (gardenData.energy >= 0.7) return { status: 'Thriving', color: '#4CAF50' };
    if (gardenData.energy >= 0.4) return { status: 'Healthy', color: '#FFC107' };
    if (gardenData.energy >= 0.2) return { status: 'Needs Care', color: '#FF9800' };
    return { status: 'Wilting', color: '#F44336' };
  };

  const healthStatus = getHealthStatus();

  // Determine which image to show based on energy level
  const isWilted = gardenData.energy < 0.4;
  const flowerImage = currentStage ? (isWilted ? currentStage.wiltedImage : currentStage.image) : null;

  // Get unlock requirement for current plot
  const getPlotUnlockRequirement = (plotIndex) => {
    const req = PLOT_UNLOCK_REQUIREMENTS.find(r => r.plotIndex === plotIndex);
    return req?.restsRequired || 0;
  };

  // Handle planting a flower
  const handlePlantFlower = async (flowerId) => {
    const updatedPlots = [...gardenData.plots];
    updatedPlots[currentPlotIndex] = {
      ...updatedPlots[currentPlotIndex],
      flowerType: flowerId,
      restsGiven: 0,
      plantedDate: Date.now(),
    };

    const updatedData = {
      ...gardenData,
      plots: updatedPlots,
    };

    setGardenData(updatedData);
    await StorageService.setItem('sunflowerGarden', updatedData);
    setShowFlowerSelection(false);
  };

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
            <Text style={styles.tutorialTitle}>Your Sunflower Garden</Text>
            <Text style={styles.tutorialText}>
              Keep your sunflower healthy by taking timely rests. Your flower needs regular care to thrive!
            </Text>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faSeedling} size={16} color="#FFC107" />
              <Text style={styles.tutorialStepText}>
                Complete rests to help your sunflower grow
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faBolt} size={16} color="#FFC107" />
              <Text style={styles.tutorialStepText}>
                Energy depletes over time without rests
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <FontAwesomeIcon icon={faEye} size={16} color="#FF6B6B" />
              <Text style={styles.tutorialStepText}>
                Take regular breaks to keep it blooming
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.tutorialButton, { backgroundColor: '#FFC107' }]}
              onPress={dismissTutorial}
            >
              <Text style={styles.tutorialButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <FontAwesomeIcon 
              icon={faArrowLeft} 
              size={20} 
              color="#636E72" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={goToPreviousPlot}
            disabled={currentPlotIndex === 0}
            style={styles.navButton}
          >
            <FontAwesomeIcon 
              icon={faChevronLeft} 
              size={20} 
              color={currentPlotIndex === 0 ? '#E0E0E0' : '#636E72'} 
            />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {currentPlot?.flowerType ? FLOWER_TYPES[currentPlot.flowerType]?.name : 'Empty Plot'}
            </Text>
            <Text style={styles.plotIndicator}>
              Plot {currentPlotIndex + 1} of {gardenData.plots.length}
            </Text>
          </View>

          <TouchableOpacity 
            onPress={goToNextPlot}
            disabled={currentPlotIndex === gardenData.plots.length - 1}
            style={styles.navButton}
          >
            <FontAwesomeIcon 
              icon={faChevronRight} 
              size={20} 
              color={currentPlotIndex === gardenData.plots.length - 1 ? '#E0E0E0' : '#636E72'} 
            />
          </TouchableOpacity>
        </View>

      <View style={styles.contentContainer}>
        {/* Plot Status or Growth Stage Dots */}
        {!currentPlot?.isUnlocked ? (
          <View style={styles.lockedPlotContainer}>
            <FontAwesomeIcon icon={faLock} size={32} color="#B0B0B0" />
            <Text style={styles.lockedPlotText}>
              Unlock at {getPlotUnlockRequirement(currentPlotIndex)} total rests
            </Text>
            <Text style={styles.lockedPlotSubtext}>
              {getPlotUnlockRequirement(currentPlotIndex) - gardenData.totalRests} more rests to go!
            </Text>
          </View>
        ) : !currentPlot?.flowerType ? (
          <View style={styles.emptyPlotContainer}>
            <FontAwesomeIcon icon={faSeedling} size={32} color="#B0B0B0" />
            <Text style={styles.emptyPlotText}>Empty Plot</Text>
            <Text style={styles.emptyPlotSubtext}>Plant a flower to get started!</Text>
            <TouchableOpacity 
              style={styles.plantButton}
              onPress={() => setShowFlowerSelection(true)}
            >
              <Text style={styles.plantButtonText}>Plant Flower</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Growth Stage Dots */}
            <View style={styles.stageDotsContainer}>
              {getGrowthStages(currentPlot.flowerType).map((stage, index) => {
                const isCompleted = currentPlot.restsGiven >= stage.restsNeeded;
                const isCurrent = currentStage && stage.name === currentStage.name;
                const isNext = nextStage && stage.name === nextStage.name;

                return (
                  <View key={stage.name} style={styles.stageDotWrapper}>
                    <View style={[
                      styles.stageDot,
                      isCompleted && styles.stageDotCompleted,
                      isCurrent && styles.stageDotCurrent,
                    ]}>
                      {isCompleted && <Text style={styles.stageDotCheck}>✓</Text>}
                    </View>
                    {index < getGrowthStages(currentPlot.flowerType).length - 1 && (
                      <View style={[
                        styles.stageLine,
                        isCompleted && !isCurrent && styles.stageLineCompleted,
                      ]} />
                    )}
                  </View>
                );
              })}
            </View>
            {nextStage ? (
              <Text style={styles.stageHint}>
                {nextStage.restsNeeded - currentPlot.restsGiven} rests to {nextStage.name}
              </Text>
            ) : (
              <Text style={styles.stageHint}>🌻 Fully grown!</Text>
            )}
          </>
        )}

        {/* Flower Display */}
        <View style={styles.imageContainer}>
          <View style={styles.gardenPlot}>
            <View style={styles.flowerContainer}>
              <View style={styles.sunflowerWrapper}>
                {currentPlot?.isUnlocked && currentPlot?.flowerType && flowerImage && currentStage ? (
                  <Image
                    source={flowerImage}
                    style={[
                      styles.sunflower,
                      {
                        transform: [
                          { translateY: (1 - currentStage.scale) * 125 },
                          { scale: currentStage.scale },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.emptyFlowerPlaceholder, { transform: [{ translateY: 40 }] }]}>
                    {!currentPlot?.isUnlocked ? (
                      <FontAwesomeIcon icon={faLock} size={48} color="#D0D0D0" />
                    ) : (
                      <FontAwesomeIcon icon={faSeedling} size={48} color="#D0D0D0" />
                    )}
                  </View>
                )}
              </View>
              <Image
                source={require('../../assets/images/grass_plot_4.png')}
                style={styles.grassPatch}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        {/* Energy Bar */}
        <View style={styles.energySection}>
          <View style={styles.energyHeader}>
            <View style={styles.energyLabelRow}>
              <FontAwesomeIcon icon={faBolt} size={14} color="#FFC107" />
              <Text style={styles.energyLabel}>Energy</Text>
            </View>
            <Text style={styles.energyPercent}>{Math.round(gardenData.energy * 100)}%</Text>
          </View>
          <View
            style={styles.energyBarContainer}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setEnergyBarWidth(width);
            }}
          >
            <View style={styles.energyBarBackground}>
              <View style={[styles.energyBarFill, { width: `${gardenData.energy * 100}%` }]}>
                <LinearGradient
                  colors={['#FFAAA5', '#FFD3B6', '#A8E6CF']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.energyBarGradient, { width: energyBarWidth }]}
                />
              </View>
            </View>
          </View>
          <Text style={styles.energyHint}>
            Complete eye rests to restore energy
          </Text>
        </View>
      </View>

      {/* Collection Button */}
      <TouchableOpacity 
        style={styles.collectionButton}
        onPress={() => setShowTimeline(true)}
      >
        <FontAwesomeIcon icon={faListUl} size={18} color="#636E72" />
      </TouchableOpacity>
    </View>

      {/* Flower Timeline Modal */}
      <Modal
        visible={showTimeline}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeline(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlowerTimeline 
              totalRests={gardenData.totalRests}
              onClose={() => setShowTimeline(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Flower Selection Modal */}
      <Modal
        visible={showFlowerSelection}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFlowerSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlowerSelection 
              totalRests={gardenData.totalRests}
              onSelectFlower={handlePlantFlower}
              onClose={() => setShowFlowerSelection(false)}
            />
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
    alignItems: 'center',
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  navButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#505255',
    fontFamily: FONTS.regular,
  },
  plotIndicator: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gardenPlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  flowerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sunflowerWrapper: {
    width: 250,
    height: 250,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  sunflower: {
    width: 250,
    height: 250,
    zIndex: 1,
  },
  emptyFlowerPlaceholder: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    overflow: 'visible',
  },
  lockedPlotContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  lockedPlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9E9E9E',
    marginTop: 12,
  },
  lockedPlotSubtext: {
    fontSize: 13,
    color: '#B0B0B0',
    marginTop: 4,
  },
  emptyPlotContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPlotText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9E9E9E',
    marginTop: 12,
  },
  emptyPlotSubtext: {
    fontSize: 13,
    color: '#B0B0B0',
    marginTop: 4,
  },
  plantButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFC107',
    borderRadius: 20,
  },
  plantButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
  },
  collectionButton: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  stageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
    marginTop: 8,
  },
  healthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 14,
  },
  healthBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  grassPatch: {
    width: 140,
    height: 100,
    marginTop: -40,
  },
  energySection: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  energyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  energyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  energyPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  energyBarContainer: {
    width: '100%',
  },
  energyBarBackground: {
    height: 20,
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  energyBarGradient: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  energyHint: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 8,
  },
  stageDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  stageDotWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stageDotCurrent: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  stageDotCheck: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stageLine: {
    width: 20,
    height: 2,
    backgroundColor: '#E8E8E8',
  },
  stageLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  stageHint: {
    fontSize: 13,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
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
