import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Alert, SafeAreaView, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { 
  getPostById, 
  addComment, 
  toggleLike, 
  checkUserLike, 
  getLikeCount,
  getUserId
} from '../lib/AppwriteService';
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
  }, [route.params?.onGoBack]); // Add dependency here

  useEffect(() => {
    const loadPost = async () => {
      try {
        const postData = await getPostById(postId);
        setPost(postData);
        
        const userId = await getUserId();
        setIsLiked(await checkUserLike(postId, userId));
        setLikeCount(await getLikeCount(postId));
      } catch (error) {
        console.error('Error loading post:', error);
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
          source={item.user?.avatar ? { uri: item.user.avatar } : DEFAULT_AVATAR}
          style={styles.commentAvatar}
          defaultSource={DEFAULT_AVATAR}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.user?.name || 'Anonymous'}</Text>
            <Text style={styles.commentDate}>
              {formatDate(item.$createdAt)}
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
      const newLikeCount = await toggleLike(postId, userId);
      setLikeCount(newLikeCount);
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    
    try {
      setCommentLoading(true);
      const userId = await getUserId();
      const newComment = await addComment(postId, userId, comment);
      
      if (newComment) {
        setPost(prev => ({
          ...prev,
          comments: [...prev.comments, {
            ...newComment,
            $createdAt: new Date().toISOString(),
            user: newComment.user // This now includes the avatar URL
          }]
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

  return (
    <ImageBackground source={backgroundImage} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={[styles.container, { paddingTop: 0, paddingBottom: 0 }]}> 
            <View style={styles.postContainer}>
            <View style={styles.header}>
              <Image 
                source={post.user?.avatar ? { uri: post.user.avatar } : DEFAULT_AVATAR}
                style={styles.avatar}
                defaultSource={DEFAULT_AVATAR}
              />
              <Text style={styles.username}>{post.user?.name}</Text>
            </View>
              
              <Text style={styles.content}>{post.content}</Text>
              
              {post.imageUrl && (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
              )}
              
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isLiked ? "#ff0000" : "#fff"} // Outline is now white
                  />
                  <Text style={styles.actionText}>{likeCount}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <FlatList
              data={post.comments}
              renderItem={renderComment}
              keyExtractor={item => item.$id}
              style={styles.commentsList}
            />
            
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#fff"
                value={comment}
                onChangeText={setComment}
              />
              <TouchableOpacity onPress={handleComment} disabled={commentLoading}>
                {commentLoading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="send" size={24} color="#007AFF" />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceDark,
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