import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { account, databases, storage, DATABASE_ID, COLLECTIONS } from '../lib/AppwriteService';
import { ID, Query } from 'appwrite';

export default function SettingsScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('Loading...');
  const [profileImage, setProfileImage] = useState(require('../assets/icon.png'));
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load user profile on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const user = await account.get();
        setUserId(user.$id);
        
        // Try to load from AsyncStorage first
        const savedProfileName = await AsyncStorage.getItem('profile_name');
        const savedProfileImageUri = await AsyncStorage.getItem('profile_image');
        
        if (savedProfileName) setFullName(savedProfileName);
        if (savedProfileImageUri) setProfileImage({ uri: savedProfileImageUri });
        
        // Then load from Appwrite
        const profile = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          [Query.equal('userId', user.$id)]
        );
        
        if (profile.documents.length > 0) {
          const profileData = profile.documents[0];
          setProfileData(profileData);
          setFullName(profileData.name || user.name || 'User');
          
          if (profileData.avatar) {
            const avatarUrl = storage.getFilePreview(
              'profile_images', // Your bucket ID for profile images
              profileData.avatar
            );
            setProfileImage({ uri: avatarUrl });
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, []);

  // Function to handle image selection
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access media library is required!');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!pickerResult.canceled) {
        const selectedImage = pickerResult.assets[0];
        setProfileImage({ uri: selectedImage.uri });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      alert('Failed to pick image');
    }
  };

  // Function to upload image to Appwrite storage
  const uploadImage = async (uri) => {
    try {
      const fileId = ID.unique();
      const fileExtension = uri.split('.').pop();
      
      // Verify valid image extension
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      if (!validExtensions.includes(fileExtension.toLowerCase())) {
        throw new Error('Invalid image format');
      }
  
      // Read and upload file
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File not found');
      
      const file = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const blob = await fetch(`data:image/${fileExtension};base64,${file}`)
        .then(res => res.blob());
      
      const response = await storage.createFile(
        'profile_images',
        fileId,
        blob
      );
      
      return fileId;
    } catch (error) {
      console.error('Upload error details:', {
        error,
        uri
      });
      throw error;
    }
  };

  // Function to save the profile
  const saveProfile = async () => {
    try {
      setIsLoading(true);
      let avatarId = profileData?.avatar;
      
      // Upload new image if changed
      if (profileImage.uri && !profileImage.uri.includes('profile_images')) {
        try {
          avatarId = await uploadImage(profileImage.uri);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error('Image upload failed');
        }
      }
      
      // Update profile in database
      if (profileData) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          profileData.$id,
          {
            name: fullName,
            avatar: avatarId,
            lastSeen: new Date().toISOString() // Changed from Updated to lastSeen
          }
        );
      } else {
        // Create new profile if it doesn't exist
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          ID.unique(),
          {
            userId: userId,
            name: fullName,
            avatar: avatarId,
            status: 'online',
            lastSeen: new Date().toISOString()
          }
        );
      }
      
      // Save to AsyncStorage for offline use
      await AsyncStorage.multiSet([
        ['profile_name', fullName],
        ['profile_image', profileImage.uri || '']
      ]);
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert(`Failed to save profile: ${error.message}`);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  if (isLoading && !isEditing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Profile Image with Edit Icon when in edit mode */}
        <TouchableOpacity 
          onPress={isEditing ? pickImage : null}
          disabled={!isEditing}
          style={styles.profileImageContainer}
        >
          <Image
            source={profileImage}
            style={styles.profileImage}
          />
          {isEditing && (
            <View style={styles.editImageOverlay}>
              <Icon name="camera" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {!isEditing ? (
          <>
            <Text style={styles.fullName}>{fullName}</Text>
            <TouchableOpacity 
              style={styles.editProfileButton} 
              onPress={() => setIsEditing(true)}
            >
              <Icon name="edit" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.editProfileText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.editPanel}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            
            <View style={styles.inputContainer}>
              <Icon name="user" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            
            <Text style={styles.uploadLabel}>Profile Picture</Text>
            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={pickImage}
            >
              <Icon name="upload" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.uploadButtonText}>CHOOSE IMAGE</Text>
            </TouchableOpacity>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Uploading: {Math.round(uploadProgress)}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
              </View>
            )}
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.actionButtonText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={saveProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>SAVE CHANGES</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Other Settings */}
      <View style={styles.settingsSection}>
        <Text style={styles.settingsTitle}>ACCOUNT SETTINGS</Text>
        
        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingIcon}>
            <Icon name="moon-o" size={20} color="#fff" /> {/* Changed from "moon" to "moon-o" */}
          </View>
          <Text style={styles.settingText}>Dark Mode</Text>
          <Icon name="angle-right" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingIcon}>
            <Icon name="credit-card" size={20} color="#fff" />
          </View>
          <Text style={styles.settingText}>Subscription & Payments</Text>
          <Icon name="angle-right" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingButton}>
          <View style={styles.settingIcon}>
            <Icon name="phone" size={20} color="#fff" />
          </View>
          <Text style={styles.settingText}>Support</Text>
          <Icon name="angle-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fullName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 10,
  },
  buttonIcon: {
    marginRight: 8,
  },
  editProfileText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  editPanel: {
    width: '100%',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  uploadLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    paddingVertical: 10,
    textTransform: 'uppercase',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});