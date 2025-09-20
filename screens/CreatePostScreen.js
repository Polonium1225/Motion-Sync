import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { posts, getUserId, storage } from '../lib/SupabaseService'; // Updated imports
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';

const CreatePostScreen = () => {
  const [content, setContent] = useState('');
  const [imageObj, setImageObj] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setImageObj(result.assets[0]);
        console.log('Selected image:', result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageObj(result.assets[0]);
        console.log('Photo taken:', result.assets[0]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageObj) {
      Alert.alert('Empty post', 'Please add some text or an image');
      return;
    }

    try {
      setUploading(true);
      const userId = await getUserId();
      
      if (!userId) {
        Alert.alert('Error', 'Please log in to create a post');
        return;
      }

      let imageUrl = null;

      // Upload image if selected
      if (imageObj) {
        console.log('Uploading image...');
        try {
          const uploadResult = await storage.uploadImage(imageObj);
          imageUrl = uploadResult.publicUrl;
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          
          // Ask user if they want to continue without image
          const continueWithoutImage = await new Promise((resolve) => {
            Alert.alert(
              'Image Upload Failed',
              'Failed to upload image. Would you like to post without the image?',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Post without image', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (!continueWithoutImage) {
            return;
          }
        }
      }

      // Create the post
      console.log('Creating post with content:', content, 'and imageUrl:', imageUrl);
      const newPost = await posts.createPost(userId, content, imageUrl);
      
      console.log('Post created successfully:', newPost);

      // Reset form and navigate back
      setContent('');
      setImageObj(null);
      navigation.goBack();
      
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Post creation failed:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageObj(null);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        placeholderTextColor={Colors.textSecondary}
        multiline
        numberOfLines={4}
        value={content}
        onChangeText={setContent}
        editable={!uploading}
      />

      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity 
          style={[styles.imageButton, uploading && styles.disabledButton]} 
          onPress={pickImage}
          disabled={uploading}
        >
          <Ionicons name="image" size={24} color={uploading ? Colors.textSecondary : Colors.primary} />
          <Text style={[styles.buttonText, uploading && styles.disabledText]}>Add Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.imageButton, uploading && styles.disabledButton]} 
          onPress={takePhoto}
          disabled={uploading}
        >
          <Ionicons name="camera" size={24} color={uploading ? Colors.textSecondary : Colors.primary} />
          <Text style={[styles.buttonText, uploading && styles.disabledText]}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {imageObj && (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: imageObj.uri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removeImage}
            disabled={uploading}
          >
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          {uploading && (
            <View style={styles.imageUploadOverlay}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.postButton, 
          uploading && styles.disabledButton,
          (!content.trim() && !imageObj) && styles.disabledButton
        ]}
        onPress={handlePost}
        disabled={uploading || (!content.trim() && !imageObj)}
      >
        {uploading ? (
          <>
            <ActivityIndicator color={Colors.textPrimary} size="small" />
            <Text style={styles.postButtonText}>Posting...</Text>
          </>
        ) : (
          <>
            <Ionicons name="send" size={24} color={Colors.textPrimary} />
            <Text style={styles.postButtonText}>Post</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  input: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 12,
    padding: 16,
    ...Fonts.getFont('medium', 'regular'),
    color: Colors.textPrimary,
    minHeight: 150,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
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
    backgroundColor: Colors.surfaceDark,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  imagePreviewContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 6,
  },
  imageUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadingText: {
    color: Colors.textPrimary,
    marginTop: 10,
    ...Fonts.getFont('small', 'medium'),
  },
  postButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    ...Fonts.getFont('small', 'bold'),
    color: Colors.primary,
  },
  postButtonText: {
    ...Fonts.getFont('medium', 'bold'),
    color: Colors.textPrimary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.textSecondary,
  },
});

export default CreatePostScreen;