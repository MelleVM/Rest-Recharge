import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FONTS } from '../styles/fonts';

const FontTestScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Font Test Screen</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Default (no fontFamily):</Text>
        <Text style={styles.sampleText}>The quick brown fox jumps over the lazy dog</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Archivo Regular:</Text>
        <Text style={[styles.sampleText, { fontFamily: FONTS.regular }]}>
          The quick brown fox jumps over the lazy dog
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Archivo Medium:</Text>
        <Text style={[styles.sampleText, { fontFamily: FONTS.medium }]}>
          The quick brown fox jumps over the lazy dog
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Archivo SemiBold:</Text>
        <Text style={[styles.sampleText, { fontFamily: FONTS.semiBold }]}>
          The quick brown fox jumps over the lazy dog
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Archivo Bold:</Text>
        <Text style={[styles.sampleText, { fontFamily: FONTS.bold }]}>
          The quick brown fox jumps over the lazy dog
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Font values:</Text>
        <Text style={styles.debugText}>Regular: {FONTS.regular}</Text>
        <Text style={styles.debugText}>Medium: {FONTS.medium}</Text>
        <Text style={styles.debugText}>SemiBold: {FONTS.semiBold}</Text>
        <Text style={styles.debugText}>Bold: {FONTS.bold}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F0',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  sampleText: {
    fontSize: 18,
    color: '#2D3436',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
});

export default FontTestScreen;
