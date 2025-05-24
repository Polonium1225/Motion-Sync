import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from './config'; // Import centralized config
import Colors from '../constants/Colors';

const SERVER_URL = `${API_CONFIG.BASE_URL}/uploads`; // Use config for base URL

export default function VideoUploadScreen({ navigation }) {
  const [pastVideo, setPastVideo] = useState(null);
  const [newVideo, setNewVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const pickVideo = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        if (type === 'past') {
          setPastVideo(video);
        } else {
          setNewVideo(video);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video: ' + error.message);
    }
  };

  const uploadVideo = async (video) => {
    console.log('Starting upload for video:', video.name);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: video.uri,
        name: video.name || 'video.mp4',
        type: 'video/mp4',
      });

      console.log('Sending upload request to:', SERVER_URL);

      const response = await fetch(SERVER_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json'
        },
      });

      console.log('Upload response status:', response.status);

      // Get response as text first for debugging
      const responseText = await response.text();
      console.log('Upload response text:', responseText);

      // Try to parse the JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed upload result:', result);
      } catch (parseError) {
        console.error('Failed to parse upload response as JSON:', parseError);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.detail || `Upload failed with status ${response.status}`);
      }

      if (!result.url) {
        throw new Error('Upload succeeded but no URL was returned');
      }

      return result;
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  };

  const handleCompare = async () => {
    if (!pastVideo || !newVideo) {
      Alert.alert('Error', 'Please select both past and new videos.');
      return;
    }

    setUploading(true);
    try {
      // Upload past video
      setCurrentStep('Uploading past video...');
      console.log('Uploading past video...');
      const pastUpload = await uploadVideo(pastVideo);
      console.log('Past video uploaded successfully:', pastUpload.url);

      // Upload new video
      setCurrentStep('Uploading new video...');
      console.log('Uploading new video...');
      const newUpload = await uploadVideo(newVideo);
      console.log('New video uploaded successfully:', newUpload.url);

      // Call compare endpoint
      setCurrentStep('Comparing videos...');
      console.log('Sending comparison request with URLs:', { pastUrl: pastUpload.url, newUrl: newUpload.url });

      // Use URL-encoded format for the comparison request
      const compareUrl = `${API_CONFIG.BASE_URL}/compare`;
      const compareBody = `past_video_url=${encodeURIComponent(pastUpload.url)}&new_video_url=${encodeURIComponent(newUpload.url)}`;

      console.log('Compare request URL:', compareUrl);
      console.log('Compare request body:', compareBody);

      const compareResponse = await fetch(compareUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: compareBody
      });

      // Check response status
      console.log('Compare response status:', compareResponse.status);

      // Try to get response as text first to debug
      const responseText = await compareResponse.text();
      console.log('Compare response text:', responseText);

      // Parse the JSON manually to avoid errors
      let comparisonData;
      try {
        comparisonData = JSON.parse(responseText);
        console.log('Parsed compare result:', comparisonData);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (!compareResponse.ok) {
        throw new Error(comparisonData.detail || `Comparison failed with status ${compareResponse.status}`);
      }

      // Navigate to comparison screen with processed video URLs
      navigation.navigate('PerformanceComparisonScreen', {
        videoUri: comparisonData.new_video_url,
        pastVideoUri: comparisonData.past_video_url,
        similarity: comparisonData.similarity,
        smoothness: comparisonData.smoothness,
        speed: comparisonData.speed,
        cohesion: comparisonData.cohesion,
        accuracy: comparisonData.accuracy,
        improvements: comparisonData.improvements,
        regressions: comparisonData.regressions,
      });
    } catch (error) {
      console.error('Compare error details:', error);

      // Provide more specific error message
      let errorMessage = 'Failed to compare videos.';
      if (error.message) {
        errorMessage += '\n\nDetails: ' + error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={Colors.gradientCard} style={styles.gradient}>
        <Text style={styles.title}>Upload Videos for Comparison</Text>

        <View style={styles.uploadContainer}>
          <Text style={styles.label}>Past Performance Video</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo('past')}>
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.textPrimary} />
            <Text style={styles.uploadText}>
              {pastVideo ? pastVideo.name : 'Select Past Video'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.uploadContainer}>
          <Text style={styles.label}>Current Performance Video</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo('new')}>
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.textPrimary} />
            <Text style={styles.uploadText}>
              {newVideo ? newVideo.name : 'Select Current Video'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.compareButton, uploading && styles.disabledButton]}
          onPress={handleCompare}
          disabled={uploading}
        >
          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.textPrimary} />
              <Text style={styles.loadingText}>{currentStep}</Text>
            </View>
          ) : (
            <Text style={styles.compareText}>Compare Videos</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 30,
  },
  uploadContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceDark,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uploadText: {
    color: Colors.textPrimary,
    marginLeft: 10,
    fontSize: 16,
  },
  compareButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.surfaceDark,
  },
  compareText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textPrimary,
    marginLeft: 10,
    fontSize: 14,
  },
});