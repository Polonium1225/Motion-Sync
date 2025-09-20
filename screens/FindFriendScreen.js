import React, { useState, useEffect, useRef } from 'react';
import Colors from '../constants/Colors';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  BackHandler,
  Image,
  ImageBackground,
  StatusBar,
  SafeAreaView,
  Animated
} from 'react-native';
import { auth, userProfiles, conversations, getProfileImageUrl } from "../lib/SupabaseService";
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../assets/avatar.png');
const backgroundImage = require('../assets/sfgsdh.png');

export default function FindFriendScreen({ navigation }) {
  const [conversationsList, setConversationsList] = useState([]);
  const [users, setUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const isFocused = useIsFocused();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Initialize animations
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
      }),
      Animated.timing(searchAnim, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('MainTabs', { screen: 'Community' });
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Load conversations and users
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get current user from Supabase
        const user = await auth.getCurrentUser();
        if (!user) {
          throw new Error('No authenticated user found');
        }
        
        setCurrentUserId(user.id);
        
        // Get user conversations from Supabase
        const userConversations = await conversations.getUserConversations(user.id);
        
        // Get participant IDs and fetch their profiles
        const userIds = new Set();
        userConversations.forEach(conv => {
          if (conv.participant1 !== user.id) userIds.add(conv.participant1);
          if (conv.participant2 !== user.id) userIds.add(conv.participant2);
        });
    
        const userMap = {};
        await Promise.all(Array.from(userIds).map(async userId => {
          try {
            const profile = await userProfiles.getProfileByUserId(userId);
            let avatarUrl = DEFAULT_AVATAR;
            
            // Handle Supabase avatar URLs
            if (profile.avatar) {
              const profileImageUrl = getProfileImageUrl(profile.avatar);
              if (profileImageUrl) {
                avatarUrl = profileImageUrl;
              }
            }
            
            userMap[userId] = {
              id: userId, // Supabase uses 'id' instead of '$id'
              name: profile.name,
              avatar: avatarUrl,
              status: profile.status || 'offline'
            };
            console.log(`Loaded user ${userId} with status: ${profile.status || 'offline'}`);
          } catch (err) {
            console.error(`Error loading profile for ${userId}:`, err);
            userMap[userId] = {
              id: userId,
              name: 'Unknown User',
              avatar: DEFAULT_AVATAR,
              status: 'offline'
            };
          }
        }));
    
        setUsers(userMap);
        
        // Transform conversations to match expected format
        const transformedConversations = userConversations.map(conv => ({
          id: conv.id, // Supabase uses 'id' instead of '$id'
          participant1: conv.participant1,
          participant2: conv.participant2,
          lastMessage: conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].content 
            : null,
          lastMessageAt: conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].created_at 
            : conv.created_at,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at
        }));
        
        setConversationsList(transformedConversations);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load conversations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isFocused) loadData();
  }, [isFocused]);

  // Optimized status updates with better error handling
  useEffect(() => {
    if (!currentUserId) return;

    const updateStatuses = async () => {
      try {
        const userIds = conversationsList.flatMap(conv => [
          conv.participant1,
          conv.participant2
        ].filter(id => id !== currentUserId));

        if (userIds.length === 0) return;

        const uniqueIds = [...new Set(userIds)];
        console.log('Updating statuses for users:', uniqueIds);
        
        await Promise.all(uniqueIds.map(async userId => {
          try {
            const profile = await userProfiles.getProfileByUserId(userId);
            const newStatus = profile.status || 'offline';
            
            setUsers(prev => {
              const currentStatus = prev[userId]?.status;
              if (currentStatus !== newStatus) {
                console.log(`User ${userId} status: ${currentStatus} -> ${newStatus}`);
                return {
                  ...prev,
                  [userId]: {
                    ...(prev[userId] || {}),
                    status: newStatus
                  }
                };
              }
              return prev;
            });
          } catch (err) {
            console.error(`Status update failed for ${userId}:`, err);
            // Set to offline if we can't fetch status
            setUsers(prev => ({
              ...prev,
              [userId]: {
                ...(prev[userId] || {}),
                status: 'offline'
              }
            }));
          }
        }));
      } catch (error) {
        console.error("Status update error:", error);
      }
    };

    // Initial status check
    updateStatuses();
    
    // Set up periodic updates every 5 seconds
    const interval = setInterval(updateStatuses, 5000);
    return () => clearInterval(interval);
  }, [conversationsList, currentUserId]);

  const getFilteredConversations = () => {
    if (!searchQuery) return conversationsList;
    
    return conversationsList.filter(conv => {
      const otherUserId = conv.participant1 === currentUserId ? conv.participant2 : conv.participant1;
      const user = users[otherUserId];
      if (!user) return false;
      
      return user.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const navigateToChat = (conversation) => {
    const friendId = conversation.participant1 === currentUserId 
      ? conversation.participant2 
      : conversation.participant1;
      
    const friend = users[friendId] || { name: "Unknown User" };
    
    console.log("[DEBUG] Navigating to Chat with params:", {
      friendId,
      friendName: friend.name,
      conversationId: conversation.id, // Use 'id' instead of '$id'
      actualFriendObject: friend
    });
    
    navigation.navigate('Chat', {
      friendId: friendId,
      friendName: friend.name,
      conversationId: conversation.id // Use 'id' instead of '$id'
    });
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

  const formatLastMessageTime = (lastMessageAt) => {
    if (!lastMessageAt) return '';
    
    const date = new Date(lastMessageAt);
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

  const renderConversationItem = ({ item, index }) => {
    const friendId = item.participant1 === currentUserId ? item.participant2 : item.participant1;
    const friend = users[friendId] || { 
      name: "Unknown User", 
      status: "offline", 
      avatar: DEFAULT_AVATAR 
    };
    
    return (
      <Animated.View
        style={[
          { 
            opacity: fadeAnim,
            transform: [{ 
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, index * 5]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.conversationCard}
          onPress={() => navigateToChat(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.conversationContent}>
            <View style={styles.avatarContainer}>
              <Image 
                source={typeof friend.avatar === 'string' ? { uri: friend.avatar } : friend.avatar}
                style={styles.avatarImage}
                defaultSource={DEFAULT_AVATAR}
              />
              <View style={[
                styles.statusIndicator,
                { backgroundColor: friend.status === 'online' ? '#00FF94' : '#9E9E9E' }
              ]} />
            </View>
            
            <View style={styles.conversationInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.timeText}>
                  {formatLastMessageTime(item.lastMessageAt)}
                </Text>
              </View>
              <View style={styles.messageRow}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || "Start a conversation"}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: friend.status === 'online' ? '#00FF94' : 'rgba(255, 255, 255, 0.3)' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: friend.status === 'online' ? 'white' : 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    {friend.status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const filteredConversations = getFilteredConversations();

  if (isLoading) {
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
            <Text style={styles.loadingText}>Loading conversations...</Text>
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
              onPress={() => navigation.navigate('MainTabs', { screen: 'Community' })}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Conversations</Text>
            <TouchableOpacity 
              style={styles.newChatButton}
              onPress={() => navigation.navigate('SearchFriends')}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <Animated.View 
            style={[
              styles.searchContainer,
              { 
                opacity: searchAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Conversations List */}
          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorContent}>
                <Ionicons name="warning-outline" size={48} color={Colors.primary} />
                <Text style={styles.errorTitle}>Connection Error</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setError(null);
                    // Trigger a reload by toggling the focused state effect
                    setIsLoading(true);
                  }}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : filteredConversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyContent}>
                <Ionicons 
                  name={searchQuery ? "search-outline" : "chatbubbles-outline"} 
                  size={64} 
                  color="rgba(255, 255, 255, 0.4)" 
                />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? "No Results Found" : "No Conversations Yet"}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery 
                    ? "Try adjusting your search terms" 
                    : "Start a new conversation to connect with friends"
                  }
                </Text>
                {!searchQuery && (
                  <TouchableOpacity 
                    style={styles.startChatButton}
                    onPress={() => navigation.navigate('SearchFriends')}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.startChatButtonText}>Start New Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `${filteredConversations.length} Results` : 'Recent Conversations'}
              </Text>
              <FlatList
                data={filteredConversations}
                keyExtractor={(item) => item.id.toString()} // Convert to string for safety
                renderItem={renderConversationItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

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
    marginTop: 20,
    marginBottom: 25,
    justifyContent: 'space-between',
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
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 25,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  conversationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    bottom: 0,
    right: 0,
  },
  conversationInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  friendName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardArrow: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
  },
  startChatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 15,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});