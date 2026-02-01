import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt';
import { FONTS } from '../styles/fonts';

const GardenScreen = () => {
  const energyLevel = 0.65;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Garden</Text>
      <View style={styles.contentContainer}>
        <View style={styles.imageContainer}>
          <View style={styles.gardenPlot}>
            <Image
              source={require('../../assets/images/sunflower.png')}
              style={styles.sunflower}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/grass_plot.png')}
              style={styles.grassPatch}
              resizeMode="contain"
            />
          </View>
        </View>
        <View style={styles.energyBarContainer}>
          <View style={styles.energyIcon}>
            <FontAwesomeIcon icon={faBolt} size={16} color="#FFF" />
          </View>
          <View style={styles.energyBarBackground}>
            <LinearGradient
              colors={['#FFAAA5', '#FFD3B6', '#A8E6CF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.energyBarFill, { width: `${energyLevel * 100}%` }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#505255',
    fontFamily: FONTS.regular,
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  energyBarBackground: {
    flex: 1,
    height: 24,
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  energyBarFill: {
    height: '100%',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  energyIcon: {
    marginRight: 12,
    width: 32,
    height: 32,
    backgroundColor: '#FFD3B6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gardenPlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sunflower: {
    width: 250,
    height: 250,
    zIndex: 1,
  },
  grassPatch: {
    width: 200,
    height: 100,
    marginTop: -40,
  },
});

export default GardenScreen;
