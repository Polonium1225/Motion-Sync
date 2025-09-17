import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

const backgroundImage = require('../assets/sfgsdh.png'); // Use your existing background

export default function FormCorrectionModeScreen({ navigation }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLiveMode = () => {
    // Navigate to live camera mode (existing camera screen)
    navigation.navigate('CameraScreen');
  };

  const handleVideoMode = () => {
    // Navigate to movement selection screen
    navigation.navigate('MovementSelectionScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={backgroundImage} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Form Correction</Text>
            <View style={styles.placeholder} />
          </View>

          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Choose Your Analysis Mode</Text>
              <Text style={styles.subtitle}>
                Select how you'd like to analyze your movement form
              </Text>
            </View>

            {/* Mode Selection Cards */}
            <View style={styles.modesContainer}>
              {/* Live Mode Card */}
              <TouchableOpacity 
                style={styles.modeCard} 
                onPress={handleLiveMode}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 76, 72, 0.2)', 'rgba(255, 76, 72, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="videocam" size={32} color="#ff4c48" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>Live Analysis</Text>
                      <Text style={styles.cardDescription}>
                        Real-time form correction with instant feedback
                      </Text>
                      <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                          <Ionicons name="flash" size={12} color="#ff4c48" />
                          <Text style={styles.featureText}>Instant feedback</Text>
                        </View>
                        <View style={styles.featureItem}>
                          <Ionicons name="eye" size={12} color="#ff4c48" />
                          <Text style={styles.featureText}>Real-time tracking</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardArrow}>
                      <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Video Mode Card */}
              <TouchableOpacity 
                style={styles.modeCard} 
                onPress={handleVideoMode}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255, 76, 72, 0.2)', 'rgba(255, 76, 72, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="cloud-upload" size={32} color="#ff4c48" />
                    </View>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>Video Analysis</Text>
                      <Text style={styles.cardDescription}>
                        Upload a video for detailed movement analysis
                      </Text>
                      <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                          <Ionicons name="analytics" size={12} color="#ff4c48" />
                          <Text style={styles.featureText}>Detailed reports</Text>
                        </View>
                        <View style={styles.featureItem}>
                          <Ionicons name="time" size={12} color="#ff4c48" />
                          <Text style={styles.featureText}>Frame-by-frame</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardArrow}>
                      <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color="#ff4c48" />
                <Text style={styles.infoText}>
                  Both modes use advanced AI to analyze your movement patterns and provide personalized feedback
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  modesContainer: {
    gap: 20,
    marginBottom: 30,
  },
  modeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.5)',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 10,
    lineHeight: 18,
  },
  featureList: {
    gap: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  cardArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  infoSection: {
    marginTop: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
  },
});