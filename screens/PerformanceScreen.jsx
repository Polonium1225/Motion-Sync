import React, { useState, useEffect, useCallback } from 'react';
import Colors from '../constants/Colors';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { saveHistory, getUserId } from '../lib/AppwriteService';
import { API_CONFIG } from './config';
import { useUserData, useUserProgress } from '../hooks/useUserData';

const { width, height } = Dimensions.get('window');

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [pastModalVisible, setPastModalVisible] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [pastVideoUri, setPastVideoUri] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Get data from UserDataManager
  const { userData, isInitialized, addWorkoutSession } = useUserData();
  const { progress, levelProgress } = useUserProgress();
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(40)).current;
  const buttonScale = React.useRef(new Animated.Value(1)).current;
  const pulseAnimation = React.useRef(new Animated.Value(1)).current;
  const rotateAnimation = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await getUserId();
        setUserId(id);
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };
    fetchUserId();

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 7,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for compare button
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Rotation animation for loading
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, []);

  // Calculate user performance stats
  const getPerformanceStats = () => {
    if (!isInitialized || !progress) {
      return {
        totalComparisons: 0,
        averageImprovement: 0,
        bestScore: 0,
        recentSessions: 0
      };
    }

    // Calculate stats from user data
    const totalComparisons = Math.floor((progress.totalSessions || 0) * 0.3); // Assume 30% of sessions include comparisons
    const averageImprovement = Math.min(Math.round((progress.averageMotionScore || 0) - 60), 40); // Improvement from baseline
    const bestScore = Math.round(progress.averageMotionScore || 0);
    const recentSessions = Math.min(progress.totalSessions || 0, 10);

    return {
      totalComparisons,
      averageImprovement: Math.max(averageImprovement, 0),
      bestScore,
      recentSessions
    };
  };

  const stats = getPerformanceStats();

  const handleCompare = useCallback(async () => {
    if (!pastVideoUri) {
      Alert.alert(
        'Missing Video',
        'Please select a past performance video.',
        [{ text: 'OK', style: 'cancel' }],
        { 
          cancelable: true,
        }
      );
      return;
    }

    if (!videoUri) {
      Alert.alert(
        'Missing Video',
        'Please select a new performance video.',
        [{ text: 'OK', style: 'cancel' }],
        { 
          cancelable: true,
        }
      );
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    setLoading(true);
    setLoadingMessage('Uploading Past Video...');

    try {
      const pastUrl = await uploadVideo(pastVideoUri);
      console.log('Past video URL:', pastUrl);
      
      setLoadingMessage('Uploading New Video...');
      const newUrl = await uploadVideo(videoUri);
  
      setLoadingMessage('Analyzing performance...');
      
      const compareUrl = `${API_CONFIG.BASE_URL}/compare`;
      console.log('Making compare request to:', compareUrl);
      
      const formDataCompare = new FormData();
      formDataCompare.append("past_video_url", pastUrl);
      formDataCompare.append("new_video_url", newUrl);

      const compareResponse = await fetch(compareUrl, {
        method: 'POST',
        body: formDataCompare,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      const compareResult = await compareResponse.json();
  
      if (!compareResponse.ok) throw new Error(compareResult.detail || 'Comparison failed');
  
      // Record this as a workout session in UserDataManager
      if (isInitialized) {
        try {
          const sessionData = {
            exerciseType: 'performance_comparison',
            motionScore: Math.round((compareResult.similarity || 0) * 100),
            duration: 300, // Assume 5 minute analysis session
            perfectForms: compareResult.improvements ? compareResult.improvements.length : 0,
            date: new Date().toISOString()
          };

          const xpGained = await addWorkoutSession(sessionData);
          console.log(`Performance comparison completed! XP gained: ${xpGained}`);
        } catch (error) {
          console.error('Failed to record session:', error);
        }
      }

      navigation.navigate('PerformanceComparisonScreen', {
        videoUri: newUrl,
        pastVideoUri: pastUrl,
        similarity: compareResult.similarity,
        smoothness: compareResult.smoothness,
        improvements: compareResult.improvements,
        regressions: compareResult.regressions,
      });

    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to upload or compare videos. Please try again.',
        [{ text: 'OK', style: 'cancel' }],
        { cancelable: true }
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [pastVideoUri, videoUri, buttonScale, isInitialized, addWorkoutSession]);

  const pickVideo = async (setVideoFunction) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setVideoFunction(result.assets[0].uri);
    }
  };

  const uploadVideo = async (uri) => {
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `video/${match[1]}` : 'video/mp4';

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type,
    });

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/uploads`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload API error response:', errorText);
        throw new Error(errorText || 'Upload failed');
      }
      
      const responseText = await response.text();
      console.log('Upload API response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        
        if (responseText.trim().startsWith('http')) {
          return responseText.trim();
        }
        
        if (responseText.includes('{') && responseText.includes('}')) {
          try {
            const jsonStart = responseText.indexOf('{');
            const jsonEnd = responseText.lastIndexOf('}') + 1;
            const jsonPart = responseText.substring(jsonStart, jsonEnd);
            const extractedResult = JSON.parse(jsonPart);
            
            if (extractedResult.url) {
              return extractedResult.url;
            }
          } catch (extractError) {
            console.error('Failed to extract JSON:', extractError);
          }
        }
        
        throw new Error('Invalid response format from server');
      }
      
      if (!result.url) {
        console.error('Missing URL in response:', result);
        throw new Error('Server response missing URL');
      }
      
      return result.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Quick access to other features
  const navigateToAchievements = () => {
    navigation.navigate('BadgesAndMilestonesScreen');
  };

  const navigateToProgress = () => {
    navigation.navigate('ProgressScreen');
  };

  return (
    <ImageBackground
      source={require('../assets/backalso2.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <Animated.View 
        style={[
          styles.content,
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Performance Analysis</Text>
            <TouchableOpacity 
              style={styles.statsButton} 
              onPress={navigateToAchievements}
            >
              <Ionicons name="trophy" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* User Progress Overview */}
          {isInitialized && progress && (
            <View style={styles.progressOverview}>
              <Text style={styles.overviewTitle}>Your Performance Journey</Text>
              <View style={styles.userStats}>
                <View style={styles.userLevel}>
                  <Text style={styles.levelNumber}>Level {progress.level}</Text>
                  <Text style={styles.levelXP}>{(progress.xp || 0).toLocaleString()} XP</Text>
                </View>
                <View style={styles.userStreak}>
                  <Text style={styles.streakNumber}>{progress.streak || 0}</Text>
                  <Text style={styles.streakLabel}>Day Streak 🔥</Text>
                </View>
              </View>
              {levelProgress && (
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${levelProgress.progressPercentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {levelProgress.progressXP} / {levelProgress.requiredXP} XP to next level
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.sectionTitle}>Compare Performance</Text>
            <Text style={styles.sectionSubtitle}>
              Upload two videos to analyze your improvement and earn XP
            </Text>
          </View>

          {/* Video Selection Section */}
          <View style={styles.videoContainer}>
            {/* Past Video Card */}
            <TouchableOpacity 
              style={styles.videoCard}
              onPress={() => setPastModalVisible(true)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>📹</Text>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Past Performance</Text>
                  <Text style={styles.cardSubtitle}>
                    {pastVideoUri ? 'Video selected ✓' : 'Tap to select video'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              {pastVideoUri && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={20} color="#00FF94" />
                </View>
              )}
            </TouchableOpacity>

            {/* VS Indicator */}
            <View style={styles.vsContainer}>
              <View style={styles.vsCircle}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <Text style={styles.vsSubtext}>Compare & Earn XP</Text>
            </View>

            {/* New Video Card */}
            <TouchableOpacity 
              style={styles.videoCard}
              onPress={() => setModalVisible(true)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>🎬</Text>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>New Performance</Text>
                  <Text style={styles.cardSubtitle}>
                    {videoUri ? 'Video selected ✓' : 'Tap to select video'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              {videoUri && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={20} color="#00FF94" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Compare Button */}
          <Animated.View 
            style={[
              { transform: [{ scale: pulseAnimation }] }
            ]}
          >
            <TouchableOpacity 
              style={[
                styles.compareButton,
                (!pastVideoUri || !videoUri) && styles.compareButtonDisabled
              ]}
              onPress={handleCompare}
              disabled={!pastVideoUri || !videoUri}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <View style={styles.compareButtonContent}>
                <Ionicons name="analytics-outline" size={24} color="white" />
                <Text style={styles.compareButtonText}>ANALYZE & EARN XP</Text>
                {isInitialized && (
                  <Text style={styles.xpHint}>+50-100 XP</Text>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={navigateToProgress}
            >
              <Ionicons name="trending-up" size={20} color="#ff4c48" />
              <Text style={styles.quickActionText}>View Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={navigateToAchievements}
            >
              <Ionicons name="trophy" size={20} color="#ff4c48" />
              <Text style={styles.quickActionText}>Achievements</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal for NEW Video Upload */}
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload New Performance</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                {videoUri ? (
                  <Video
                    source={{ uri: videoUri }}
                    style={styles.modalVideoPreview}
                    useNativeControls
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.modalPlaceholder}>
                    <Ionicons name="videocam-outline" size={80} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.modalPlaceholderText}>No video selected</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => pickVideo(setVideoUri)}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="white" />
                  <Text style={styles.modalButtonText}>Select Video</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalSecondaryButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalSecondaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal for PAST Video Upload */}
        <Modal animationType="fade" transparent={true} visible={pastModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Past Performance</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setPastModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                {pastVideoUri ? (
                  <Video
                    source={{ uri: pastVideoUri }}
                    style={styles.modalVideoPreview}
                    useNativeControls
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.modalPlaceholder}>
                    <Ionicons name="videocam-outline" size={80} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.modalPlaceholderText}>No video selected</Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => pickVideo(setPastVideoUri)}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="white" />
                  <Text style={styles.modalButtonText}>Select Video</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalSecondaryButton}
                  onPress={() => setPastModalVisible(false)}
                >
                  <Text style={styles.modalSecondaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Loading Modal */}
        <Modal animationType="fade" transparent={true} visible={loading}>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <Animated.View
                style={[
                  styles.loadingIcon,
                  {
                    transform: [{
                      rotate: rotateAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }
                ]}
              >
                <Ionicons name="analytics-outline" size={48} color={Colors.primary} />
              </Animated.View>
              <Text style={styles.loadingTitle}>Processing Analysis</Text>
              <Text style={styles.loadingMessage}>{loadingMessage}</Text>
              {isInitialized && (
                <Text style={styles.loadingXP}>Earning XP for your analysis...</Text>
              )}
              <View style={styles.loadingBar}>
                <View style={styles.loadingBarFill} />
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginLeft: 15,
  },
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressOverview: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  userLevel: {
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  levelXP: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userStreak: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  titleSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  videoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  videoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Colors.primary,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    opacity: 0.8,
  },
  cardArrow: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  arrowText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkmark: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    padding: 5,
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  vsCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  vsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vsSubtext: {
    color: '#ff4c48',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  compareButton: {
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
  },
  compareButtonDisabled: {
    opacity: 0.5,
    borderColor: '#666',
  },
  compareButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  xpHint: {
    color: '#ff4c48',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '45%',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  quickActionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalVideoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
  },
  modalPlaceholder: {
    height: 200,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  modalPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalSecondaryButton: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalSecondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  loadingContainer: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    minWidth: 280,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  loadingMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  loadingXP: {
    fontSize: 14,
    color: '#ff4c48',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    width: '70%',
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});