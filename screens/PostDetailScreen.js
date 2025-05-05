import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ScrollView, ActivityIndicator } from 'react-native';
import { getPostById, addComment, getUserId, toggleLike, getLikeCount, checkUserLike, userProfiles} from '../lib/AppwriteService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_ENDPOINT = 'https://cloud.appwrite.io/v1';
const PROJECT_ID = '67d0bb27002cfc0b22d2'; // Your project ID
const POSTS_BUCKET_ID = 'profile_images';

const DEFAULT_AVATAR = require('../assets/avatar.png'); 

const getPostImageUrl = (fileId) => {
  if (!fileId) return null;
  return `${API_ENDPOINT}/storage/buckets/${POSTS_BUCKET_ID}/files/${fileId}/view?project=${PROJECT_ID}`;
};

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const loadPost = async () => {
    try {
      const postData = await getPostById(postId);
      setPost(postData);
      const likes = await getLikeCount(postId);
      setLikeCount(likes);
      const userId = await getUserId();
      const userHasLiked = await checkUserLike(postId, userId);
      setHasLiked(userHasLiked);
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [postId]);

  const handleAddComment = async () => {
    if (commentText.trim()) {
      try {
        const userId = await getUserId();
        const newComment = await addComment(postId, userId, commentText);
        const savedProfileName = await AsyncStorage.getItem('profile_name');
        const savedProfileImageUri = await AsyncStorage.getItem('profile_image');
        const formattedComment = {
          ...newComment,
          user: {
            name: savedProfileName || 'Anonymous',
            avatar: savedProfileImageUri || 'https://via.placeholder.com/150'
          }
        };
        
        setPost(prev => ({
          ...prev,
          comments: [...(prev.comments || []), formattedComment]
        }));
        
        setCommentText('');
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    }
  };

  const handleLike = async () => {
    try {
      const userId = await getUserId();
      setHasLiked(!hasLiked);
      setLikeCount(prevCount => hasLiked ? prevCount - 1 : prevCount + 1);
      await toggleLike(postId, userId);
      const updatedLikeCount = await getLikeCount(postId);
      setLikeCount(updatedLikeCount);

      const userLikeStatus = await checkUserLike(postId, userId);
      setHasLiked(userLikeStatus);
    } catch (error) {
      console.error('Error toggling like:', error);
      const userId = await getUserId();
      const userLikeStatus = await checkUserLike(postId, userId);
      setHasLiked(userLikeStatus);
      setLikeCount(await getLikeCount(postId));
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentCard}>
      <Image 
        source={{
          uri: item.user?.avatar || 
               `${API_ENDPOINT}/storage/buckets/profile_images/files/default_avatar/view?project=${PROJECT_ID}`
        }} 
        style={styles.commentAvatar}
        defaultSource={DEFAULT_AVATAR} 
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentAuthor}>{item.user?.name || 'Anonymous'}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#05907A" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Post Content */}
        <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Image 
            source={{
              uri: post.user?.avatar || 
                  `${API_ENDPOINT}/storage/buckets/profile_images/files/default_avatar/view?project=${PROJECT_ID}`
            }} 
            style={styles.avatar} 
            defaultSource={DEFAULT_AVATAR}
          />
          <Text style={styles.username}>{post.user?.name || 'Unknown User'}</Text>
        </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.imageId && (
            <Image
              source={{ uri: getPostImageUrl(post.imageId) }}
              style={styles.postImage}
              resizeMode="cover"
              defaultSource={require('../assets/image_placeholder.png')}
              onError={(e) => console.log('Failed to load image:', e.nativeEvent.error)}
            />
          )}

          <View style={styles.postFooter}>
            <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
              <Ionicons 
                name={hasLiked ? "heart" : "heart-outline"} 
                size={24} 
                color={hasLiked ? "#e74c3c" : "#666"} 
              />
              <Text style={styles.likeCount}>{likeCount}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments List */}
        <Text style={styles.commentsTitle}>Comments ({post.comments?.length || 0})</Text>
        <FlatList
          data={post.comments || []}
          renderItem={renderComment}
          keyExtractor={(item) => item.$id || String(Math.random())}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
          }
        />
      </ScrollView>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity style={styles.commentButton} onPress={handleAddComment}>
          <Ionicons name="send" size={24} color="#05907A" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContent: {
    padding: 16,
  },
  postContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeCount: {
    color: '#333',
    fontWeight: '500',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  commentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  commentText: {
    color: '#666',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
  },
  commentButton: {
    padding: 8,
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
    fontStyle: 'italic',
  },
});

export default PostDetailScreen;