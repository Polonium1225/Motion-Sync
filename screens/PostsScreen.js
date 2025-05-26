import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Modal, TextInput, Image, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PostItem from '../screens/PostItem';
import { getPostsWithUsers } from '../lib/AppwriteService';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { createPost, getUserId, uploadPostImage } from '../lib/AppwriteService';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';

const PostsScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [content, setContent] = useState('');
  const [imageObj, setImageObj] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Move all hooks to the top, before any conditional returns
  useEffect(() => {
    (async () => {
      // Request camera roll permissions when component mounts
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to select images');
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // Request camera roll permissions when component mounts
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to select images');
      }
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPosts();
    }, [])
  );

  const loadPosts = async () => {
    try {
      const fetchedPosts = await getPostsWithUsers();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Double-check permissions
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Image picker result:', result); // Debug log

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageObj(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera access to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageObj(result.assets[0]);
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

      await createPost(userId, content, imageFileId);
      await loadPosts(); // Refresh the posts list
      setShowCreateModal(false);
      setContent('');
      setImageObj(null);
    } catch (error) {
      console.error('Post creation failed:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.container}>
        {/* Create Post Button */}
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="create-outline" size={24} color={Colors.textPrimary} />
          <Text style={styles.createPostButtonText}>Create Post</Text>
        </TouchableOpacity>

        {/* Posts List */}
        <FlatList
          data={posts}
          renderItem={({ item }) => <PostItem post={item} navigation={navigation} />}
          keyExtractor={item => item.$id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        {/* Create Post Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={handlePost} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>

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
                  onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageObj(null)}
                >
                  <Ionicons name="close" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 50, 
  },
  listContent: {
    paddingBottom: 20,
  },
  createPostButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 25,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  createPostButtonText: {
    color: Colors.textPrimary,
    ...Fonts.getFont('medium', 'bold'),
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...Fonts.getFont('large', 'bold'),
    color: Colors.textPrimary,
  },
  postButtonText: {
    color: Colors.primary,
    ...Fonts.getFont('medium', 'bold'),
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
  button: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 18,
  },
});

export default PostsScreen;