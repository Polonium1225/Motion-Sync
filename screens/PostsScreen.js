import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Image, 
  Alert, 
  Animated,
  ImageBackground,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PostItem from '../screens/PostItem';
import { getPostsWithUsers } from '../lib/AppwriteService';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { createPost, getUserId, uploadPostImage } from '../lib/AppwriteService';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';
import backgroundImage from '../assets/sfgsdh.png';

const PostsScreen = ({ navigation }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [content, setContent] = useState('');
  const [imageObj, setImageObj] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const createButtonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 6,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for create button
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(createButtonPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(createButtonPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    const timer = setTimeout(() => {
      pulseLoop.start();
    }, 1500);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, []);

  // Request permissions
  useEffect(() => {
    (async () => {
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

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const showModal = () => {
    setShowCreateModal(true);
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        speed: 4,
        bounciness: 6,
        useNativeDriver: true,
      })
    ]).start();
  };

  const hideModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 0.9,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowCreateModal(false);
      setContent('');
      setImageObj(null);
    });
  };

  const pickImage = async () => {
    try {
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
      await loadPosts();
      hideModal();
    } catch (error) {
      console.error('Post creation failed:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Animated.View 
          style={[
            styles.content,
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Community Feed</Text>
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="options-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Create Post Button */}
          <Animated.View style={[{ transform: [{ scale: createButtonPulse }] }]}>
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={showModal}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Animated.View 
                style={[
                  styles.createPostContent,
                  { transform: [{ scale: buttonScale }] }
                ]}
              >
                <View style={styles.createPostIcon}>
                  <Ionicons name="add" size={24} color="white" />
                </View>
                <Text style={styles.createPostButtonText}>Share your thoughts</Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.7)" />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Posts List */}
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyContent}>
                <Ionicons name="chatbubbles-outline" size={64} color="rgba(255, 255, 255, 0.4)" />
                <Text style={styles.emptyTitle}>No Posts Yet</Text>
                <Text style={styles.emptyText}>
                  Be the first to share something with the community!
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={showModal}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.emptyButtonText}>Create First Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={({ item, index }) => <PostItem post={item} navigation={navigation} index={index} />}
              keyExtractor={item => item.$id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </Animated.View>

        {/* Enhanced Create Post Modal */}
        <Modal
          visible={showCreateModal}
          animationType="none"
          transparent={true}
          onRequestClose={hideModal}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }]
                }
              ]}
            >
              <View style={styles.modalContent}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={hideModal}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Create Post</Text>
                  <TouchableOpacity 
                    style={[
                      styles.modalPostButton,
                      (!content.trim() && !imageObj) && styles.modalPostButtonDisabled
                    ]}
                    onPress={handlePost} 
                    disabled={uploading || (!content.trim() && !imageObj)}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={[
                        styles.modalPostButtonText,
                        (!content.trim() && !imageObj) && styles.modalPostButtonTextDisabled
                      ]}>
                        Post
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Content Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="What's on your mind?"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    multiline
                    numberOfLines={6}
                    value={content}
                    onChangeText={setContent}
                    textAlignVertical="top"
                  />
                </View>

                {/* Image Preview */}
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
                      <Ionicons name="close" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={pickImage}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <View style={styles.actionButtonIcon}>
                      <Ionicons name="image-outline" size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.actionButtonText}>Photo Library</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton} 
                    onPress={takePhoto}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <View style={styles.actionButtonIcon}>
                      <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.actionButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>

                {/* Character Count */}
                <View style={styles.characterCount}>
                  <Text style={styles.characterCountText}>
                    {content.length}/500
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingText: {
    color: Colors.textPrimary,
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButton: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createPostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  createPostIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  createPostButtonText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: 300,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalPostButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modalPostButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalPostButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalPostButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inputContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 120,
  },
  imagePreviewContainer: {
    marginHorizontal: 20,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  characterCount: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  characterCountText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
});

export default PostsScreen;