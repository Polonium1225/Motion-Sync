import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost , getUserId, uploadPostImage} from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';

const CreatePostScreen = () => {
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const navigation = useNavigation();

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera access to take photos');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageUri) {
      Alert.alert('Empty post', 'Please add some text or an image');
      return;
    }
  
    try {
      const userId = await getUserId();
      console.log('User ID:', userId); // Debug log
      let imageFileId = null;
      
      if (imageUri) {
        console.log('Starting image upload...'); // Debug log
        imageFileId = await uploadPostImage(imageUri);
        console.log('Image uploaded with ID:', imageFileId); // Debug log
      }
  
      console.log('Creating post...'); // Debug log
      const success = await createPost(userId, content, imageFileId);
      
      if (success) {
        console.log('Post created successfully'); // Debug log
        navigation.goBack();
      }
    } catch (error) {
      console.error('Detailed post creation error:', {
        message: error.message,
        stack: error.stack
      });
      Alert.alert(
        'Error', 
        'Failed to create post. Please check your connection and try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        multiline
        numberOfLines={4}
        value={content}
        onChangeText={setContent}
      />

      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Ionicons name="image" size={24} color="#05907A" />
          <Text style={styles.buttonText}>Add Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color="#05907A" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity 
            style={styles.removeImageButton} 
            onPress={() => setImageUri(null)}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.postButton} onPress={handlePost}>
        <Ionicons name="send" size={24} color="white" />
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#05907A',
  },
  imagePreviewContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 5,
  },
  postButton: {
    flexDirection: 'row',
    backgroundColor: '#05907A',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#05907A',
    fontSize: 14,
    fontWeight: '600',
  },
  postButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreatePostScreen;