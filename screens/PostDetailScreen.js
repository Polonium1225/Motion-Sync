import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  SafeAreaView, 
  StatusBar, 
  Animated,
  ScrollView
} from 'react-native';
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

const PostDetailScreen = ({ route, navigation }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const heartBeat = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const commentInputScale = useRef(new Animated.Value(1)).current;

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
  }, []);

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

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = ({ item, index }) => {
    return (
      <Animated.View
        style={[
          styles.commentContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, index * 2]
              })
            }]
          }
        ]}
      >
        <View style={styles.commentCard}>
          <View style={styles.commentHeader}>
            <View style={styles.commentUserInfo}>
              <View style={styles.commentAvatarContainer}>
                <Image 
                  source={item.user?.avatar ? { uri: item.user.avatar } : DEFAULT_AVATAR}
                  style={styles.commentAvatar}
                  defaultSource={DEFAULT_AVATAR}
                />
                <View style={styles.commentOnlineIndicator} />
              </View>
              <View style={styles.commentUserDetails}>
                <Text style={styles.commentAuthor}>{item.user?.name || 'Anonymous'}</Text>
                <Text style={styles.commentDate}>
                  {formatTimeAgo(item.$createdAt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.commentMoreButton}>
              <Ionicons name="ellipsis-horizontal" size={16} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
      </Animated.View>
    );
  };

  const handleLike = async () => {
    try {
      // Immediate visual feedback
      setIsLiked(!isLiked);
      
      // Heart animation
      Animated.sequence([
        Animated.timing(likeScale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(likeScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();

      // Heart beat animation for like
      if (!isLiked) {
        Animated.sequence([
          Animated.timing(heartBeat, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(heartBeat, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          })
        ]).start();
      }

      const userId = await getUserId();
      const newLikeCount = await toggleLike(postId, userId);
      setLikeCount(newLikeCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(isLiked);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    
    // Input animation feedback
    Animated.sequence([
      Animated.timing(commentInputScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(commentInputScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
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
            user: newComment.user
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

  const formatCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
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
            <Text style={styles.loadingText}>Loading post...</Text>
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post Details</Text>
            <TouchableOpacity style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Main Post */}
          <View style={styles.postContainer}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={post.user?.avatar ? { uri: post.user.avatar } : DEFAULT_AVATAR}
                    style={styles.avatar}
                    defaultSource={DEFAULT_AVATAR}
                  />
                  <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.username}>{post.user?.name || 'Unknown User'}</Text>
                  <Text style={styles.timeStamp}>{formatTimeAgo(post.$createdAt)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>
            
            {/* Post Content */}
            <View style={styles.contentContainer}>
              <Text style={styles.content}>{post.content}</Text>
            </View>
            
            {/* Post Image */}
            {post.imageUrl && (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: post.imageUrl }} 
                  style={styles.postImage} 
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="expand-outline" size={20} color="white" />
                </View>
              </View>
            )}
            
            {/* Post Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleLike}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <Animated.View 
                  style={[
                    styles.actionIconContainer,
                    { 
                      transform: [
                        { scale: likeScale },
                        { scale: isLiked ? heartBeat : 1 }
                      ] 
                    }
                  ]}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isLiked ? "#FF6B6B" : "rgba(255, 255, 255, 0.7)"} 
                  />
                </Animated.View>
                <Text style={[styles.actionText, isLiked && styles.likedText]}>
                  {formatCount(likeCount)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionIconContainer}>
                  <Ionicons 
                    name="chatbubble-outline" 
                    size={24} 
                    color="rgba(255, 255, 255, 0.7)" 
                  />
                </View>
                <Text style={styles.actionText}>
                  {formatCount(post.comments?.length || 0)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.actionIconContainer}>
                  <Ionicons 
                    name="share-outline" 
                    size={24} 
                    color="rgba(255, 255, 255, 0.7)" 
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List - Using FlatList as main scrollable component */}
          <FlatList
            data={post.comments || []}
            renderItem={renderComment}
            keyExtractor={item => item.$id}
            style={styles.commentsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={() => (
              <Text style={styles.commentsTitle}>
                Comments ({post.comments?.length || 0})
              </Text>
            )}
            ListEmptyComponent={() => (
              <View style={styles.noCommentsContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts!</Text>
              </View>
            )}
            contentContainerStyle={styles.commentsListContent}
          />

          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <Animated.View 
              style={[
                styles.commentInputWrapper,
                { transform: [{ scale: commentInputScale }] }
              ]}
            >
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  !comment.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleComment} 
                disabled={commentLoading || !comment.trim()}
              >
                {commentLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginLeft: 15,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FF94',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  timeStamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  moreButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
    padding: 6,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 4,
  },
  actionIconContainer: {
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  likedText: {
    color: '#FF6B6B',
  },
  commentsSection: {
    flex: 1,
    marginBottom: 10,
  },
  commentsList: {
    flexGrow: 0,
  },
  commentsListContent: {
    paddingBottom: 10,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  commentContainer: {
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentOnlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00FF94',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentUserDetails: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  commentDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  commentMoreButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  commentText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  noCommentsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  commentInputContainer: {
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    maxHeight: 80,
    paddingVertical: 8,
    paddingRight: 10,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default PostDetailScreen;