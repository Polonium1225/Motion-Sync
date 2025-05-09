import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SERVER_URL = 'http://192.168.1.104:8000/uploads'; // Replace with your backend URL

export default function VideoUploadScreen({ navigation }) {
  const [pastVideo, setPastVideo] = useState(null);
  const [newVideo, setNewVideo] = useState(null);
  const [uploading, setUploading] = useState(false);

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
    const formData = new FormData();
    formData.append('file', {
      uri: video.uri,
      name: video.name || 'video.mp4',
      type: 'video/mp4',
    });

    const response = await fetch(`${SERVER_URL}/uploads`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error('Upload failed: ' + response.statusText);
    }

    return await response.json();
  };

  const handleCompare = async () => {
    if (!pastVideo || !newVideo) {
      Alert.alert('Error', 'Please select both past and new videos.');
      return;
    }

    setUploading(true);
    try {
      // Upload videos
      const pastUpload = await uploadVideo(pastVideo);
      const newUpload = await uploadVideo(newVideo);

      // Call compare endpoint
      const compareResponse = await fetch(`${SERVER_URL}/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `past_video_url=${encodeURIComponent(pastUpload.url)}&new_video_url=${encodeURIComponent(newUpload.url)}`,
      });

      if (!compareResponse.ok) {
        throw new Error('Comparison failed: ' + compareResponse.statusText);
      }

      const comparisonData = await compareResponse.json();

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
      Alert.alert('Error', 'Failed to compare videos: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2229', '#2D343C']} style={styles.gradient}>
        <Text style={styles.title}>Upload Videos for Comparison</Text>

        <View style={styles.uploadContainer}>
          <Text style={styles.label}>Past Performance Video</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo('past')}>
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            <Text style={styles.uploadText}>
              {pastVideo ? pastVideo.name : 'Select Past Video'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.uploadContainer}>
          <Text style={styles.label}>Current Performance Video</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => pickVideo('new')}>
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
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
            <ActivityIndicator size="small" color="#fff" />
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
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  uploadContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8D98A3',
    marginBottom: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A424A',
    padding: 15,
    borderRadius: 12,
  },
  uploadText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
  compareButton: {
    backgroundColor: '#01CC97',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  compareText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});