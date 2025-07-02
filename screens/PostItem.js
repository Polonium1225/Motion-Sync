import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Animated, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkUserLike, toggleLike, getLikeCount, getCommentsCount, getUserId, getPostById, addComment } from '../lib/AppwriteService';
import { DATABASE_ID, COLLECTIONS } from '../lib/AppwriteService';
import DEFAULT_AVATAR from '../assets/avatar.png';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';

// Add your Appwrite project ID and endpoint (should match AppwriteService.js)
const PROJECT_ID = '67d0bb27002cfc0b22d2'; // Main project ID
const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; // Main endpoint

// Comment system seems to use different Appwrite instance
const COMMENT_PROJECT_ID = '685ebdb90007d578e80d'; // From comment avatar URLs
const COMMENT_API_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'; // From comment avatar URLs

const PostItem = ({ post, navigation, index = 0 }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  
  // Comment expansion state
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const heartBeat = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const commentsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered animation for posts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: index * 100, // Stagger effect
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 6,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const loadData = async () => {
    try {
      const userId = await getUserId();
      setIsLiked(await checkUserLike(post.$id, userId));
      setLikeCount(await getLikeCount(post.$id));
      setCommentCount(await getCommentsCount(post.$id));

      // Load avatar URL if available
      if (post.user?.avatar) {
        setLoadingAvatar(true);
        try {
          // Construct direct download URL for the avatar
          const url = `${API_ENDPOINT}/storage/buckets/profile_images/files/${post.user.avatar}/view?project=${PROJECT_ID}`;
          setAvatarUrl(url);
        } catch (error) {
          console.log('Error getting avatar URL:', error);
          setAvatarUrl(null);
        } finally {
          setLoadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('Error loading post data:', error);
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) return; // Don't reload if already loaded
    
    try {
      setLoadingComments(true);
      const postData = await getPostById(post.$id);
      setComments(postData.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [post.$id]);

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
      const newLikeCount = await toggleLike(post.$id, userId);
      setLikeCount(newLikeCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(isLiked);
    }
  };

  const handleCommentToggle = async () => {
    if (!commentsExpanded) {
      // Expanding comments
      setCommentsExpanded(true);
      await loadComments();
      
      Animated.timing(commentsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Collapsing comments
      Animated.timing(commentsOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCommentsExpanded(false);
      });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setCommentLoading(true);
      const userId = await getUserId();
      const commentData = await addComment(post.$id, userId, newComment);
      
      if (commentData) {
        const newCommentWithUser = {
          ...commentData,
          $createdAt: new Date().toISOString(),
          user: commentData.user
        };
        
        setComments(prev => [...prev, newCommentWithUser]);
        setCommentCount(prev => prev + 1);
        setNewComment('');
        
        // Show success feedback
        console.log('Comment added successfully');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setCommentLoading(false);
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

  const formatCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const getTimeAgo = (createdAt) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

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

  const [failedAvatars, setFailedAvatars] = useState(new Set());

  const renderComment = ({ item }) => {
    const getCommentAvatarUrl = (user) => {
      if (!user?.avatar) return null;
      
      // If avatar is already a full URL and hasn't failed before, use it
      if (typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
        // If this URL has failed before, try constructing with main project
        if (failedAvatars.has(user.avatar)) {
          // Extract file ID from the failed URL
          const fileIdMatch = user.avatar.match(/files\/([^\/]+)\//);
          if (fileIdMatch) {
            const fileId = fileIdMatch[1];
            return `${API_ENDPOINT}/storage/buckets/profile_images/files/${fileId}/view?project=${PROJECT_ID}`;
          }
        }
        return user.avatar;
      }
      
      // If it's just an ID, construct with main project
      return `${API_ENDPOINT}/storage/buckets/profile_images/files/${user.avatar}/view?project=${PROJECT_ID}`;
    };

    const avatarUrl = getCommentAvatarUrl(item.user);

    return (
      <View style={styles.commentContainer}>
        <Image 
          source={avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR}
          style={styles.commentAvatar}
          defaultSource={DEFAULT_AVATAR}
          onError={(e) => {
            console.log('❌ Comment avatar failed for URL:', avatarUrl);
            
            // Mark this URL as failed for future fallback
            if (item.user?.avatar && typeof item.user.avatar === 'string' && item.user.avatar.startsWith('http')) {
              setFailedAvatars(prev => new Set([...prev, item.user.avatar]));
            }
          }}
          onLoad={() => {
            console.log('✅ Comment avatar loaded successfully:', avatarUrl);
          }}
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

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {loadingAvatar ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <Image
                source={avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR}
                style={styles.avatar}
                defaultSource={DEFAULT_AVATAR}
                onError={(e) => {
                  console.log('Failed to load avatar:', e.nativeEvent.error);
                  setAvatarUrl(null);
                }}
              />
            )}
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.username}>{post.user?.name || 'Unknown User'}</Text>
            <Text style={styles.timeStamp}>{getTimeAgo(post.$createdAt)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.content}>{post.content}</Text>
      </View>

      {/* Post Image */}
      {post.imageUrl && (
        <TouchableOpacity 
          style={styles.imageContainer}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={[{ transform: [{ scale: buttonScale }] }]}>
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand-outline" size={24} color="white" />
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Footer Actions */}
      <View style={styles.footer}>
        <View style={styles.actionsRow}>
          {/* Like Button */}
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
                size={22}
                color={isLiked ? "#FF6B6B" : "rgba(255, 255, 255, 0.7)"}
              />
            </Animated.View>
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {formatCount(likeCount)}
            </Text>
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCommentToggle}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons 
                name={commentsExpanded ? "chatbubble" : "chatbubble-outline"} 
                size={22} 
                color={commentsExpanded ? Colors.primary : "rgba(255, 255, 255, 0.7)"} 
              />
            </View>
            <Text style={[styles.actionText, commentsExpanded && { color: Colors.primary }]}>
              {formatCount(commentCount)}
            </Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons 
                name="share-outline" 
                size={22} 
                color="rgba(255, 255, 255, 0.7)" 
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Engagement Stats */}
        {(likeCount > 0 || commentCount > 0) && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {likeCount > 0 && `${formatCount(likeCount)} ${likeCount === 1 ? 'like' : 'likes'}`}
              {likeCount > 0 && commentCount > 0 && ' • '}
              {commentCount > 0 && `${formatCount(commentCount)} ${commentCount === 1 ? 'comment' : 'comments'}`}
            </Text>
          </View>
        )}
      </View>

      {/* Comments Section */}
      {commentsExpanded && (
        <Animated.View 
          style={[
            styles.commentsSection,
            {
              opacity: commentsOpacity,
            }
          ]}
        >
          {/* Hide Comments Button */}
          <TouchableOpacity 
            style={styles.hideCommentsButton}
            onPress={handleCommentToggle}
          >
            <Ionicons name="chevron-up" size={20} color={Colors.primary} />
            <Text style={styles.hideCommentsText}>Hide Comments</Text>
          </TouchableOpacity>

          {/* Comments List */}
          <View style={styles.commentsContainer}>
            {loadingComments ? (
              <View style={styles.loadingCommentsContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingCommentsText}>Loading comments...</Text>
              </View>
            ) : comments.length > 0 ? (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={item => item.$id}
                style={styles.commentsList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              />
            ) : (
              <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
            )}
          </View>

          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              onPress={handleAddComment} 
              disabled={commentLoading || !newComment.trim()}
              style={[
                styles.sendButton,
                (!newComment.trim() || commentLoading) && styles.sendButtonDisabled
              ]}
            >
              {commentLoading ? (
                <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.5)" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={newComment.trim() ? Colors.primary : "rgba(255, 255, 255, 0.5)"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
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
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 15,
    lineHeight: 22,
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
    height: 280,
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  commentsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  hideCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  hideCommentsText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  commentsContainer: {
    flex: 1,
    maxHeight: 250,
  },
  loadingCommentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingCommentsText: {
    marginLeft: 10,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 13,
    color: Colors.textPrimary,
  },
  commentDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  commentText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  noCommentsText: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default PostItem;