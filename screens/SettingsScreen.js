import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { account, databases, storage, ID, Query } from '../lib/AppwriteService';

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
        const profiles = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          'user_profiles',
          [Query.equal('userId', user.$id)]
        );
        
        if (profiles.documents[0]?.avatar) {
          const url = storage.getFilePreview('profile_images', profiles.documents[0].avatar);
          setImage(url.href);
        }
      } catch (error) {
        console.log('Load error:', error);
        Alert.alert('Error', 'Failed to load profile');
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

      // Pick image - using the modern approach
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaType: ImagePicker.MediaType.photo, // Fixed mediaType
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      const fileId = ID.unique();
      const fileExtension = uri.split('.').pop();
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File does not exist');
      
      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create file object for Appwrite
      const file = {
        name: `${fileId}.${fileExtension}`,
        mimeType: `image/${fileExtension}`,
        size: fileInfo.size || (fileContent.length * 3/4), // Estimate size if missing
        base64: fileContent,
      };

      // Upload to Appwrite
      const response = await storage.createFile(
        'profile_images',
        fileId,
        file
      );
      
      return fileId;
    } catch (error) {
      console.log('Upload error:', error);
      throw new Error('Failed to upload image');
    }
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      
      // Update account name
      await account.updateName(name);
      
      // Upload image if changed
      let avatarId = null;
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
      
      const updateData = { name };
      if (avatarId) updateData.avatar = avatarId;
      
      if (profiles.documents[0]) {
        await databases.updateDocument(
          '67d0bba1000e9caec4f2',
          'user_profiles',
          profiles.documents[0].$id,
          updateData
        );
      } else {
        await databases.createDocument(
          '67d0bba1000e9caec4f2',
          'user_profiles',
          ID.unique(),
          {
            userId: user.$id,
            ...updateData,
            status: 'online'
          }
        );
      }
      
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.log('Save error:', error);
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
        <Text style={{ textAlign: 'center', marginTop: 8 }}>Change Photo</Text>
      </TouchableOpacity>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your Name"
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc',
          padding: 12,
          marginVertical: 20,
          borderRadius: 5
        }}
      />

      <TouchableOpacity 
        onPress={saveProfile}
        disabled={loading}
        style={{ 
          backgroundColor: '#007AFF', 
          padding: 15, 
          borderRadius: 5,
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            Save Profile
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   contentContainer: {
//     paddingBottom: 30,
//   },
//   loadingContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   profileSection: {
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#fff',
//     marginBottom: 15,
//     borderRadius: 10,
//     marginHorizontal: 15,
//     marginTop: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 3,
//   },
//   profileImageContainer: {
//     position: 'relative',
//     marginBottom: 15,
//   },
//   profileImage: {
//     width: 120,
//     height: 120,
//     borderRadius: 60,
//     borderWidth: 3,
//     borderColor: '#fff',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//   },
//   editImageOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     backgroundColor: '#007AFF',
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#fff',
//   },
//   fullName: {
//     fontSize: 22,
//     fontWeight: '600',
//     marginBottom: 15,
//     color: '#333',
//   },
//   editProfileButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#007AFF',
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 25,
//     marginBottom: 10,
//   },
//   buttonIcon: {
//     marginRight: 8,
//   },
//   editProfileText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   editPanel: {
//     width: '100%',
//     marginTop: 10,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f0f0f0',
//     borderRadius: 10,
//     paddingHorizontal: 15,
//     marginBottom: 20,
//     height: 50,
//   },
//   inputIcon: {
//     marginRight: 10,
//   },
//   input: {
//     flex: 1,
//     height: '100%',
//     fontSize: 16,
//     color: '#333',
//   },
//   uploadLabel: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 10,
//   },
//   uploadButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#007AFF',
//     paddingVertical: 12,
//     borderRadius: 8,
//     marginBottom: 20,
//   },
//   uploadButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   progressContainer: {
//     marginBottom: 20,
//   },
//   progressText: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 5,
//   },
//   progressBar: {
//     height: 6,
//     backgroundColor: '#e0e0e0',
//     borderRadius: 3,
//     overflow: 'hidden',
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#007AFF',
//   },
//   buttonGroup: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 10,
//   },
//   actionButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   saveButton: {
//     backgroundColor: '#007AFF',
//     marginLeft: 10,
//   },
//   cancelButton: {
//     backgroundColor: '#e0e0e0',
//     marginRight: 10,
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 16,
//   },
//   settingsSection: {
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     marginHorizontal: 15,
//     paddingVertical: 10,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 3,
//   },
//   settingsTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#999',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     textTransform: 'uppercase',
//   },
//   settingButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 15,
//     paddingHorizontal: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   settingIcon: {
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     backgroundColor: '#007AFF',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 15,
//   },
//   settingText: {
//     flex: 1,
//     fontSize: 16,
//     color: '#333',
//   },
// });