import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { getFlowersInUnlockOrder } from '../config/flowerConfig';
import { FONTS } from '../styles/fonts';
import { useAppTheme } from '../context/ThemeContext';

const FlowerTimeline = ({ totalRests, onClose }) => {
  const appTheme = useAppTheme();
  const colors = appTheme?.colors ?? {
    background: '#FFF9F0',
    surface: '#FFFFFF',
    text: '#2D3436',
    textSecondary: '#636E72',
    textMuted: '#B2BEC3',
    inputBackground: '#F0F0F0',
  };
  const flowers = getFlowersInUnlockOrder();

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Common': return '#9E9E9E';
      case 'Uncommon': return '#4CAF50';
      case 'Rare': return '#2196F3';
      case 'Epic': return '#9C27B0';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Flower Collection</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Unlock flowers by completing rests</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineContainer}
      >
        {flowers.map((flower, index) => {
          const isUnlocked = totalRests >= flower.unlockAtRests;
          const restsToGo = flower.unlockAtRests - totalRests;

          return (
            <View key={flower.id} style={styles.timelineItem}>
              {/* Flower Icon/Circle */}
              <View style={[
                styles.flowerCircle,
                { backgroundColor: colors.inputBackground },
                isUnlocked && [styles.flowerCircleUnlocked, { backgroundColor: colors.surface }],
                { borderColor: flower.color }
              ]}>
                {isUnlocked ? (
                  <Image
                    source={flower.growthStages[flower.growthStages.length - 1].image}
                    style={styles.flowerImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.flowerIconLocked, { backgroundColor: colors.inputBackground }]}>
                    <FontAwesomeIcon icon={faLock} size={20} color={colors.textMuted} />
                  </View>
                )}
              </View>

              {/* Connection Line - positioned to the right of circle */}
              {index < flowers.length - 1 && (
                <View style={[
                  styles.connectionLine,
                  isUnlocked && styles.connectionLineUnlocked
                ]} />
              )}

              {/* Flower Info */}
              <View style={styles.flowerInfo}>
                <Text style={[
                  styles.flowerName,
                  { color: colors.text },
                  !isUnlocked && styles.flowerNameLocked
                ]}>
                  {flower.name}
                </Text>
                <Text style={[
                  styles.rarityBadge,
                  { color: getRarityColor(flower.rarity) }
                ]}>
                  {flower.rarity}
                </Text>
                <Text style={styles.unlockRequirement}>
                  {isUnlocked ? (
                    <Text style={styles.unlockedText}>✓ Unlocked</Text>
                  ) : (
                    <Text style={[styles.lockedText, { color: colors.textMuted }]}>{restsToGo} rests to go</Text>
                  )}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: FONTS.regular,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  timelineContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  timelineItem: {
    alignItems: 'center',
    width: 120,
    position: 'relative',
  },
  flowerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  flowerCircleUnlocked: {
  },
  flowerImage: {
    width: 56,
    height: 56,
  },
  flowerIconLocked: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowerInfo: {
    alignItems: 'center',
  },
  flowerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  flowerNameLocked: {
    color: '#9E9E9E',
  },
  rarityBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  unlockRequirement: {
    fontSize: 11,
  },
  unlockedText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  lockedText: {
  },
  connectionLine: {
    position: 'absolute',
    top: 30,
    left: 92,
    width: 56,
    height: 3,
    backgroundColor: '#E0E0E0',
  },
  connectionLineUnlocked: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 24,
    paddingVertical: 14,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default FlowerTimeline;
