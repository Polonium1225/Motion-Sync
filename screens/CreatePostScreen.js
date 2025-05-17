import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createPost , getUserId, uploadPostImage} from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/color';
import Fonts from '../constants/fonts';

const CreatePostScreen = () => {
  const [content, setContent] = useState('');
  const [imageObj, setImageObj] = useState(null); // Store full image object instead of just URI
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

  const handlePost = async () => {
    if (!content.trim() && !imageObj) {
      Alert.alert('Empty post', 'Please add some text or an image');
      return;
    }

    try {
      setUploading(true);
      const userId = await getUserId();
      let imageFileId = null;

      if (imageObj) {
        imageFileId = await uploadPostImage(imageObj);
      }

      // Create just the post (without like/comment counts)
      const postId = await createPost(userId, content, imageFileId);

      navigation.goBack();
      Alert.alert('Success', 'Post created successfully!');
    } catch (error) {
      console.error('Post creation failed:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploading(false);
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageObj(result.assets[0]);
      }
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
      />

      <View style={styles.imageButtonsContainer}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Ionicons name="image" size={24} color={Colors.primary} />
          <Text style={styles.buttonText}>Add Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color={Colors.primary} />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {imageObj && (
        <View style={styles.imagePreviewContainer}>
        <Image
          source={{ uri: imageObj.uri }}
          style={styles.imagePreview}
        />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setImageObj(null)}
          >
            <Ionicons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.postButton, uploading && {opacity: 0.7}]}
        onPress={handlePost}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={Colors.textPrimary} size="small" />
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 5,
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
});

export default CreatePostScreen;