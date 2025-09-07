import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Animated,
  Modal,
  Platform,
  Image
} from 'react-native';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import Colors from '../constants/Colors';
import { API_CONFIG, logApiCall, handleApiError } from './config';
import backgroundImage from '../assets/sfgsdh.png';

const { width, height } = Dimensions.get('window');

// Chart configuration
const chartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: 'rgba(0, 0, 0, 0.1)',
  backgroundGradientTo: 'rgba(0, 0, 0, 0.1)',
  color: (opacity = 1) => `rgba(255, 76, 72, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 1,
  style: {
    borderRadius: 16,
  },
  propsForLabels: {
    fontSize: 12,
    fontWeight: '600',
  },
  propsForVerticalLabels: {
    fontSize: 10,
  },
  propsForHorizontalLabels: {
    fontSize: 10,
  },
};

export default function MovementAnalysisScreen() {
  const navigation = useNavigation();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  
  // State management
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState(null);
  const [visualizationUrls, setVisualizationUrls] = useState({});
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('idle'); // idle, uploading, analyzing, complete, error
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedVisualization, setSelectedVisualization] = useState(null);
  const [showVisualizationModal, setShowVisualizationModal] = useState(false);

  useEffect(() => {
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
  }, []);

  // Video picker function
  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets[0]) {
        const video = result.assets[0];
        
        // Validate video file
        if (video.duration > 300000) { // 5 minutes in milliseconds
          Alert.alert('Video Too Long', 'Please select a video shorter than 5 minutes.');
          return;
        }

        setSelectedVideo(video);
        setAnalysisResults(null);
        setProcessedVideoUrl(null);
        setVisualizationUrls({});
        setAnalysisStep('idle');
        console.log('Selected video:', video);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  // Alternative document picker for other video formats
  const pickVideoDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const video = result.assets[0];
        setSelectedVideo(video);
        setAnalysisResults(null);
        setProcessedVideoUrl(null);
        setVisualizationUrls({});
        setAnalysisStep('idle');
        console.log('Selected document video:', video);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick video file. Please try again.');
    }
  };

  // Upload video to backend
  const uploadVideo = async () => {
    if (!selectedVideo) {
      Alert.alert('No Video Selected', 'Please select a video first.');
      return;
    }

    setIsUploading(true);
    setAnalysisStep('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const formData = new FormData();
      
      const fileUri = selectedVideo.uri;
      const fileName = selectedVideo.name || `video_${Date.now()}.mp4`;
      const fileType = selectedVideo.mimeType || 'video/mp4';

      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      console.log('Uploading to:', `${API_CONFIG.BASE_URL}/movement-analysis/upload`);

      const uploadResponse = await fetch(`${API_CONFIG.BASE_URL}/movement-analysis/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      console.log('Upload successful:', uploadData);
      setUploadProgress(100);
      
      // Proceed to analysis
      await analyzeVideo(uploadData.url);
      
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(`Upload failed: ${error.message}`);
      setAnalysisStep('error');
      Alert.alert('Upload Failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Analyze uploaded video
  const analyzeVideo = async (videoUrl) => {
    setIsAnalyzing(true);
    setAnalysisStep('analyzing');

    try {
      const analysisFormData = new FormData();
      analysisFormData.append('video_url', videoUrl);

      console.log('Analyzing video:', videoUrl);

      const analysisResponse = await fetch(`${API_CONFIG.BASE_URL}/movement-analysis/analyze`, {
        method: 'POST',
        body: analysisFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const analysisData = await analysisResponse.json();
      
      if (!analysisResponse.ok) {
        throw new Error(analysisData.detail || 'Analysis failed');
      }

      console.log('Analysis successful:', analysisData);
      
      setAnalysisResults(analysisData);
      setProcessedVideoUrl(analysisData.processed_video_url);
      setVisualizationUrls(analysisData.visualization_urls || {});
      setAnalysisStep('complete');
      setShowResultsModal(true);
      
      // Show success message
      Alert.alert(
        'Analysis Complete! 🎉', 
        `Overall Score: ${(analysisData.overall_score * 100).toFixed(1)}%\nProcessed ${analysisData.frames_processed} frames\n\nView detailed results with pose landmarks!`,
        [{ text: 'View Results', onPress: () => setShowResultsModal(true) }]
      );

    } catch (error) {
      console.error('Analysis error:', error);
      setErrorMessage(`Analysis failed: ${error.message}`);
      setAnalysisStep('error');
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get analysis step info
  const getStepInfo = () => {
    switch (analysisStep) {
      case 'uploading':
        return { text: 'Uploading video...', icon: 'cloud-upload', color: '#2196F3' };
      case 'analyzing':
        return { text: 'Analyzing movement & creating pose video...', icon: 'analytics', color: '#ff4c48' };
      case 'complete':
        return { text: 'Analysis complete!', icon: 'checkmark-circle', color: '#4CAF50' };
      case 'error':
        return { text: 'Error occurred', icon: 'alert-circle', color: '#F44336' };
      default:
        return { text: 'Ready to analyze', icon: 'play-circle', color: '#ff4c48' };
    }
  };

  // Render detailed metrics cards
  const renderDetailedMetrics = () => {
    if (!analysisResults || !analysisResults.detailed_metrics) return null;

    const metrics = analysisResults.detailed_metrics;

    return (
      <View style={styles.detailedMetricsSection}>
        <Text style={styles.sectionTitle}>📊 Detailed Metrics</Text>
        
        {/* Core Scores Grid */}
        <View style={styles.metricsCardsContainer}>
          <View style={styles.metricCard}>
            <Ionicons name="trophy" size={24} color="#4CAF50" />
            <Text style={styles.metricValue}>{(metrics.overall_score * 100).toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Overall Score</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Ionicons name="fitness" size={24} color="#ff4c48" />
            <Text style={styles.metricValue}>{(metrics.balance_score * 100).toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Balance</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Ionicons name="trending-up" size={24} color="#4ECDC4" />
            <Text style={styles.metricValue}>{(metrics.smoothness_score * 100).toFixed(1)}%</Text>
            <Text style={styles.metricLabel}>Smoothness</Text>
          </View>
        </View>

        {/* Symmetry Metrics */}
        <View style={styles.symmetrySection}>
          <Text style={styles.subSectionTitle}>⚖️ Symmetry Analysis</Text>
          <View style={styles.symmetryContainer}>
            <View style={styles.symmetryItem}>
              <Text style={styles.symmetryLabel}>Arm Symmetry</Text>
              <Text style={styles.symmetryValue}>
                {(metrics.symmetry_scores.arm_symmetry * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.symmetryItem}>
              <Text style={styles.symmetryLabel}>Leg Symmetry</Text>
              <Text style={styles.symmetryValue}>
                {(metrics.symmetry_scores.leg_symmetry * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Range of Motion */}
        <View style={styles.romSection}>
          <Text style={styles.subSectionTitle}>🔄 Range of Motion</Text>
          <View style={styles.romGrid}>
            {Object.entries(metrics.range_of_motion).map(([joint, value]) => (
              <View key={joint} style={styles.romItem}>
                <Text style={styles.romJoint}>{joint.replace('_', ' ')}</Text>
                <Text style={styles.romValue}>{value.toFixed(1)}°</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Center of Mass Analysis */}
        <View style={styles.comSection}>
          <Text style={styles.subSectionTitle}>🎯 Center of Mass</Text>
          <View style={styles.comMetrics}>
            <View style={styles.comItem}>
              <Text style={styles.comLabel}>Total Displacement</Text>
              <Text style={styles.comValue}>{metrics.com_displacement.toFixed(4)}</Text>
            </View>
            <View style={styles.comItem}>
              <Text style={styles.comLabel}>Stability (X)</Text>
              <Text style={styles.comValue}>
                {Math.std ? Math.std(metrics.center_of_mass_positions.map(p => p[0])).toFixed(4) : 'N/A'}
              </Text>
            </View>
            <View style={styles.comItem}>
              <Text style={styles.comLabel}>Stability (Y)</Text>
              <Text style={styles.comValue}>
                {Math.std ? Math.std(metrics.center_of_mass_positions.map(p => p[1])).toFixed(4) : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render visualization gallery
  const renderVisualizationGallery = () => {
    if (!visualizationUrls || Object.keys(visualizationUrls).length === 0) return null;

    const visualizationTitles = {
      joint_angles: '📐 Joint Angles Over Time',
      velocities: '⚡ Movement Velocities',
      com_trajectory: '🎯 Center of Mass Trajectory',
      summary_scores: '📊 Movement Quality Scores'
    };

    return (
      <View style={styles.visualizationGallery}>
        <Text style={styles.sectionTitle}>📈 Analysis Visualizations</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.visualizationScroll}>
          {Object.entries(visualizationUrls).map(([key, url]) => (
            <TouchableOpacity
              key={key}
              style={styles.visualizationCard}
              onPress={() => {
                setSelectedVisualization({ title: visualizationTitles[key] || key, url });
                setShowVisualizationModal(true);
              }}
            >
              <Image source={{ uri: url }} style={styles.visualizationThumbnail} />
              <Text style={styles.visualizationTitle}>
                {visualizationTitles[key] || key.replace('_', ' ')}
              </Text>
              <View style={styles.viewFullButton}>
                <Ionicons name="expand" size={16} color="#fff" />
                <Text style={styles.viewFullText}>View Full</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render processed video section
  const renderProcessedVideo = () => {
    if (!processedVideoUrl) return null;

    return (
      <View style={styles.processedVideoSection}>
        <Text style={styles.sectionTitle}>🎬 Analyzed Video with Pose Landmarks</Text>
        <Text style={styles.sectionDescription}>
          Watch your movement with AI-detected pose landmarks and center of mass tracking
        </Text>
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: processedVideoUrl }}
            style={styles.processedVideo}
            useNativeControls
            resizeMode="contain"
            shouldPlay={false}
            isLooping={false}
          />
        </View>
        <View style={styles.videoInfo}>
          <View style={styles.videoInfoItem}>
            <Ionicons name="eye" size={16} color="#4ECDC4" />
            <Text style={styles.videoInfoText}>33 pose landmarks detected</Text>
          </View>
          <View style={styles.videoInfoItem}>
            <Ionicons name="analytics" size={16} color="#ff4c48" />
            <Text style={styles.videoInfoText}>Real-time center of mass tracking</Text>
          </View>
          <View style={styles.videoInfoItem}>
            <Ionicons name="fitness" size={16} color="#4CAF50" />
            <Text style={styles.videoInfoText}>Movement quality analysis</Text>
          </View>
        </View>
      </View>
    );
  };

  // Visualization Modal Component
  const VisualizationModal = () => (
    <Modal
      visible={showVisualizationModal}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => setShowVisualizationModal(false)}
    >
      <ImageBackground source={backgroundImage} style={styles.modalContainer} resizeMode="cover">
        <View style={styles.modalOverlay}>
          <View style={styles.visualizationModalHeader}>
            <Text style={styles.visualizationModalTitle}>
              {selectedVisualization?.title || 'Visualization'}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowVisualizationModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.visualizationModalContent} showsVerticalScrollIndicator={false}>
            {selectedVisualization && (
              <Image 
                source={{ uri: selectedVisualization.url }} 
                style={styles.fullVisualizationImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </ImageBackground>
    </Modal>
  );

  // Results Modal Component
  const ResultsModal = () => (
    <Modal
      visible={showResultsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowResultsModal(false)}
    >
      <View style={styles.modalContainer}>
        <ImageBackground source={backgroundImage} style={styles.modalBackground} resizeMode="cover">
          <View style={styles.modalOverlay}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏃‍♂️ Complete Analysis Results</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowResultsModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Processed Video Section */}
              {renderProcessedVideo()}

              {/* Detailed Metrics */}
              {renderDetailedMetrics()}

              {/* Visualization Gallery */}
              {renderVisualizationGallery()}

              {/* Recommendations */}
              {analysisResults?.recommendations && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.sectionTitle}>💡 Personalized Recommendations</Text>
                  {analysisResults.recommendations
                    .filter(rec => rec !== null)
                    .map((recommendation, index) => (
                      <View key={index} style={styles.recommendationItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.recommendationText}>{recommendation}</Text>
                      </View>
                    ))}
                </View>
              )}

              {/* Analysis Report */}
              {analysisResults?.report && (
                <View style={styles.reportSection}>
                  <Text style={styles.sectionTitle}>📋 Detailed Report</Text>
                  <ScrollView style={styles.reportContainer}>
                    <Text style={styles.reportText}>{analysisResults.report}</Text>
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );

  const stepInfo = getStepInfo();

  return (
    <ImageBackground source={backgroundImage} style={styles.container} resizeMode="cover">
      <View style={styles.overlay}>
        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Movement Analysis</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Video Selection Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📹 Select Video</Text>
              <Text style={styles.sectionDescription}>
                Choose a workout video for comprehensive movement analysis with pose landmark detection
              </Text>

              {selectedVideo ? (
                <View style={styles.selectedVideoContainer}>
                  <Video
                    source={{ uri: selectedVideo.uri }}
                    style={styles.videoPreview}
                    useNativeControls
                    resizeMode="contain"
                    shouldPlay={false}
                  />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoName}>{selectedVideo.name || 'Selected Video'}</Text>
                    <Text style={styles.videoDetails}>
                      Duration: {selectedVideo.duration ? Math.round(selectedVideo.duration / 1000) : 'Unknown'}s
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.videoPickerContainer}>
                  <TouchableOpacity style={styles.pickVideoButton} onPress={pickVideo}>
                    <LinearGradient
                      colors={['#ff4c48', '#c44569']}
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="videocam" size={32} color="#fff" />
                      <Text style={styles.buttonText}>Select from Gallery</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.pickVideoButton} onPress={pickVideoDocument}>
                    <LinearGradient
                      colors={['#2c2c2c', '#1a1a1a']}
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="document" size={32} color="#fff" />
                      <Text style={styles.buttonText}>Browse Files</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Analysis Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔬 AI-Powered Analysis</Text>
              
              {/* Status Indicator */}
              <View style={styles.statusContainer}>
                <View style={[styles.statusIndicator, { backgroundColor: stepInfo.color }]}>
                  <Ionicons name={stepInfo.icon} size={20} color="#fff" />
                </View>
                <Text style={styles.statusText}>{stepInfo.text}</Text>
              </View>

              {/* Progress Bar */}
              {(isUploading || isAnalyzing) && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: isUploading
                            ? `${uploadProgress}%`
                            : isAnalyzing
                            ? '50%'
                            : '0%'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {isUploading
                      ? `Uploading: ${uploadProgress}%`
                      : isAnalyzing
                      ? 'Creating pose landmarks & analyzing...'
                      : ''}
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {analysisStep === 'error' && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color="#F44336" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.analyzeButton,
                    (!selectedVideo || isUploading || isAnalyzing) && styles.disabledButton
                  ]}
                  onPress={uploadVideo}
                  disabled={!selectedVideo || isUploading || isAnalyzing}
                >
                  <LinearGradient
                    colors={
                      (!selectedVideo || isUploading || isAnalyzing)
                        ? ['#666', '#444']
                        : ['#ff4c48', '#c44569']
                    }
                    style={styles.buttonGradient}
                  >
                    {(isUploading || isAnalyzing) ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="analytics" size={24} color="#fff" />
                    )}
                    <Text style={styles.buttonText}>
                      {isUploading
                        ? 'Uploading...'
                        : isAnalyzing
                        ? 'Analyzing...'
                        : 'Start Full Analysis'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {analysisResults && (
                  <TouchableOpacity
                    style={styles.resultsButton}
                    onPress={() => setShowResultsModal(true)}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#45a049']}
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="bar-chart" size={24} color="#fff" />
                      <Text style={styles.buttonText}>View Complete Results</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Quick Results Preview */}
            {analysisResults && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Quick Results</Text>
                <View style={styles.quickResultsContainer}>
                  <View style={styles.quickResultItem}>
                    <Text style={styles.quickResultLabel}>Overall Score</Text>
                    <Text style={styles.quickResultValue}>
                      {(analysisResults.overall_score * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.quickResultItem}>
                    <Text style={styles.quickResultLabel}>Frames Processed</Text>
                    <Text style={styles.quickResultValue}>
                      {analysisResults.frames_processed}
                    </Text>
                  </View>
                  <View style={styles.quickResultItem}>
                    <Text style={styles.quickResultLabel}>Pose Landmarks</Text>
                    <Text style={styles.quickResultValue}>33</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Enhanced Features List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Advanced Analysis Features</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="eye" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>33-point pose landmark detection with video overlay</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="analytics" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Comprehensive movement quality scoring</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="swap-horizontal" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Balance, symmetry, and smoothness analysis</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="trending-up" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Real-time center of mass tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="bar-chart" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>Interactive visualization charts</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="bulb" size={20} color="#ff4c48" />
                  <Text style={styles.featureText}>AI-powered personalized recommendations</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>

        {/* Results Modal */}
        <ResultsModal />

        {/* Visualization Modal */}
        <VisualizationModal />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    lineHeight: 20,
  },
  selectedVideoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  videoInfo: {
    padding: 10,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  videoDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  videoPickerContainer: {
    gap: 15,
  },
  pickVideoButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    gap: 15,
  },
  analyzeButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  resultsButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  quickResultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  quickResultItem: {
    alignItems: 'center',
  },
  quickResultLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  quickResultValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4c48',
  },
  featuresList: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  processedVideoSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  videoContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  processedVideo: {
    width: '100%',
    height: 250,
  },
  videoInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoInfoText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  detailedMetricsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  metricsCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    marginHorizontal: 5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  symmetrySection: {
    marginBottom: 20,
  },
  symmetryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  symmetryItem: {
    alignItems: 'center',
  },
  symmetryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  symmetryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  romSection: {
    marginBottom: 20,
  },
  romGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  romItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  romJoint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 4,
  },
  romValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#96CEB4',
  },
  comSection: {
    marginBottom: 20,
  },
  comMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  comItem: {
    alignItems: 'center',
  },
  comLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    textAlign: 'center',
  },
  comValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#45B7D1',
  },
  visualizationGallery: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  visualizationScroll: {
    flexDirection: 'row',
  },
  visualizationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    width: 220,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  visualizationThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  visualizationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 76, 72, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewFullText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  visualizationModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  visualizationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualizationModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fullVisualizationImage: {
    width: '100%',
    height: height * 0.7,
    borderRadius: 15,
  },
  recommendationsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  reportSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.2)',
  },
  reportContainer: {
    maxHeight: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 15,
  },
  reportText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
});