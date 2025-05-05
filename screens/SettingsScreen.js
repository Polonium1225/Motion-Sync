import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { account, databases, storage, ID, Query, DATABASE_ID, COLLECTIONS } from '../lib/AppwriteService';

export default function SettingsScreen() {
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profileDoc, setProfileDoc] = useState(null);

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
          
          // If profile has avatar, get preview URL
          if (profile.avatar) {
            try {
              const filePreview = storage.getFilePreview('profile_images', profile.avatar);
              setImage(filePreview.href);
            } catch (error) {
              console.log('Error getting file preview:', error);
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
      }
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      const fileId = ID.unique();
      const fileName = uri.split('/').pop();
      const fileExtension = fileName.split('.').pop().toLowerCase();
      const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
      
      console.log('Uploading image with details:', {
        uri,
        fileId,
        fileExtension,
        mimeType
      });
      
      // Create a base64 string from the file
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Calculate approximate size based on base64 string length
      // This is a workaround since FileSystem.getInfoAsync might not return size on some platforms
      const approximateSize = Math.ceil(base64.length * 0.75); // Convert base64 size to binary size
      
      console.log('Base64 length:', base64.length, 'Approximate size:', approximateSize);
      
      // Create file in Appwrite storage
      await storage.createFile(
        'profile_images',  // bucket ID
        fileId,            // file ID
        {
          type: mimeType,
          size: approximateSize,
          name: fileName,
          data: base64
        }
      );
      
      return fileId;
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
      if (image && !image.includes('profile_images')) {
        console.log('Uploading new image...');
        avatarId = await uploadImage(image);
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
        style={styles.input}
      />

      <TouchableOpacity 
        onPress={saveProfile}
        disabled={loading}
        style={[styles.saveButton, loading && styles.disabledButton]}
      >
        {loading ? (
          <ActivityIndicator color="white" />
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
    padding: 20,
    backgroundColor: '#fff',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 40,
    color: '#777',
  },
  changePhotoText: {
    marginTop: 10,
    color: '#007AFF',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

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