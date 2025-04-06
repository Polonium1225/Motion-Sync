import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { height, width } = Dimensions.get('window');

export default function PerformanceComparisonScreen({ route }) {
  const navigation = useNavigation();
  const { videoUri, pastVideoUri } = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefPast = useRef(null);
  const videoRefNew = useRef(null);

  const togglePlayback = async () => {
    if (isPlaying) {
      await videoRefPast.current.pauseAsync();
      await videoRefNew.current.pauseAsync();
    } else {
      await videoRefPast.current.playAsync();
      await videoRefNew.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = async () => {
    await videoRefPast.current.pauseAsync();
    await videoRefNew.current.pauseAsync();
    await videoRefPast.current.setPositionAsync(0);
    await videoRefNew.current.setPositionAsync(0);
    setIsPlaying(false);
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(31,34,41,0.9)', 'rgba(31,34,41,0.6)']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Performance Analysis</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Video Comparison Container */}
        <View style={styles.videoContainer}>
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRefPast}
              source={{ uri: pastVideoUri }}
              style={styles.video}
              resizeMode="cover"
              isLooping
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={styles.videoLabel}
            >
              <Text style={styles.videoLabelText}>PAST PERFORMANCE</Text>
            </LinearGradient>
          </View>

          <View style={styles.videoWrapper}>
            <Video
              ref={videoRefNew}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode="cover"
              isLooping
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={styles.videoLabel}
            >
              <Text style={styles.videoLabelText}>CURRENT PERFORMANCE</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Analysis Section */}
        <View style={styles.statsContainer}>
          <View style={styles.metricContainer}>
            <Text style={styles.metricTitle}>Pose Similarity</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: '80%' }]} />
              <Text style={styles.metricValue}>80%</Text>
            </View>
          </View>

          <View style={styles.metricContainer}>
            <Text style={styles.metricTitle}>Motion Smoothness</Text>
            <View style={styles.progressWrapper}>
              <View style={[styles.progressBar, { width: '65%' }]} />
              <Text style={styles.metricValue}>65%</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={24} color="#01CC97" />
              <Text style={styles.statText}>3 Improvements</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="close-circle" size={24} color="#FF4D4D" />
              <Text style={styles.statText}>2 Regressions</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.buttonText}>Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playButton} onPress={togglePlayback}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2229',
  },
  scrollContent: {
    paddingBottom: height * 0.14 // Space for controls
  },
  header: {
    height: height * 0.12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: height * 0.06,
    zIndex: 2
  },
  videoContainer: {
    height: height * 0.55,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
  },
  videoWrapper: {
    height: '48%',
    marginVertical: 4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  videoLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statsContainer: {
    padding: 20,
    backgroundColor: '#2D343C',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  controlsContainer: {
    height: height * 0.12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(45,52,60,0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 3,
  },
  playButton: {
    backgroundColor: '#01CC97',
    padding: 16,
    borderRadius: 40,
    elevation: 8,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A424A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  metricContainer: {
    marginBottom: 20,
  },
  metricTitle: {
    color: '#8D98A3',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#01CC97',
    borderRadius: 4,
    marginRight: 12,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A424A',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
});