import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkUserLike, toggleLike, getLikeCount, getCommentsCount, getUserId } from '../lib/AppwriteService';
import { DATABASE_ID, COLLECTIONS } from '../lib/AppwriteService';
import DEFAULT_AVATAR from '../assets/avatar.png';
import Colors from '../constants/Colors';
import Fonts from '../constants/fonts';

// Add your Appwrite project ID and endpoint (should match AppwriteService.js)
const PROJECT_ID = '67d0bb27002cfc0b22d2'; // Replace with your actual project ID
const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; // Replace if different

const PostItem = ({ post, navigation, index = 0 }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const likeScale = useRef(new Animated.Value(1)).current;
  const heartBeat = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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
          onPress={() => navigation.navigate('PostDetail', {
            postId: post.$id,
            onGoBack: loadData
          })}
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
            onPress={() => navigation.navigate('PostDetail', {
              postId: post.$id,
              onGoBack: loadData
            })}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons 
                name="chatbubble-outline" 
                size={22} 
                color="rgba(255, 255, 255, 0.7)" 
              />
            </View>
            <Text style={styles.actionText}>{formatCount(commentCount)}</Text>
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
});

export default PostItem;