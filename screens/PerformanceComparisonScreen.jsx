import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ProgressBar } from 'react-native-paper'; 
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function PerformanceComparisonScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>Performance</Text>

      {/* Comparison Images */}
      <View style={styles.imageContainer}>
        <Image source={require('../assets/video.png')} style={styles.image} />
        <Image source={require('../assets/video.png')} style={styles.image} />
      </View>

      {/* Play Button */}
      <TouchableOpacity style={styles.playButton}>
        <Ionicons name="play" size={24} color="white" />
      </TouchableOpacity>

      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Pose Similarity (%)</Text>
        <ProgressBar progress={0.8} color="#01CC97" style={styles.progressBar} />

        <Text style={styles.progressLabel}>Smoothness & Stability</Text>
        <ProgressBar progress={0.6} color="#01CC97" style={styles.progressBar} />

        <Text style={styles.progressLabel}>Range of Motion</Text>
        <ProgressBar progress={0.4} color="#01CC97" style={styles.progressBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2229',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 50,
  },
  title: {
    fontSize: 18,
    color:"#fff",
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    width: 250,
    height: 120,
    backgroundColor: '#000',
    marginVertical: 5,
    borderRadius: 10,
  },
  playButton: {
    alignSelf: 'center',
    marginVertical: 10,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressLabel: {
    color:"#fff",
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1d382e',
    marginBottom: 10, 
  },
});