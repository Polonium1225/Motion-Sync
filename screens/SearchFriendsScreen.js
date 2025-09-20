import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, SafeAreaView, StatusBar, Image, Animated
} from 'react-native';
import { 
  userProfiles,
  getUserId,
  supabase,
  conversations
} from "../lib/SupabaseService"; // Updated imports
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import backgroundImage from '../assets/sfgsdh.png';

const DEFAULT_AVATAR = require('../assets/avatar.png');

export default function SearchFriendsScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Load all user profiles
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const userId = await getUserId();
        
        if (!userId) {
          setError("Please log in to find friends");
          setIsLoading(false);
          return;
        }

        setCurrentUserId(userId);

        console.log("Fetching user profiles..."); // Debug log

        // Get all user profiles except current user
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, name, avatar, status')
          .neq('user_id', userId);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          setError("Couldn't load users. Please try again later.");
          return;
        }

        console.log("Received profiles:", profiles); // Debug log

        const mappedUsers = profiles.map(profile => {
          let avatarSource = DEFAULT_AVATAR;

          // If avatar is a URL (Supabase storage URL), use it directly
          if (profile.avatar) {
            if (profile.avatar.startsWith('http')) {
              avatarSource = { uri: profile.avatar };
            } else {
              // If it's a file path, construct the URL using your storage service
              // This depends on how your storage.getPublicUrl works
              try {
                const { data } = supabase.storage
                  .from('images')
                  .getPublicUrl(profile.avatar);
                avatarSource = { uri: data.publicUrl };
              } catch (storageError) {
                console.warn("Error getting avatar URL:", storageError);
                avatarSource = DEFAULT_AVATAR;
              }
            }
          }

          return {
            id: profile.user_id,
            name: profile.name || 'Unknown User',
            avatar: avatarSource,
            status: profile.status || 'offline'
          };
        });

        console.log("Mapped users:", mappedUsers); // Debug log
        setUsers(mappedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Couldn't load users. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Real-time status updates
  useEffect(() => {
    if (!currentUserId) return;

    const updateStatuses = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('user_profiles')
          .select('user_id, status')
          .neq('user_id', currentUserId);

        if (!error && profiles) {
          setUsers(prevUsers =>
            prevUsers.map(user => {
              const updatedUser = profiles.find(profile => profile.user_id === user.id);
              return updatedUser ? {...user, status: updatedUser.status} : user;
            })
          );
        }
      } catch (error) {
        console.error("Error updating statuses:", error);
      }
    };

    const interval = setInterval(updateStatuses, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, [currentUserId]);

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

  const renderUserItem = ({ item, index }) => {
    console.log("Rendering user:", item); // Debug log

    return (
      <Animated.View
        style={[
          { 
            opacity: fadeAnim,
            transform: [{ 
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, index * 3]
              })
            }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => startConversation(item.id, item.name)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.userContent}>
            <View style={styles.avatarContainer}>
              <Image
                source={item.avatar}
                style={styles.avatarImage}
                defaultSource={DEFAULT_AVATAR}
              />
              <View style={[
                styles.statusIndicator,
                {
                  backgroundColor: item.status === 'online' ? '#00FF94' : '#9E9E9E',
                }
              ]} />
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name || 'Unknown User'}
              </Text>
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'online' ? '#00FF94' : 'rgba(255, 255, 255, 0.3)' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: item.status === 'online' ? 'white' : 'rgba(255, 255, 255, 0.8)' }
                  ]}>
                    {item.status === 'online' ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.cardArrow}>
            <Ionicons name="chatbubble-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const startConversation = async (friendId, friendName) => {
    try {
      const existingConversation = await findExistingConversation(currentUserId, friendId);

      if (existingConversation) {
        navigation.navigate('Chat', {
          friendId,
          friendName,
          conversationId: existingConversation.id
        });
      } else {
        navigation.navigate('Chat', {
          friendId,
          friendName,
          conversationId: `new_${currentUserId}_${friendId}`
        });
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      // Still navigate even if there's an error - the chat screen can handle creating new conversation
      navigation.navigate('Chat', {
        friendId,
        friendName,
        conversationId: `new_${currentUserId}_${friendId}`
      });
    }
  };

  // Find if a conversation already exists between the two users
  const findExistingConversation = async (userId, friendId) => {
    try {
      console.log(`[DEBUG] Looking for conversation between ${userId} and ${friendId}`);

      // Check both possible participant combinations
      const { data: conversations1, error: error1 } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1', userId)
        .eq('participant2', friendId);

      if (conversations1 && conversations1.length > 0) {
        console.log("[DEBUG] Found existing conversation (1):", conversations1[0].id);
        return conversations1[0];
      }

      const { data: conversations2, error: error2 } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1', friendId)
        .eq('participant2', userId);

      if (conversations2 && conversations2.length > 0) {
        console.log("[DEBUG] Found existing conversation (2):", conversations2[0].id);
        return conversations2[0];
      }

      if (error1 || error2) {
        console.error("[DEBUG] Error finding existing conversation:", error1 || error2);
      }

      return null;
    } catch (error) {
      console.error("[DEBUG] Error finding existing conversation:", error);
      return null;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const refreshUsers = async () => {
    setError(null);
    await fetchUsers();
  };

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
            <Text style={styles.loadingText}>Finding friends...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (error) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={styles.errorContent}>
            <Ionicons name="warning-outline" size={48} color={Colors.primary} />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshUsers}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Find Friends</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={refreshUsers}
            >
              <Ionicons name="refresh" size={24} color="white" />
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
                placeholder="Search by name..."
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

          {/* Results Section */}
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `${filteredUsers.length} Results` : `${users.length} Available Users`}
              </Text>
              {users.length > 0 && (
                <Text style={styles.onlineCount}>
                  {users.filter(u => u.status === 'online').length} online
                </Text>
              )}
            </View>

            {filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyContent}>
                  <Ionicons 
                    name={searchQuery ? "search-outline" : "people-outline"} 
                    size={64} 
                    color="rgba(255, 255, 255, 0.4)" 
                  />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? "No Users Found" : "No Users Available"}
                  </Text>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? "Try adjusting your search terms" 
                      : "Check back later for new users to connect with"
                    }
                  </Text>
                  {searchQuery ? (
                    <TouchableOpacity 
                      style={styles.clearSearchButton}
                      onPress={() => setSearchQuery('')}
                    >
                      <Text style={styles.clearSearchButtonText}>Clear Search</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.clearSearchButton}
                      onPress={refreshUsers}
                    >
                      <Text style={styles.clearSearchButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshing={isLoading}
                onRefresh={refreshUsers}
              />
            )}
          </View>
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineCount: {
    color: '#00FF94',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  userCard: {
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
  userContent: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  clearSearchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  clearSearchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});