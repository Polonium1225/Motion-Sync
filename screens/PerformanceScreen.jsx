import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { saveHistory, getUserId } from '../lib/AppwriteService';
import { API_CONFIG } from './config';

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
  
    setLoading(true);
    setLoadingMessage('Uploading Past Video...');
  
    try {
      const pastUrl = await uploadVideo(pastVideoUri);
      setLoadingMessage('Uploading New Video...');
      const newUrl = await uploadVideo(videoUri);
  
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
      const response = await fetch(`${API_CONFIG.BASE_URL}/Uploads`, {
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
    <ImageBackground
      source={require('../assets/backalso2.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Header */}
        <TouchableOpacity style={styles.header} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text style={styles.headerTitle}>Performance</Text>
        </TouchableOpacity>

        {/* Compare Section */}
        <Text style={styles.sectionTitle}>Compare</Text>
        <View style={styles.improvementContainer}>
          {/* Video Previews - Stacked Vertically */}
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
        </View>

        {/* Compare Button - Outside Panel */}
        <TouchableOpacity 
          style={[
            styles.compareButton, 
            (!pastVideoUri || !videoUri) && styles.compareButtonDisabled
          ]} 
          onPress={handleCompare}
        >
          <Text style={styles.compareButtonText}>COMPARE PERFORMANCE</Text>
        </TouchableOpacity>

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
                  <Ionicons name="close" size={24} color="ff4c48" />
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
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
    backgroundColor: '#0c1423',
    borderBottomWidth: 1,
    borderBottomColor: '#3A424A',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 15,
    color: 'white',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    marginTop: 40,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 20,
    color: '#ff4c48',
    paddingHorizontal: 20,
    alignSelf: 'center',
    textAlign: 'center',
  },
  improvementContainer: {
    backgroundColor: 'rgba(60, 45, 45, 0.5)',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderColor: '#ff4c48',
    borderWidth: 2,
  },
  compareText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#ff4c48',
    lineHeight: 24,
  },
  compareButton: {
    backgroundColor: 'transparent',
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: '#ff4c48',
    borderWidth: 2,
    borderRadius: 30,
    marginTop: 15,
    width: '90%',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  compareButtonDisabled: {
    borderColor: '#4A5058',
    shadowColor: '#000',
  },
  compareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // Very dark, highly opaque to simulate blur
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#2D343C',
    width: '90%',
    padding: 25,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    color: 'white',
    textAlign: 'center',
  },
  videoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginVertical: 15,
  },
  uploadButton: {
    backgroundColor: '#ff4c48',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  proceedButton: {
    backgroundColor: '#22272B',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  modalImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginVertical: 20,
    tintColor: '#8D98A3',
  },
  closeButton: {
    padding: 5,
  },
  videoPlaceholderContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: '90%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginVertical: 10,
  },
  previewImage: {
    width: '70%',
    height: '70%',
    tintColor: '#8D98A3',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  placeholderLabel: {
    position: 'absolute',
    bottom: 6,
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
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
    backgroundColor: '#1F2229',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    width: '70%',
  },
  loadingText: {
    marginTop: 20,
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});