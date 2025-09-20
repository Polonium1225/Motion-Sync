import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  SafeAreaView, 
  Animated, 
  Alert,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, userProfiles, posts, likes, comments, conversations, getProfileImageUrl, storage } from '../lib/SupabaseService';
import Colors from '../constants/Colors';
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import backgroundImage from '../assets/sfgsdh.png';

const DEFAULT_AVATAR = require('../assets/avatar.png');

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, userName, userAvatar } = route.params;
  
  const [user, setUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  useEffect(() => {
    console.log('UserProfileScreen params:', { userId, userName, userAvatar });
    
    if (!userId) {
      console.error('No userId provided to UserProfileScreen');
      Alert.alert('Error', 'Invalid user profile');
      navigation.goBack();
      return;
    }
    
    loadCurrentUser();
    loadUserProfile();
    loadUserPosts();
    checkIfFollowing();
    loadAvatarUrl();
  }, [userId, userAvatar]);

  const loadCurrentUser = async () => {
    try {
      const user = await auth.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadAvatarUrl = async () => {
    if (!userAvatar) {
      setAvatarUrl(null);
      return;
    }

    setAvatarLoading(true);
    
    try {
      // If it's already a full URL, use it directly
      if (typeof userAvatar === 'string' && userAvatar.startsWith('http')) {
        setAvatarUrl(userAvatar);
      } else {
        // Use the helper function from SupabaseService
        const profileUrl = getProfileImageUrl(userAvatar);
        setAvatarUrl(profileUrl);
      }
    } catch (error) {
      console.log('Error loading avatar:', error);
      setAvatarUrl(null);
    } finally {
      setAvatarLoading(false);
    }
  };

  const loadUserProfile = async () => {
    if (!userId) {
      console.error('Invalid userId for loading profile:', userId);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load user profile from Supabase
      const profile = await userProfiles.getProfileByUserId(userId);
      
      const userData = {
        id: userId, // Supabase uses 'id' instead of '$id'
        name: profile.name || userName,
        avatar: profile.avatar,
        bio: profile.bio || 'Fitness enthusiast and workout lover! 💪',
        location: profile.location || null,
        joinedDate: profile.created_at || new Date().toISOString()
      };

      setUser(userData);
      
      // Load stats - you'll need to create these tables in Supabase if you want follower functionality
      await loadUserStats(userId);

    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Fallback to navigation params
      const userData = {
        id: userId,
        name: userName,
        avatar: userAvatar,
        bio: 'Fitness enthusiast and workout lover! 💪',
        location: null,
        joinedDate: new Date().toISOString()
      };
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId) => {
    try {
      // Get posts count by fetching user's posts
      const userPostsResponse = await posts.getPostsWithUsers();
      const userPostsCount = userPostsResponse.filter(post => 
        post.user_id === userId || post.user_profiles?.user_id === userId
      ).length;
      
      setStats(prev => ({
        ...prev,
        postsCount: userPostsCount,
        // For now, set follower counts to 0 since we don't have a follows table yet
        followersCount: 0,
        followingCount: 0
      }));
    } catch (error) {
      console.log('Error loading stats:', error);
      setStats(prev => ({
        ...prev,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0
      }));
    }
  };

  const loadUserPosts = async () => {
    if (!userId) {
      console.error('Invalid userId for loading posts:', userId);
      setPostsLoading(false);
      return;
    }

    try {
      setPostsLoading(true);
      console.log('Loading posts for user:', userId);
      
      // Get all posts and filter by user
      const allPosts = await posts.getPostsWithUsers();
      
      // Filter posts by this specific user
      const filteredPosts = allPosts.filter(post => {
        // Handle both direct user_id and nested user_profiles structure
        return post.user_id === userId || post.user_profiles?.user_id === userId;
      });
      
      console.log('Posts found for user:', filteredPosts.length);
      
      if (filteredPosts.length === 0) {
        console.log('No posts found for user:', userId);
        setUserPosts([]);
        return;
      }
      
      // Transform posts to include like and comment counts (they should already be included from getPostsWithUsers)
      const postsWithCounts = await Promise.all(
        filteredPosts.map(async (post) => {
          try {
            // Get additional counts if not already included
            let likeCount = post.likes?.count || 0;
            let commentCount = post.comments?.count || 0;
            
            // If counts aren't included, fetch them separately
            if (typeof likeCount !== 'number') {
              likeCount = await likes.getLikeCount(post.id);
            }
            
            if (typeof commentCount !== 'number') {
              commentCount = await comments.getCommentsCount(post.id);
            }

            return {
              ...post,
              likes: likeCount,
              comments: commentCount
            };
          } catch (error) {
            console.log('Error loading counts for post:', post.id, error);
            return {
              ...post,
              likes: 0,
              comments: 0
            };
          }
        })
      );

      console.log('Posts with counts:', postsWithCounts.length);
      setUserPosts(postsWithCounts);

    } catch (error) {
      console.error('Error loading user posts:', error);
      Alert.alert('Error', 'Failed to load user posts');
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const checkIfFollowing = async () => {
    try {
      // For now, set to false since we don't have a follows system yet
      // You can implement this later with a follows table
      setIsFollowing(false);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleMessage = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to send messages');
        return;
      }

      // Check if conversation already exists
      const existingConversations = await conversations.getUserConversations(currentUser.id);
      const existingConversation = existingConversations.find(conv => 
        (conv.participant1 === currentUser.id && conv.participant2 === userId) ||
        (conv.participant1 === userId && conv.participant2 === currentUser.id)
      );

      let conversationId;
      
      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const newConversation = await conversations.createConversation(currentUser.id, userId);
        conversationId = newConversation.id;
      }

      // Navigate to Chat screen
      navigation.navigate('Chat', {
        friendId: userId,
        friendName: user?.name || userName,
        conversationId: conversationId
      });
    } catch (error) {
      console.error('Error handling message:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleFollowToggle = async () => {
    // Since we don't have a follows system implemented yet, show a message
    Alert.alert('Coming Soon', 'Follow functionality will be available soon!');
    return;

    // Future implementation would look like this:
    /*
    try {
      setFollowLoading(true);
      
      if (isFollowing) {
        // await unfollowUser(userId);
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
        Alert.alert('Unfollowed', `You are no longer following ${userName}`);
      } else {
        // await followUser(userId);
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
        Alert.alert('Following', `You are now following ${userName}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
    */
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getTimeAgo = (createdAt) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const StatItem = ({ number, label }) => (
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const PostItem = ({ item }) => {
    // Handle image URL for Supabase
    const getImageUrl = (imageUrl) => {
      if (!imageUrl) return null;
      if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
        return imageUrl;
      }
      // Use storage helper to get public URL
      return storage.getPublicUrl('images', imageUrl);
    };

    const imageUrl = getImageUrl(item.image_url || item.image);

    return (
      <TouchableOpacity 
        style={styles.postItem}
        onPress={() => {
          // Navigate to post detail if you have that screen
          // navigation.navigate('PostDetail', { postId: item.id });
        }}
      >
        {imageUrl && (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.postImage}
            onError={(e) => console.log('Post image failed to load:', e.nativeEvent.error)}
          />
        )}
        <View style={styles.postContent}>
          <Text style={styles.postText} numberOfLines={3}>{item.content}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postDate}>{getTimeAgo(item.created_at)}</Text>
            <View style={styles.postStats}>
              <View style={styles.postStatItem}>
                <Ionicons name="heart" size={14} color="#FF6B6B" />
                <Text style={styles.postStatText}>{item.likes || 0}</Text>
              </View>
              <View style={styles.postStatItem}>
                <Ionicons name="chatbubble" size={14} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.postStatText}>{item.comments || 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <View style={styles.overlay}>
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
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{user?.name}</Text>
              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  {avatarLoading ? (
                    <View style={styles.avatarPlaceholder}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                  ) : (
                    <Image
                      source={avatarUrl ? { uri: avatarUrl } : DEFAULT_AVATAR}
                      style={styles.avatar}
                      defaultSource={DEFAULT_AVATAR}
                      onError={(e) => {
                        console.log('Avatar failed to load:', e.nativeEvent.error);
                        setAvatarUrl(null);
                      }}
                      onLoad={() => {
                        console.log('✅ Avatar loaded successfully:', avatarUrl);
                      }}
                    />
                  )}
                  <View style={styles.onlineIndicator} />
                </View>

                <Text style={styles.userName}>{user?.name}</Text>
                
                {user?.bio && (
                  <Text style={styles.userBio}>{user.bio}</Text>
                )}

                <View style={styles.userMetaInfo}>
                  {user?.location && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                      <Text style={styles.metaText}>{user.location}</Text>
                    </View>
                  )}
                  {user?.joinedDate && (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                      <Text style={styles.metaText}>Joined {formatDate(user.joinedDate)}</Text>
                    </View>
                  )}
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                  <StatItem number={stats.postsCount} label="Posts" />
                  <StatItem number={stats.followersCount} label="Followers" />
                  <StatItem number={stats.followingCount} label="Following" />
                </View>

                {/* Action Buttons - Only show if not viewing own profile */}
                {currentUser && currentUser.id !== userId && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.followButton, isFollowing && styles.followingButton]}
                      onPress={handleFollowToggle}
                      disabled={followLoading}
                    >
                      {followLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons 
                            name={isFollowing ? "checkmark" : "add"} 
                            size={18} 
                            color="#fff" 
                          />
                          <Text style={styles.followButtonText}>
                            {isFollowing ? 'Following' : 'Follow'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.messageButton}
                      onPress={handleMessage}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Posts Section */}
              <View style={styles.postsSection}>
                <Text style={styles.sectionTitle}>Recent Posts</Text>
                
                {postsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading posts...</Text>
                  </View>
                ) : userPosts.length > 0 ? (
                  <FlatList
                    data={userPosts}
                    renderItem={({ item }) => <PostItem item={item} />}
                    keyExtractor={item => item.id.toString()}
                    style={styles.postsList}
                    scrollEnabled={false}
                    refreshing={postsLoading}
                    onRefresh={() => {
                      loadUserPosts();
                      loadUserProfile();
                    }}
                  />
                ) : (
                  <View style={styles.noPostsContainer}>
                    <Ionicons name="document-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                    <Text style={styles.noPostsText}>No posts yet</Text>
                    <TouchableOpacity 
                      style={styles.refreshButton}
                      onPress={() => loadUserPosts()}
                    >
                      <Ionicons name="refresh" size={16} color={Colors.primary} />
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.bottomPadding} />
            </ScrollView>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00FF94',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  userMetaInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  followingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  messageButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  postsSection: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  postsList: {
    flex: 1,
  },
  postItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  postImage: {
    width: '100%',
    height: 150,
  },
  postContent: {
    padding: 16,
  },
  postText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  noPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPostsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});

export default UserProfileScreen;