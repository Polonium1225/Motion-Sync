import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { account, databases, storage } from '../lib/AppwriteService';
import { ID } from 'appwrite';

export default function SettingsScreen() {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load current user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await account.get();
        setName(user.name);
        
        // Load profile image if exists
        const profile = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          'user_profiles',
          [Query.equal('userId', user.$id)]
        );
        
        if (profile.documents[0]?.avatar) {
          const url = storage.getFilePreview('profile_images', profile.documents[0].avatar);
          setImage(url);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile');
      }
    };
    loadUser();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      const fileId = ID.unique();
      const extension = uri.split('.').pop();
      
      // Create file object for Appwrite
      const file = {
        uri: uri,
        name: `${fileId}.${extension}`,
        type: `image/${extension}`,
      };

      await storage.createFile('profile_images', fileId, file);
      return fileId;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // Update account name
      await account.updateName(name);
      
      // Upload new image if selected
      let avatarId;
      if (image && !image.includes('profile_images')) {
        avatarId = await uploadImage(image);
      }
      
      // Update profile in database
      const user = await account.get();
      const profiles = await databases.listDocuments(
        '67d0bba1000e9caec4f2',
        'user_profiles',
        [Query.equal('userId', user.$id)]
      );
      
      if (profiles.documents[0]) {
        await databases.updateDocument(
          '67d0bba1000e9caec4f2',
          'user_profiles',
          profiles.documents[0].$id,
          { 
            name: name,
            ...(avatarId && { avatar: avatarId })
          }
        );
      } else {
        await databases.createDocument(
          '67d0bba1000e9caec4f2',
          'user_profiles',
          ID.unique(),
          {
            userId: user.$id,
            name: name,
            ...(avatarId && { avatar: avatarId }),
            status: 'online'
          }
        );
      }
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={image ? { uri: image } : require('../assets/icon.png')}
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
        <Text style={{ textAlign: 'center' }}>Change Photo</Text>
      </TouchableOpacity>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your Name"
        style={{ 
          borderWidth: 1, 
          padding: 10, 
          marginVertical: 20 
        }}
      />

      <TouchableOpacity 
        onPress={saveProfile}
        disabled={loading}
        style={{ 
          backgroundColor: 'blue', 
          padding: 15, 
          borderRadius: 5 
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', textAlign: 'center' }}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </View>
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