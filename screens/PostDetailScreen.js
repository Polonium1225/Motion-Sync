import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert, SafeAreaView, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { 
  posts,
  comments,
  likes,
  getUserId
} from '../lib/SupabaseService'; // Updated import
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import backgroundImage from '../assets/sfgsdh.png';

const DEFAULT_AVATAR = require('../assets/avatar.png');

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    return () => {
      if (route.params?.onGoBack) {
        route.params.onGoBack();
      }
    };
  }, [route.params?.onGoBack]);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const postData = await posts.getPostById(postId);
        setPost(postData);
        
        const userId = await getUserId();
        if (userId) {
          setIsLiked(await likes.checkUserLike(postId, userId));
          setLikeCount(postData.likeCount || 0);
        }
      } catch (error) {
        console.error('Error loading post:', error);
        Alert.alert('Error', 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [postId]);

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

  const renderComment = ({ item }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
  
    return (
      <View style={styles.commentContainer}>
        <Image 
          source={item.user_profiles?.avatar ? { uri: item.user_profiles.avatar } : DEFAULT_AVATAR}
          style={styles.commentAvatar}
          defaultSource={DEFAULT_AVATAR}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>
              {item.user_profiles?.name || 'Anonymous'}
            </Text>
            <Text style={styles.commentDate}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const handleLike = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        Alert.alert('Error', 'Please login to like posts');
        return;
      }
      
      const newLikeCount = await likes.toggleLike(postId, userId);
      setLikeCount(newLikeCount);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    
    try {
      setCommentLoading(true);
      const userId = await getUserId();
      if (!userId) {
        Alert.alert('Error', 'Please login to comment');
        return;
      }
      
      const newComment = await comments.addComment(postId, userId, comment);
      
      if (newComment) {
        setPost(prev => ({
          ...prev,
          comments: [...(prev.comments || []), newComment]
        }));
        setComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading post...</Text>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={styles.loadingText}>Post not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.container, { paddingTop: 0, paddingBottom: 0 }]}> 
            <View style={styles.postContainer}>
              <View style={styles.header}>
                <Image 
                  source={post.user_profiles?.avatar ? { uri: post.user_profiles.avatar } : DEFAULT_AVATAR}
                  style={styles.avatar}
                  defaultSource={DEFAULT_AVATAR}
                />
                <Text style={styles.username}>
                  {post.user_profiles?.name || 'Anonymous'}
                </Text>
              </View>
              
              <Text style={styles.content}>{post.content}</Text>
              
              {post.image_url && (
                <Image source={{ uri: post.image_url }} style={styles.postImage} />
              )}
              
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isLiked ? "#ff0000" : "#fff"}
                  />
                  <Text style={styles.actionText}>{likeCount}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                  <Text style={styles.actionText}>
                    {post.comments?.length || 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <FlatList
              data={post.comments || []}
              renderItem={renderComment}
              keyExtractor={item => item.id.toString()}
              style={styles.commentsList}
              showsVerticalScrollIndicator={false}
            />
            
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity onPress={handleComment} disabled={commentLoading || !comment.trim()}>
                {commentLoading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons 
                    name="send" 
                    size={24} 
                    color={comment.trim() ? "#007AFF" : "#999"} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 15,
  },
  postContainer: {
    marginBottom: 20,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: Colors.textPrimary,
  },
  content: {
    marginBottom: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: 'bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  commentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  commentsList: {
    flex: 1,
    marginBottom: 10,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 15,
    paddingBottom: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceDark,
    maxHeight: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
});

export default PostDetailScreen;