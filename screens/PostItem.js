import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Animated, TextInput, FlatList, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  likes,
  comments,
  posts,
  getUserId,
  getProfileImageUrl
} from '../lib/SupabaseService';
import DEFAULT_AVATAR from '../assets/avatar.png';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';

const PostItem = ({ post, navigation, index = 0, onPostUpdate }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  
  // Comment expansion state
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentsData, setCommentsData] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

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
      
      if (userId && post.id) {
        // Load like status and counts
        setIsLiked(await likes.checkUserLike(post.id, userId));
        setLikeCount(await likes.getLikeCount(post.id));
        setCommentCount(await comments.getCommentsCount(post.id));
      }

      // Load avatar URL using centralized helper
      if (post.user_profiles?.avatar && post.user_profiles.avatar !== 'avatar.png') {
        setLoadingAvatar(true);
        try {
          const url = getProfileImageUrl(post.user_profiles.avatar);
          console.log('Generated post avatar URL:', url);
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
    if (commentsData.length > 0) return; // Don't reload if already loaded
    
    try {
      setLoadingComments(true);
      const postData = await posts.getPostById(post.id);
      setCommentsData(postData.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [post.id]);

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
      const newLikeCount = await likes.toggleLike(post.id, userId);
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

  const handleMoreMenuPress = () => {
    setMoreMenuVisible(true);
  };

  const handleViewProfile = () => {
    setMoreMenuVisible(false);
    
    // Get the user ID from Supabase structure
    const postUserId = post.user_id || post.user_profiles?.user_id;
    
    console.log('Found userId:', postUserId, 'from Supabase post');
    
    if (!postUserId) {
      console.error('❌ No userId found in post object');
      Alert.alert('Error', 'Unable to find user profile. Post structure may be invalid.');
      return;
    }
    
    console.log('✅ Navigating to UserProfileScreen with userId:', postUserId);
    
    navigation.navigate('UserProfileScreen', {
      userId: postUserId,
      userName: post.user_profiles?.name || 'Unknown User',
      userAvatar: avatarUrl
    });
  };

  const handleSendMessage = () => {
    setMoreMenuVisible(false);
    navigation.navigate('Chat', {
      friendId: post.user_id,
      friendName: post.user_profiles?.name || 'Unknown User',
      conversationId: `new_${post.user_id}_${Date.now()}`
    });
  };

  const handleReportPost = () => {
    setMoreMenuVisible(false);
    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => Alert.alert('Reported', 'Thank you for reporting. We will review this post.') },
        { text: 'Inappropriate Content', onPress: () => Alert.alert('Reported', 'Thank you for reporting. We will review this post.') },
        { text: 'Harassment', onPress: () => Alert.alert('Reported', 'Thank you for reporting. We will review this post.') }
      ]
    );
  };

  const handleSharePost = () => {
    setMoreMenuVisible(false);
    Alert.alert('Share Post', 'Share functionality coming soon!');
  };

  const handleCopyLink = () => {
    setMoreMenuVisible(false);
    Alert.alert('Link Copied', 'Post link copied to clipboard!');
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setCommentLoading(true);
      const userId = await getUserId();
      const commentData = await comments.addComment(post.id, userId, newComment);
      
      if (commentData) {
        const newCommentWithUser = {
          ...commentData,
          created_at: new Date().toISOString(),
          user_profiles: commentData.user_profiles
        };
        
        setCommentsData(prev => [...prev, newCommentWithUser]);
        setCommentCount(prev => prev + 1);
        setNewComment('');
        
        // Trigger post update if callback provided
        if (onPostUpdate) {
          onPostUpdate();
        }
        
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

  // Simplified Avatar Component using centralized helper
  const CommentAvatar = ({ user, style }) => {
    const [currentImageUrl, setCurrentImageUrl] = useState(null);

    useEffect(() => {
      if (!user?.avatar || user.avatar === 'avatar.png') {
        setCurrentImageUrl(null);
        return;
      }

      // Use the centralized helper from SupabaseService
      const url = getProfileImageUrl(user.avatar);
      setCurrentImageUrl(url);
      console.log('Comment avatar URL generated:', url);
    }, [user?.avatar]);

    const handleImageError = () => {
      console.log('❌ Comment avatar failed, using default');
      setCurrentImageUrl(null);
    };

    const handleImageLoad = () => {
      console.log('✅ Comment avatar loaded successfully:', currentImageUrl);
    };

    return (
      <Image 
        source={currentImageUrl ? { uri: currentImageUrl } : DEFAULT_AVATAR}
        style={style}
        defaultSource={DEFAULT_AVATAR}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    );
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentContainer}>
      <CommentAvatar user={item.user_profiles} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.user_profiles?.name || 'Anonymous'}</Text>
          <Text style={styles.commentDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

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
                  console.log('Failed to load post avatar:', e.nativeEvent.error);
                  setAvatarUrl(null);
                }}
                onLoad={() => {
                  console.log('✅ Post avatar loaded successfully:', avatarUrl);
                }}
              />
            )}
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.username}>{post.user_profiles?.name || 'Unknown User'}</Text>
            <Text style={styles.timeStamp}>{getTimeAgo(post.created_at)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton} onPress={handleMoreMenuPress}>
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.content}>{post.content}</Text>
      </View>

      {/* Post Image */}
      {post.image_url && (
        <TouchableOpacity 
          style={styles.imageContainer}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Animated.View style={[{ transform: [{ scale: buttonScale }] }]}>
            <Image
              source={{ uri: post.image_url }}
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
            ) : commentsData.length > 0 ? (
              <FlatList
                data={commentsData}
                renderItem={renderComment}
                keyExtractor={item => item.id.toString()}
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

      {/* More Menu Modal */}
      <Modal
        visible={moreMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMoreMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setMoreMenuVisible(false)}
        >
          <View style={styles.moreMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleViewProfile}>
              <Ionicons name="person-outline" size={20} color="#fff" />
              <Text style={styles.menuItemText}>View Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleSendMessage}>
              <Ionicons name="chatbubble-outline" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Send Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleSharePost}>
              <Ionicons name="share-outline" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Share Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleCopyLink}>
              <Ionicons name="link-outline" size={20} color="#fff" />
              <Text style={styles.menuItemText}>Copy Link</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity style={[styles.menuItem, styles.reportItem]} onPress={handleReportPost}>
              <Ionicons name="flag-outline" size={20} color="#FF6B6B" />
              <Text style={[styles.menuItemText, styles.reportText]}>Report Post</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreMenu: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  reportItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  reportText: {
    color: '#FF6B6B',
  },
});

export default PostItem;