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
import { getUserId } from '../lib/SupabaseService'; // Updated import
import { API_CONFIG } from './config';
import { useUserData, useUserProgress } from '../hooks/useUserData';
import { LinearGradient } from 'expo-linear-gradient';

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
        Alert.alert('Authentication Error', 'Please log in to use performance analysis');
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

  // Save performance analysis history to Supabase (if you want to track this)
  const saveAnalysisHistory = async (analysisData) => {
    try {
      if (!userId) return;
      
      // You could create a new table called 'performance_analyses' in Supabase
      // and save the analysis results there for history tracking
      // For now, we'll just log it
      console.log('Analysis completed:', analysisData);
      
      // Optional: You could also create a post about the analysis
      // const posts = require('../lib/SupabaseService').posts;
      // await posts.createPost(userId, `Completed performance analysis! Similarity: ${analysisData.similarity}%`);
      
    } catch (error) {
      console.error('Error saving analysis history:', error);
    }
  };

  const handleCompare = useCallback(async () => {
    if (!userId) {
      Alert.alert('Authentication Required', 'Please log in to use performance analysis');
      return;
    }

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
      console.log('New video URL:', newUrl);
  
      setLoadingMessage('Analyzing performance with AI...');
      
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
      
      console.log('Compare response:', compareResult);
  
      if (!compareResponse.ok) {
        const errorMessage = compareResult.detail || compareResult.message || 'Comparison failed';
        throw new Error(errorMessage);
      }

      // Verify that processed videos were created
      if (!compareResult.past_video_url || !compareResult.new_video_url) {
        throw new Error('Processed videos were not created successfully');
      }

      // Save analysis history to Supabase
      await saveAnalysisHistory({
        userId,
        similarity: compareResult.similarity,
        smoothness: compareResult.smoothness,
        speed: compareResult.speed,
        cohesion: compareResult.cohesion,
        accuracy: compareResult.accuracy,
        improvements: compareResult.improvements,
        regressions: compareResult.regressions,
        pastVideoUrl: compareResult.past_video_url,
        newVideoUrl: compareResult.new_video_url,
        createdAt: new Date().toISOString()
      });
  
      // Record this as a workout session in UserDataManager
      if (isInitialized) {
        try {
          const sessionData = {
            exerciseType: 'performance_comparison',
            motionScore: Math.round((compareResult.similarity || 0)),
            duration: 300, // Assume 5 minute analysis session
            perfectForms: compareResult.improvements ? compareResult.improvements : 0,
            date: new Date().toISOString()
          };

          const xpGained = await addWorkoutSession(sessionData);
          console.log(`Performance comparison completed! XP gained: ${xpGained}`);
        } catch (error) {
          console.error('Failed to record session:', error);
        }
      }

      // Navigate to comparison screen with the processed video URLs that include pose estimation
      navigation.navigate('PerformanceComparisonScreen', {
        videoUri: compareResult.new_video_url, // Use processed video URL
        pastVideoUri: compareResult.past_video_url, // Use processed video URL
        similarity: compareResult.similarity,
        smoothness: compareResult.smoothness,
        speed: compareResult.speed,
        cohesion: compareResult.cohesion,
        accuracy: compareResult.accuracy,
        improvements: compareResult.improvements,
        regressions: compareResult.regressions,
      });

    } catch (error) {
      console.error('Comparison error:', error);
      Alert.alert(
        'Analysis Error',
        `Failed to analyze videos: ${error.message}\n\nThis could be due to:\n• Video format compatibility\n• Server connectivity issues\n• Video processing limitations\n\nPlease try with different videos or check your connection.`,
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Cancel', style: 'cancel' }
        ],
        { cancelable: true }
      );
    } finally {
      setLoading(false);
    }
  }, [pastVideoUri, videoUri, buttonScale, isInitialized, addWorkoutSession, userId]);

  const pickVideo = async (setVideoFunction) => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60, // Limit to 60 seconds for processing efficiency
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Basic validation
        if (asset.duration && asset.duration > 120000) { // 2 minutes in milliseconds
          Alert.alert(
            'Video Too Long',
            'Please select a video shorter than 2 minutes for optimal processing.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
        
        console.log('Video selected:', asset.uri);
        setVideoFunction(asset.uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert(
        'Selection Error',
        'Failed to select video. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const uploadVideo = async (uri) => {
    console.log('Starting upload for:', uri);
    
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
      const uploadUrl = `${API_CONFIG.BASE_URL}/uploads`;
      console.log('Uploading to:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload API error response:', errorText);
        throw new Error(`Upload failed: HTTP ${response.status}`);
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
      
      console.log('Upload successful:', result.url);
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
      source={require('../assets/sfgsdh.png')}
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
              Upload two videos to analyze your improvement with AI pose estimation
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
              <LinearGradient
                colors={['rgba(255, 76, 72, 0.1)', 'rgba(11, 10, 31, 0.7)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="videocam" size={28} color="#ff4c48" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>Past Performance</Text>
                    <Text style={styles.cardSubtitle}>
                      {pastVideoUri ? 'Video selected ✓' : 'Tap to select reference video'}
                    </Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#ff4c48" />
                  </View>
                </View>
                {pastVideoUri && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#00FF94" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* VS Indicator */}
            <View style={styles.vsContainer}>
              <LinearGradient
                colors={['#ff4c48', '#0b0a1f']}
                style={styles.vsCircle}
              >
                <Text style={styles.vsText}>VS</Text>
              </LinearGradient>
              <Text style={styles.vsSubtext}>AI Pose Analysis</Text>
            </View>

            {/* New Video Card */}
            <TouchableOpacity 
              style={styles.videoCard}
              onPress={() => setModalVisible(true)}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={['rgba(255, 76, 72, 0.1)', 'rgba(11, 10, 31, 0.7)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="camera" size={28} color="#ff4c48" />
                  </View>
                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>New Performance</Text>
                    <Text style={styles.cardSubtitle}>
                      {videoUri ? 'Video selected ✓' : 'Tap to select current video'}
                    </Text>
                  </View>
                  <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#ff4c48" />
                  </View>
                </View>
                {videoUri && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#00FF94" />
                  </View>
                )}
              </LinearGradient>
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
                (!pastVideoUri || !videoUri || !userId) && styles.compareButtonDisabled
              ]}
              onPress={handleCompare}
              disabled={!pastVideoUri || !videoUri || !userId || loading}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <LinearGradient
                colors={(!pastVideoUri || !videoUri || !userId) ? ['#666', '#333'] : ['#ff4c48', '#0b0a1f']}
                style={styles.compareButtonGradient}
              >
                <View style={styles.compareButtonContent}>
                  <Ionicons name="analytics-outline" size={28} color="white" />
                  <Text style={styles.compareButtonText}>ANALYZE WITH AI</Text>
                  {isInitialized && (
                    <Text style={styles.xpHint}>+50-100 XP • Pose Estimation</Text>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Authentication Notice */}
          {!userId && (
            <View style={styles.authNotice}>
              <Ionicons name="lock-closed" size={20} color="#ff4c48" />
              <Text style={styles.authNoticeText}>Please log in to use performance analysis</Text>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={navigateToProgress}
            >
              <LinearGradient
                colors={['rgba(255, 76, 72, 0.1)', 'rgba(11, 10, 31, 0.7)']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="trending-up" size={24} color="#ff4c48" />
                <Text style={styles.quickActionText}>View Progress</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={navigateToAchievements}
            >
              <LinearGradient
                colors={['rgba(255, 76, 72, 0.1)', 'rgba(11, 10, 31, 0.7)']}
                style={styles.quickActionGradient}
              >
                <Ionicons name="trophy" size={24} color="#ff4c48" />
                <Text style={styles.quickActionText}>Achievements</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Modal for NEW Video Upload */}
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={['rgba(11, 10, 31, 0.95)', 'rgba(31, 41, 55, 0.95)']}
                style={styles.modalContent}
              >
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
                      <Text style={styles.modalPlaceholderSubtext}>Select a video to analyze with AI</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={() => pickVideo(setVideoUri)}
                  >
                    <LinearGradient
                      colors={['#ff4c48', '#0b0a1f']}
                      style={styles.modalButtonGradient}
                    >
                      <Ionicons name="cloud-upload-outline" size={20} color="white" />
                      <Text style={styles.modalButtonText}>Select Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalSecondaryButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Modal for PAST Video Upload */}
        <Modal animationType="fade" transparent={true} visible={pastModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <LinearGradient
                colors={['rgba(11, 10, 31, 0.95)', 'rgba(31, 41, 55, 0.95)']}
                style={styles.modalContent}
              >
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
                      <Text style={styles.modalPlaceholderSubtext}>Select a reference video for comparison</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={() => pickVideo(setPastVideoUri)}
                  >
                    <LinearGradient
                      colors={['#ff4c48', '#0b0a1f']}
                      style={styles.modalButtonGradient}
                    >
                      <Ionicons name="cloud-upload-outline" size={20} color="white" />
                      <Text style={styles.modalButtonText}>Select Video</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.modalSecondaryButton}
                    onPress={() => setPastVideoUri(false)}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Loading Modal */}
        <Modal animationType="fade" transparent={true} visible={loading}>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <LinearGradient
                colors={['rgba(11, 10, 31, 0.95)', 'rgba(31, 41, 55, 0.95)']}
                style={styles.loadingContent}
              >
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
                  <Ionicons name="analytics-outline" size={48} color="#ff4c48" />
                </Animated.View>
                <Text style={styles.loadingTitle}>AI Analysis in Progress</Text>
                <Text style={styles.loadingMessage}>{loadingMessage}</Text>
                {isInitialized && (
                  <Text style={styles.loadingXP}>Earning XP for your analysis...</Text>
                )}
                <View style={styles.loadingBar}>
                  <LinearGradient
                    colors={['#ff4c48', '#0b0a1f']}
                    style={styles.loadingBarFill}
                  />
                </View>
              </LinearGradient>
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
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  progressOverview: {
    backgroundColor: 'rgba(11, 10, 31, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  levelXP: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  userStreak: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff4c48',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  titleSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoContainer: {
    marginBottom: 30,
  },
  videoCard: {
    borderRadius: 20,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  cardGradient: {
    padding: 20,
    position: 'relative',
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
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
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
  checkmark: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 5,
  },
  vsContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  vsCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff4c48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vsText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  vsSubtext: {
    color: '#ff4c48',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  compareButton: {
    borderRadius: 20,
    marginBottom: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.5)',
  },
  compareButtonDisabled: {
    borderColor: '#666',
  },
  compareButtonGradient: {
    padding: 25,
    alignItems: 'center',
  },
  compareButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    letterSpacing: 1,
  },
  xpHint: {
    color: '#ff4c48',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  authNoticeText: {
    color: '#ff4c48',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionButton: {
    width: '48%',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  modalContent: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 76, 72, 0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
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
    backgroundColor: '#000',
  },
  modalPlaceholder: {
    height: 200,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
    borderStyle: 'dashed',
  },
  modalPlaceholderText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  modalPlaceholderSubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  modalButton: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  modalSecondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  loadingContainer: {
    borderRadius: 20,
    minWidth: 300,
    borderWidth: 2,
    borderColor: 'rgba(255, 76, 72, 0.3)',
    overflow: 'hidden',
  },
  loadingContent: {
    padding: 40,
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  loadingMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    width: '70%',
    borderRadius: 3,
  },
});