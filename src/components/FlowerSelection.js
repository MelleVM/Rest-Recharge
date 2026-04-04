import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { getFlowersInUnlockOrder } from '../config/flowerConfig';
import { FONTS } from '../styles/fonts';
import { useAppTheme } from '../context/ThemeContext';

const FlowerSelection = ({ totalRests, onSelectFlower, onClose }) => {
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
        <Text style={[styles.title, { color: colors.text }]}>Choose a Flower</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select which flower to plant</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.flowerGrid}>
          {flowers.map((flower) => {
            const isUnlocked = totalRests >= flower.unlockAtRests;
            const restsToGo = flower.unlockAtRests - totalRests;

            return (
              <TouchableOpacity
                key={flower.id}
                style={[
                  styles.flowerCard,
                  { backgroundColor: colors.inputBackground },
                  !isUnlocked && styles.flowerCardLocked
                ]}
                onPress={() => isUnlocked && onSelectFlower(flower.id)}
                disabled={!isUnlocked}
              >
                {/* Flower Icon */}
                <View style={[
                  styles.flowerIcon,
                  { borderColor: flower.color, borderWidth: 3, backgroundColor: colors.surface }
                ]}>
                  {isUnlocked ? (
                    <Image
                      source={flower.growthStages[flower.growthStages.length - 1].image}
                      style={styles.flowerImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={[styles.lockOverlay, { backgroundColor: colors.inputBackground }]}>
                      <FontAwesomeIcon icon={faLock} size={24} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                {/* Flower Info */}
                <Text style={[
                  styles.flowerName,
                  { color: colors.text },
                  !isUnlocked && styles.flowerNameLocked
                ]}>
                  {flower.name}
                </Text>
                
                <Text style={[
                  styles.rarityText,
                  { color: getRarityColor(flower.rarity) }
                ]}>
                  {flower.rarity}
                </Text>

                {!isUnlocked && (
                  <Text style={[styles.lockText, { color: colors.textMuted }]}>
                    {restsToGo} rests needed
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.inputBackground }]} onPress={onClose}>
        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingTop: 20,
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
  scrollView: {
    maxHeight: 320,
  },
  flowerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  flowerCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flowerCardLocked: {
    opacity: 0.6,
  },
  flowerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  flowerImage: {
    width: 56,
    height: 56,
  },
  lockOverlay: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowerName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  flowerNameLocked: {
    color: '#9E9E9E',
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  lockText: {
    fontSize: 11,
    textAlign: 'center',
  },
  cancelButton: {
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FlowerSelection;
