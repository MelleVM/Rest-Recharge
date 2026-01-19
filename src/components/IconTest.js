import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const IconTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon Test</Text>
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name="home" size={30} color="#3498db" />
        <Text style={styles.iconLabel}>Home Icon</Text>
      </View>
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name="timer" size={30} color="#3498db" />
        <Text style={styles.iconLabel}>Timer Icon</Text>
      </View>
      <View style={styles.iconRow}>
        <MaterialCommunityIcons name="cog" size={30} color="#3498db" />
        <Text style={styles.iconLabel}>Settings Icon</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  iconLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
});

export default IconTest;
