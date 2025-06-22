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
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { saveHistory, getUserId } from '../lib/AppwriteService';
import { API_CONFIG } from './config';

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
  }, [pastVideoUri, videoUri, buttonScale]);

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Performance Analysis</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>Compare Performance</Text>
          <Text style={styles.sectionSubtitle}>
            Upload two videos to analyze your improvement
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
              <Text style={styles.compareButtonText}>ANALYZE PERFORMANCE</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

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
              <Text style={styles.loadingTitle}>Processing</Text>
              <Text style={styles.loadingMessage}>{loadingMessage}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
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
  headerSpacer: {
    width: 40,
  },
  titleSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  videoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
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
  },
  compareButtonDisabled: {
    opacity: 0.5,
    borderColor: '#666',
  },
  compareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
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