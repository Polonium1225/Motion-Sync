import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { saveHistory, getUserId } from '../lib/AppwriteService';
import { API_CONFIG } from './config'; // Import centralized config
import Colors from '../constants/color';

export default function PerformanceScreen() {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [pastModalVisible, setPastModalVisible] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [pastVideoUri, setPastVideoUri] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

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
  }, []);

  const handleCompare = useCallback(async () => {
    // Check if both videos are selected
    if (!pastVideoUri) {
      Alert.alert('Missing Video', 'Please select a past performance video');
      return;
    }

    if (!videoUri) {
      Alert.alert('Missing Video', 'Please select a new performance video');
      return;
    }

    setLoading(true);
    setLoadingMessage('Uploading Past Video...');

    try {
      const pastUrl = await uploadVideo(pastVideoUri);
      setLoadingMessage('Uploading New Video...');
      const newUrl = await uploadVideo(videoUri);

      // Call /compare endpoint
      setLoadingMessage('Analyzing performance...');
      const formDataCompare = new FormData();
      formDataCompare.append("past_video_url", pastUrl);
      formDataCompare.append("new_video_url", newUrl);

      const compareResponse = await fetch(`${API_CONFIG.BASE_URL}/compare`, {
        method: 'POST',
        body: formDataCompare,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const compareResult = await compareResponse.json();

      if (!compareResponse.ok) throw new Error(compareResult.detail || 'Comparison failed');

      // Navigate with both video URLs + metrics
      navigation.navigate('PerformanceComparisonScreen', {
        videoUri: newUrl,
        pastVideoUri: pastUrl,
        similarity: compareResult.similarity,
        smoothness: compareResult.smoothness,
        improvements: compareResult.improvements,
        regressions: compareResult.regressions,
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to upload or compare videos. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }

  }, [pastVideoUri, videoUri]);

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

  // Upload single video to backend
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

      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Upload failed');
      return result.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.headerTitle}>Performance</Text>
      </TouchableOpacity>

      {/* Improvement Section */}
      <Text style={styles.sectionTitle}>Improvement</Text>
      <View style={styles.improvementContainer}>
        {/* Two Video Previews */}
        <View style={styles.videoPlaceholderContainer}>
          {/* Past Video Preview */}
          <TouchableOpacity style={styles.videoPlaceholder} onPress={() => setPastModalVisible(true)}>
            {pastVideoUri ? (
              <Video
                source={{ uri: pastVideoUri }}
                style={styles.previewVideo}
                useNativeControls={false}
                resizeMode="contain"
                isLooping
              />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.previewImage} />
            )}
            <Text style={styles.placeholderLabel}>PAST VIDEO</Text>
          </TouchableOpacity>

          {/* New Video Preview */}
          <TouchableOpacity style={styles.videoPlaceholder} onPress={() => setModalVisible(true)}>
            {videoUri ? (
              <Video
                source={{ uri: videoUri }}
                style={styles.previewVideo}
                useNativeControls={false}
                resizeMode="contain"
                isLooping
              />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.previewImage} />
            )}
            <Text style={styles.placeholderLabel}>NEW VIDEO</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.compareText}>Compare Past vs. Present Movements</Text>

        {/* Single Compare Button */}
        <TouchableOpacity
          style={[
            styles.compareButton,
            (!pastVideoUri || !videoUri) && styles.compareButtonDisabled
          ]}
          onPress={handleCompare}
        >
          <Text style={styles.compareButtonText}>COMPARE PERFORMANCE</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for NEW Video Upload */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.flexModel}>
              <Text style={styles.modalTitle}>Upload a new video</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            {videoUri ? (
              <Video
                source={{ uri: videoUri }}
                style={styles.videoPreview}
                useNativeControls
                resizeMode="contain"
              />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.modalImage} />
            )}
            <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo(setVideoUri)}>
              <Text style={styles.uploadButtonText}>Select Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.proceedButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for PAST Video Upload */}
      <Modal animationType="fade" transparent={true} visible={pastModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.flexModel}>
              <Text style={styles.modalTitle}>Upload past video</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setPastModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            {pastVideoUri ? (
              <Video
                source={{ uri: pastVideoUri }}
                style={styles.videoPreview}
                useNativeControls
                resizeMode="contain"
              />
            ) : (
              <Image source={require('../assets/video.png')} style={styles.modalImage} />
            )}
            <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo(setPastVideoUri)}>
              <Text style={styles.uploadButtonText}>Select Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.proceedButton} onPress={() => setPastModalVisible(false)}>
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Loading Modal */}
      <Modal animationType="none" transparent={true} visible={loading}>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#01CC97" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flexModel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.5
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 20,
    color: Colors.accentBlue,
    paddingHorizontal: 20,
    alignSelf: 'flex-start'
  },
  improvementContainer: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 20,
    margin: 20,
    padding: 25,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  },
  compareText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 15,
    color: Colors.textPrimary,
    lineHeight: 24
  },
  compareButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginTop: 20
  },
  compareButtonDisabled: {
    backgroundColor: Colors.surfaceDark,
    shadowColor: Colors.background,
  },
  compareButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    backgroundColor: Colors.surfaceDark,
    width: '90%',
    padding: 25,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: Colors.textPrimary,
    textAlign: 'center'
  },
  videoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginVertical: 15
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  uploadButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10
  },
  proceedButton: {
    backgroundColor: Colors.background,
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
    alignItems: 'center'
  },
  proceedButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  modalImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginVertical: 20,
    tintColor: Colors.textSecondary
  },
  closeButton: {
    padding: 5,
  },

  // === Video Placeholder Styles ===
  videoPlaceholderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  videoPlaceholder: {
    width: '40%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImage: {
    width: '70%',
    height: '70%',
    tintColor: Colors.textSecondary,
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  placeholderLabel: {
    position: 'absolute',
    bottom: 6,
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  // === LOADING MODAL STYLES ===
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: Colors.surfaceDark,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    width: '70%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    marginTop: 20,
    color: Colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
});