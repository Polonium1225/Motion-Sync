import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ID } from '../lib/AppwriteService';

export default function AppwriteFileUploader() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState(null);

  // Your Appwrite project ID
  const PROJECT_ID = '67d0bb27002cfc0b22d2';
  // Your bucket ID
  const BUCKET_ID = 'profile_images';

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'We need access to your photos to upload an image');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      console.log('Image picker result:', result);
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('No image selected', 'Please select an image first');
      return;
    }
    
    setUploading(true);
    
    try {
      const fileId = ID.unique();
      console.log('Generated file ID:', fileId);
      
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('file', {
        uri: selectedImage.uri,
        type: selectedImage.mimeType || 'image/jpeg',
        name: selectedImage.fileName || 'upload.jpg'
      });
      
      console.log('FormData prepared with file:', {
        uri: selectedImage.uri,
        type: selectedImage.mimeType || 'image/jpeg',
        name: selectedImage.fileName || 'upload.jpg'
      });
      
      // Direct HTTP request to Appwrite API
      const response = await fetch(
        `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files`, 
        {
          method: 'POST',
          headers: {
            'X-Appwrite-Project': PROJECT_ID,
            // No Content-Type header here - fetch will set it with the boundary for FormData
          },
          body: formData,
        }
      );
      
      const result = await response.json();
      console.log('Upload response:', result);
      
      if (response.ok) {
        setUploadedFileId(result.$id);
        Alert.alert('Success!', `Image uploaded with ID: ${result.$id}`);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload failed', error.message || 'Unknown error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Direct File Upload Test</Text>
      
      <TouchableOpacity 
        style={styles.imagePicker} 
        onPress={pickImage}
        disabled={uploading}
      >
        {selectedImage ? (
          <Image 
            source={{ uri: selectedImage.uri }} 
            style={styles.previewImage} 
          />
        ) : (
          <Text style={styles.pickerText}>Tap to select an image</Text>
        )}
      </TouchableOpacity>
      
      {selectedImage && (
        <View style={styles.imageInfo}>
          <Text>Size: {Math.round(selectedImage.fileSize / 1024)} KB</Text>
          <Text>Type: {selectedImage.mimeType || 'image/jpeg'}</Text>
        </View>
      )}
      
      <TouchableOpacity
        style={[styles.uploadButton, (!selectedImage || uploading) && styles.disabledButton]}
        onPress={uploadImage}
        disabled={!selectedImage || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Upload to Appwrite</Text>
        )}
      </TouchableOpacity>
      
      {uploadedFileId && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            Upload successful! File ID: {uploadedFileId}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  imagePicker: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  pickerText: {
    color: '#888',
    textAlign: 'center',
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageInfo: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  successContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e6ffe6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99cc99',
  },
  successText: {
    color: '#006600',
  },
});