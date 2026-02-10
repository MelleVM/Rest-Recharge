import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { faSeedling } from '@fortawesome/free-solid-svg-icons/faSeedling';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faListUl } from '@fortawesome/free-solid-svg-icons/faListUl';
import StorageService from '../utils/StorageService';
import { FONTS } from '../styles/fonts';
import { FLOWER_TYPES, ENERGY_DECAY_RATE } from '../config/flowerConfig';
import FlowerTimeline from '../components/FlowerTimeline';
import FlowerSelection from '../components/FlowerSelection';

const GardenOverviewScreen = ({ navigation }) => {
  const [gardenData, setGardenData] = useState({
    energy: 0.5,
    totalRests: 0,
    lastEnergyUpdate: Date.now(),
    plots: [],
  });
  const [selectedPlotIndex, setSelectedPlotIndex] = useState(null);
  const [selectedFlowerPosition, setSelectedFlowerPosition] = useState({ x: 0, y: 0 });
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFlowerSelection, setShowFlowerSelection] = useState(false);
  
  // Reanimated shared values
  const zoomProgress = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const userScale = useSharedValue(1);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useFocusEffect(
    useCallback(() => {
      loadGardenData();
    }, [])
  );

  const loadGardenData = async () => {
    const stored = await StorageService.getItem('sunflowerGarden');
    const stats = await StorageService.getItem('stats');
    const totalRests = stats?.totalRests || 0;
    
    if (stored) {
      const now = Date.now();
      const timeSinceUpdate = now - (stored.lastEnergyUpdate || now);
      const energyLost = timeSinceUpdate * ENERGY_DECAY_RATE;
      const newEnergy = Math.max(0, stored.energy - energyLost);

      // Migration: Remove 6th plot if it exists (MAX_PLOTS changed from 6 to 5)
      let plots = stored.plots || [];
      if (plots.length > 5) {
        plots = plots.slice(0, 5);
      }

      const updatedData = {
        ...stored,
        plots,
        energy: newEnergy,
        totalRests,
        lastEnergyUpdate: now,
      };

      setGardenData(updatedData);
      await StorageService.setItem('sunflowerGarden', updatedData);
    } else {
      // No garden data yet, just set totalRests
      setGardenData(prev => ({ ...prev, totalRests }));
    }
  };

  const getHealthStatus = (energy) => {
    if (energy >= 0.7) return { status: 'Thriving', color: '#4CAF50' };
    if (energy >= 0.4) return { status: 'Healthy', color: '#FFC107' };
    if (energy >= 0.2) return { status: 'Needs Care', color: '#FF9800' };
    return { status: 'Wilting', color: '#F44336' };
  };

  const getCurrentStage = (plot) => {
    if (!plot || !plot.flowerType) return null;
    const flowerType = FLOWER_TYPES[plot.flowerType];
    if (!flowerType) return null;

    let currentStage = flowerType.growthStages[0];
    for (const stage of flowerType.growthStages) {
      if (plot.restsGiven >= stage.restsNeeded) {
        currentStage = stage;
      }
    }
    return currentStage;
  };

  const navigateToPlot = (plotIndex, position) => {
    setSelectedPlotIndex(plotIndex);
    setSelectedFlowerPosition(position);
    // Reset user gestures
    panX.value = 0;
    panY.value = 0;
    userScale.value = 1;
    savedPanX.value = 0;
    savedPanY.value = 0;
    savedScale.value = 1;
    // Animate zoom in
    zoomProgress.value = withSpring(1, { damping: 15, stiffness: 100 });
  };

  const zoomOut = () => {
    // Reset user gestures
    panX.value = withSpring(0, { damping: 15, stiffness: 100 });
    panY.value = withSpring(0, { damping: 15, stiffness: 100 });
    userScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    // Animate zoom out
    zoomProgress.value = withSpring(0, { damping: 15, stiffness: 100 }, () => {
      // This runs on UI thread, need to use runOnJS for state update
    });
    // Set state immediately (animation will complete visually)
    setTimeout(() => setSelectedPlotIndex(null), 300);
  };

  const getGrowthStages = (flowerType) => {
    return FLOWER_TYPES[flowerType]?.growthStages || [];
  };

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

  const handlePlantFlower = async (flowerType) => {
    if (selectedPlotIndex === null) return;
    
    const updatedPlots = [...gardenData.plots];
    updatedPlots[selectedPlotIndex] = {
      ...updatedPlots[selectedPlotIndex],
      flowerType: flowerType,
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

  const healthStatus = getHealthStatus(gardenData.energy);

  const plantedPlots = gardenData.plots.filter(p => p.isUnlocked && p.flowerType);
  const emptyPlots = gardenData.plots.filter(p => p.isUnlocked && !p.flowerType);
  const lockedPlots = gardenData.plots.filter(p => !p.isUnlocked);
  const isWilted = gardenData.energy < 0.4;

  const selectedPlot = selectedPlotIndex !== null ? gardenData.plots[selectedPlotIndex] : null;
  const selectedStage = selectedPlot ? getCurrentStage(selectedPlot) : null;
  const selectedNextStage = selectedPlot ? getNextStage(selectedPlot) : null;
  const selectedFlowerImage = selectedStage ? (isWilted ? selectedStage.wiltedImage : selectedStage.image) : null;

  // Constants for zoom calculation
  const baseScale = 3.5;
  const containerWidth = 340;
  const containerHeight = 220;
  const flowerSize = 70;
  
  // Flower center relative to container center
  const flowerCenterX = selectedFlowerPosition.x + flowerSize / 2 - containerWidth / 2;
  const flowerCenterY = selectedFlowerPosition.y + flowerSize / 2 - containerHeight / 2;
  
  // Target translation to center the flower
  const targetTranslateX = -flowerCenterX * baseScale;
  const targetTranslateY = -flowerCenterY * baseScale;

  // Pan gesture for moving around when zoomed
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      panX.value = savedPanX.value + e.translationX;
      panY.value = savedPanY.value + e.translationY;
    })
    .onEnd(() => {
      savedPanX.value = panX.value;
      savedPanY.value = panY.value;
    });

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      userScale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 2.5);
    })
    .onEnd(() => {
      savedScale.value = userScale.value;
    });

  // Combine gestures
  const combinedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style for garden area (zoom + pan + pinch)
  const gardenAnimatedStyle = useAnimatedStyle(() => {
    const currentScale = interpolate(zoomProgress.value, [0, 1], [1, baseScale]) * userScale.value;
    const baseTranslateX = interpolate(zoomProgress.value, [0, 1], [0, targetTranslateX]);
    const baseTranslateY = interpolate(zoomProgress.value, [0, 1], [0, targetTranslateY]);
    
    return {
      transform: [
        { translateX: baseTranslateX + panX.value },
        { translateY: baseTranslateY + panY.value },
        { scale: currentScale },
      ],
    };
  });

  // Animated style for fading out other elements
  const othersAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(zoomProgress.value, [0, 0.3, 1], [1, 0, 0]),
    };
  });

  // Animated style for detail overlay
  const detailAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(zoomProgress.value, [0, 0.7, 1], [0, 0, 1]),
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Overview Header */}
      <Animated.View style={othersAnimatedStyle} pointerEvents={selectedPlotIndex !== null ? 'none' : 'auto'}>
        <View style={styles.header}>
          <Text style={styles.headerTitleLeft}>My Garden</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowTimeline(true)}
          >
            <FontAwesomeIcon icon={faListUl} size={18} color="#636E72" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Garden Area - Zooms as a whole with gesture support */}
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.gardenArea, gardenAnimatedStyle]}>
        {/* Flowers on shared ground */}
        <View style={styles.flowersContainer}>
          {plantedPlots.map((plot, index) => {
            const currentStage = getCurrentStage(plot);
            const plotIndex = gardenData.plots.findIndex(p => p.id === plot.id);
            const flowerScale = currentStage?.scale || 1;
            
            const flowerPositions = [
              { left: 135, top: -80 },
              { left: 40, top: -25 },
              { left: 135, top: -15 },
              { left: 230, top: -25 },
              { left: 135, top: 35 },
            ];
            
            const position = flowerPositions[plotIndex] || { left: 135, top: -15 };
            const isSelected = selectedPlotIndex === plotIndex;
            const flowerOpacity = selectedPlotIndex !== null && !isSelected ? 0.3 : 1;
            
            // Calculate actual size based on scale (avoids blurry scaling)
            const baseSize = 70;
            const actualSize = baseSize * flowerScale;
            const verticalOffset = (baseSize - actualSize) * 0;
            
            return (
              <TouchableOpacity
                key={plot.id}
                style={[styles.flowerItem, { left: position.left, top: position.top + verticalOffset, opacity: flowerOpacity }]}
                onPress={() => navigateToPlot(plotIndex, { x: position.left, y: position.top })}
                disabled={selectedPlotIndex !== null}
              >
                <Image
                  source={isWilted ? currentStage?.wiltedImage : currentStage?.image}
                  style={{ width: actualSize, height: actualSize }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            );
          })}
          
          {/* Empty plot indicators - hide others when one is selected, show selected one */}
          {emptyPlots.map((plot) => {
            const plotIndex = gardenData.plots.findIndex(p => p.id === plot.id);
            const isSelected = selectedPlotIndex === plotIndex;
            
            // Hide if another plot is selected (not this one)
            if (selectedPlotIndex !== null && !isSelected) return null;
            
            const flowerPositions = [
              { left: 135, top: -80 },
              { left: 40, top: -25 },
              { left: 135, top: -15 },
              { left: 230, top: -25 },
              { left: 135, top: 35 },
            ];
            
            const position = flowerPositions[plotIndex] || { left: 135, top: -15 };
            
            return (
              <TouchableOpacity
                key={plot.id}
                style={[styles.emptySpotIndicator, { left: position.left + 15, top: position.top + 35 }]}
                onPress={() => navigateToPlot(plotIndex, { x: position.left, y: position.top })}
                disabled={selectedPlotIndex !== null}
              >
                <View style={styles.emptySpotCircle}>
                  <FontAwesomeIcon icon={faSeedling} size={16} color="#8BC34A" />
                </View>
              </TouchableOpacity>
            );
          })}
          
          {/* Locked plot indicators */}
          {lockedPlots.map((plot) => {
            const plotIndex = gardenData.plots.findIndex(p => p.id === plot.id);
            
            const flowerPositions = [
              { left: 135, top: -80 },
              { left: 40, top: -25 },
              { left: 135, top: -15 },
              { left: 230, top: -25 },
              { left: 135, top: 35 },
            ];
            
            const position = flowerPositions[plotIndex] || { left: 135, top: -15 };
            
            return (
              <View key={plot.id} style={[styles.lockedSpot, { left: position.left, top: position.top }]}>
                <FontAwesomeIcon icon={faLock} size={14} color="#D0D0D0" />
              </View>
            );
          })}
        </View>

        {/* Ground Patch */}
        <Image
          source={require('../../assets/images/checkered-plot-transparent.png')}
          style={styles.groundPatch}
          resizeMode="contain"
        />
        </Animated.View>
      </GestureDetector>

      {/* Energy Section - matching individual flower page exactly */}
      <Animated.View style={othersAnimatedStyle}>
        <View style={styles.energySection}>
          <View style={styles.energyHeader}>
            <View style={styles.energyLabelRow}>
              <FontAwesomeIcon icon={faBolt} size={14} color="#FFC107" />
              <Text style={styles.energyLabel}>Energy</Text>
            </View>
            <Text style={styles.energyPercent}>{Math.round(gardenData.energy * 100)}%</Text>
          </View>
          <View style={styles.energyBarBackground}>
            <View style={[styles.energyBarFill, { width: `${gardenData.energy * 100}%` }]}>
              <LinearGradient
                colors={['#FFAAA5', '#FFD3B6', '#A8E6CF']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.energyBarGradient}
              />
            </View>
          </View>
          <Text style={styles.energyHint}>
            Complete eye rests to restore energy
          </Text>
        </View>
      </Animated.View>

      {/* Detail View UI - Appears when zoomed */}
      {selectedPlotIndex !== null && (
        <Animated.View style={[styles.detailOverlay, detailAnimatedStyle]} pointerEvents={selectedPlotIndex !== null ? 'auto' : 'none'}>
          <View style={styles.detailHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={zoomOut}
            >
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#636E72" />
            </TouchableOpacity>
            
            <View style={styles.detailTitleContainer}>
              <Text style={styles.title}>
                {selectedPlot?.flowerType ? FLOWER_TYPES[selectedPlot.flowerType]?.name : 'Empty Plot'}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowTimeline(true)}
            >
              <FontAwesomeIcon icon={faListUl} size={18} color="#636E72" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailContent}>
            {selectedPlot?.flowerType && selectedStage ? (
              <>
                {/* Growth Progress Bar */}
                {(() => {
                  const stages = getGrowthStages(selectedPlot.flowerType);
                  const totalStages = stages.length;
                  const lastStage = stages[totalStages - 1];
                  const totalRestsNeeded = lastStage.restsNeeded;
                  const progress = Math.min(1, selectedPlot.restsGiven / totalRestsNeeded);
                  
                  return (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]}>
                          <LinearGradient
                            colors={['#A8E6CF', '#88D8B0', '#6BCB77']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={styles.progressBarGradient}
                          />
                        </View>
                        {/* Stage markers */}
                        {stages.map((stage, index) => {
                          if (index === 0) return null;
                          const markerPosition = (stage.restsNeeded / totalRestsNeeded) * 100;
                          const isReached = selectedPlot.restsGiven >= stage.restsNeeded;
                          return (
                            <View 
                              key={stage.name}
                              style={[
                                styles.stageMarker,
                                { left: `${markerPosition}%` },
                                isReached && styles.stageMarkerReached,
                              ]}
                            />
                          );
                        })}
                      </View>
                      <View style={styles.progressLabels}>
                        <Text style={styles.progressLabel}>{selectedStage.name}</Text>
                        <Text style={styles.progressLabel}>{Math.min(selectedPlot.restsGiven, totalRestsNeeded)}/{totalRestsNeeded}</Text>
                      </View>
                    </View>
                  );
                })()}
              </>
            ) : selectedPlot && !selectedPlot.flowerType ? (
              <View style={styles.emptyPlotCard}>
                <View style={styles.emptyPlotIconCircle}>
                  <FontAwesomeIcon icon={faSeedling} size={32} color="#8BC34A" />
                </View>
                <Text style={styles.emptyPlotTitle}>Ready to Plant</Text>
                <Text style={styles.emptyPlotDescription}>
                  Choose a flower to grow in this plot
                </Text>
                <TouchableOpacity 
                  style={styles.plantButton}
                  onPress={() => setShowFlowerSelection(true)}
                >
                  <FontAwesomeIcon icon={faSeedling} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.plantButtonText}>Plant Flower</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </Animated.View>
      )}

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
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
  },
  overviewContainer: {
    flex: 1,
  },
  detailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
    pointerEvents: 'box-none',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitleLeft: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#505255',
    fontFamily: FONTS.regular,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  detailTitleContainer: {
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#505255',
    fontFamily: FONTS.regular,
  },
  gardenArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowersContainer: {
    position: 'absolute',
    width: 340,
    height: 220,
    zIndex: 100,
  },
  flowerItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
    width: 70,
    height: 70,
  },
  flowerImage: {
    width: 70,
    height: 70,
  },
  emptySpot: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    borderStyle: 'dashed',
  },
  emptySpotIndicator: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  emptySpotCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  lockedSpot: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  groundPatch: {
    width: 340,
    height: 220,
    marginTop: -120,
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
    width: '100%',
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
  progressContainer: {
    width: '100%',
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarGradient: {
    height: '100%',
    width: '100%',
  },
  stageMarker: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 16,
    backgroundColor: '#B0B0B0',
    borderRadius: 1.5,
    marginLeft: -1.5,
  },
  stageMarkerReached: {
    backgroundColor: '#4CAF50',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyPlotContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    flex: 1,
    justifyContent: 'center',
  },
  emptyPlotCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyPlotIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyPlotTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  emptyPlotDescription: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  plantButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GardenOverviewScreen;
