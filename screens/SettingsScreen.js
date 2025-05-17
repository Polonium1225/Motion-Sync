import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { account, databases, storage, ID, Query, DATABASE_ID, COLLECTIONS } from '../lib/AppwriteService';
import { Client } from 'appwrite'; // Make sure this is imported
import Colors from '../constants/color';

export default function SettingsScreen() {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);
  const [selectedImageObj, setSelectedImageObj] = useState(null); // Store full image object

  // Your Appwrite project ID and endpoint - make sure these match your AppwriteService.js
  const PROJECT_ID = '67d0bb27002cfc0b22d2'; // Replace with your project ID from AppwriteService
  const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; // Replace if you're using a different endpoint

  // Load current user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const user = await account.get();
        setUserId(user.$id);
        setName(user.name || '');

        // Load profile from database
        const profiles = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          [Query.equal('userId', user.$id)]
        );

        if (profiles.documents.length > 0) {
          const profile = profiles.documents[0];
          setProfileDoc(profile);

          // If profile has avatar, get direct file URL (without transformations)
          if (profile.avatar) {
            try {
              // Create direct download URL instead of preview URL (which requires a paid plan)
              const imageUrl = `${API_ENDPOINT}/storage/buckets/profile_images/files/${profile.avatar}/view?project=${PROJECT_ID}`;

              console.log('Loading avatar image from:', imageUrl);
              setImage(imageUrl);
            } catch (error) {
              console.log('Error getting file view:', error);
            }
          }
        }
      } catch (error) {
        console.log('Load user error:', error);
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
        setSelectedImageObj(result.assets[0]); // Store full image object
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const uploadImage = async (imageObject) => {
    try {
      // Generate a unique ID for the file
      const fileId = ID.unique();
      console.log('Generated file ID:', fileId);

      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('file', {
        uri: imageObject.uri,
        type: imageObject.mimeType || 'image/jpeg',
        name: imageObject.fileName || 'upload.jpg'
      });

      console.log('FormData prepared with file:', {
        uri: imageObject.uri,
        type: imageObject.mimeType || 'image/jpeg',
        name: imageObject.fileName || 'upload.jpg'
      });

      // Direct HTTP request to Appwrite API
      const response = await fetch(
        `https://cloud.appwrite.io/v1/storage/buckets/profile_images/files`,
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
        return result.$id;
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload image error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  const saveProfile = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    try {
      setLoading(true);

      // Update account name
      await account.updateName(name);

      // Upload new image if selected
      let avatarId = profileDoc?.avatar;
      if (image && selectedImageObj && !image.includes('profile_images')) {
        console.log('Uploading new image...');
        avatarId = await uploadImage(selectedImageObj);
        console.log('Image uploaded with ID:', avatarId);
      }

      // Prepare update data
      const updateData = {
        name,
        userId,
        status: profileDoc?.status || 'online',
      };

      if (avatarId) {
        updateData.avatar = avatarId;
      }

      // Update or create profile document
      if (profileDoc) {
        console.log('Updating existing profile:', profileDoc.$id);
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          profileDoc.$id,
          updateData
        );
      } else {
        console.log('Creating new profile');
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          ID.unique(),
          updateData
        );
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{name.charAt(0) || 'U'}</Text>
          </View>
        )}
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your Name"
        placeholderTextColor={Colors.textSecondary}
        style={styles.input}
      />

      <TouchableOpacity
        onPress={saveProfile}
        disabled={loading}
        style={[styles.saveButton, loading && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.saveButtonText}>
            Save Profile
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  changePhotoText: {
    marginTop: 10,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  saveButton: {
    backgroundColor: Colors.surfaceDark,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 18,
  },
});
