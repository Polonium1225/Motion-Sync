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
  Animated,
  Alert,
  Modal
} from 'react-native';
import { account, getUserConversations, databases, DATABASE_ID, Query, userProfiles, COLLECTIONS } from "../lib/AppwriteService";
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../assets/avatar.png');
const PROJECT_ID = '67d0bb27002cfc0b22d2'; 
const API_ENDPOINT = 'https://cloud.appwrite.io/v1';
const backgroundImage = require('../assets/sfgsdh.png');

export default function FindFriendScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [deletingConversations, setDeletingConversations] = useState(new Set());
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [lastDeleteTime, setLastDeleteTime] = useState(0); // Track last deletion
  const isFocused = useIsFocused();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

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
      // Don't reload if we just deleted something (within 5 seconds)
      const timeSinceLastDelete = Date.now() - lastDeleteTime;
      if (timeSinceLastDelete < 5000) {
        console.log('⏳ Skipping reload - recent deletion detected');
        return;
      }

      try {
        setIsLoading(true);
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        console.log('📥 Loading conversations from database...');
        const userConversations = await getUserConversations(user.$id);
        console.log(`📥 Loaded ${userConversations.length} conversations`);
        
        // Get participant IDs and fetch their profiles
        const userIds = new Set();
        userConversations.forEach(conv => {
          if (conv.participant1 !== user.$id) userIds.add(conv.participant1);
          if (conv.participant2 !== user.$id) userIds.add(conv.participant2);
        });
    
        const userMap = {};
        await Promise.all(Array.from(userIds).map(async userId => {
          try {
            const profile = await userProfiles.getProfileByUserId(userId);
            let avatarUrl = DEFAULT_AVATAR;
            
            if (profile.avatar) {
              // Create direct download URL
              avatarUrl = `${API_ENDPOINT}/storage/buckets/profile_images/files/${profile.avatar}/view?project=${PROJECT_ID}`;
            }
            
            userMap[userId] = {
              $id: userId,
              name: profile.name,
              avatar: avatarUrl,
              status: profile.status || 'offline'
            };
            console.log(`Loaded user ${userId} with status: ${profile.status || 'offline'}`);
          } catch (err) {
            console.error(`Error loading profile for ${userId}:`, err);
            userMap[userId] = {
              $id: userId,
              name: 'Unknown User',
              avatar: DEFAULT_AVATAR,
              status: 'offline'
            };
          }
        }));
    
        setUsers(userMap);
        setConversations(userConversations);
        console.log('📥 Data loading completed');
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load conversations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isFocused) {
      console.log('👁️ Screen focused, checking if reload needed...');
      loadData();
    }
  }, [isFocused, lastDeleteTime]);

  // Optimized status updates with better error handling
  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return;

    const updateStatuses = async () => {
      try {
        const userIds = conversations.flatMap(conv => [
          conv.participant1,
          conv.participant2
        ].filter(id => id !== currentUserId));

        if (userIds.length === 0) return;

        const uniqueIds = [...new Set(userIds)];
        console.log('🔄 Updating statuses for users:', uniqueIds);
        
        await Promise.all(uniqueIds.map(async userId => {
          try {
            const profile = await userProfiles.getProfileByUserId(userId);
            const newStatus = profile.status || 'offline';
            
            setUsers(prev => {
              const currentStatus = prev[userId]?.status;
              if (currentStatus !== newStatus) {
                console.log(`🔄 User ${userId} status: ${currentStatus} -> ${newStatus}`);
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
  }, [conversations, currentUserId]); // Updated dependency

  const getFilteredConversations = () => {
    if (!searchQuery) return conversations;
    
    return conversations.filter(conv => {
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
      conversationId: conversation.$id,
      actualFriendObject: friend
    });
    
    navigation.navigate('Chat', {
      friendId: friendId,
      friendName: friend.name,
      conversationId: conversation.$id
    });
  };

  // Add the missing handleForceRefresh function
  const handleForceRefresh = async () => {
    console.log('🔄 Force refresh triggered');
    setIsLoading(true);
    setLastDeleteTime(0); // Reset delete time to allow immediate reload
    
    try {
      const user = await account.get();
      setCurrentUserId(user.$id);
      
      console.log('📥 Force loading conversations from database...');
      const userConversations = await getUserConversations(user.$id);
      console.log(`📥 Force loaded ${userConversations.length} conversations`);
      
      // Get participant IDs and fetch their profiles
      const userIds = new Set();
      userConversations.forEach(conv => {
        if (conv.participant1 !== user.$id) userIds.add(conv.participant1);
        if (conv.participant2 !== user.$id) userIds.add(conv.participant2);
      });

      const userMap = {};
      await Promise.all(Array.from(userIds).map(async userId => {
        try {
          const profile = await userProfiles.getProfileByUserId(userId);
          let avatarUrl = DEFAULT_AVATAR;
          
          if (profile.avatar) {
            // Create direct download URL
            avatarUrl = `${API_ENDPOINT}/storage/buckets/profile_images/files/${profile.avatar}/view?project=${PROJECT_ID}`;
          }
          
          userMap[userId] = {
            $id: userId,
            name: profile.name,
            avatar: avatarUrl,
            status: profile.status || 'offline'
          };
        } catch (err) {
          console.error(`Error loading profile for ${userId}:`, err);
          userMap[userId] = {
            $id: userId,
            name: 'Unknown User',
            avatar: DEFAULT_AVATAR,
            status: 'offline'
          };
        }
      }));

      setUsers(userMap);
      setConversations(userConversations);
      setError(null); // Clear any previous errors
      console.log('📥 Force refresh completed');
    } catch (err) {
      console.error("Error during force refresh:", err);
      setError("Failed to refresh conversations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async () => {
    if (!selectedConversation || !selectedFriend) return;
    
    const conversationId = selectedConversation.$id;
    
    try {
      setDeletingConversations(prev => new Set([...prev, conversationId]));
      setShowDeleteModal(false);
      
      console.log('🗑️ Starting deletion for conversation:', conversationId);
      
      // Delete all messages in the conversation first
      const messagesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [Query.equal('conversationId', conversationId)]
      );

      console.log(`🗑️ Found ${messagesResponse.documents.length} messages to delete`);

      // Delete messages in batches
      await Promise.all(
        messagesResponse.documents.map(async message => {
          console.log('🗑️ Deleting message:', message.$id);
          return databases.deleteDocument(DATABASE_ID, COLLECTIONS.MESSAGES, message.$id);
        })
      );

      console.log('🗑️ All messages deleted, now deleting conversation');

      // Delete the conversation
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CONVERSATIONS, conversationId);

      console.log('🗑️ Conversation deleted from database');

      // Update local state - remove the conversation
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.filter(conv => conv.$id !== conversationId);
        console.log(`🗑️ Updated conversations: ${prevConversations.length} -> ${updatedConversations.length}`);
        console.log('🗑️ Removed conversation:', conversationId);
        return updatedConversations;
      });

      // Also remove from users if no other conversations exist with this user
      const friendId = selectedConversation.participant1 === currentUserId 
        ? selectedConversation.participant2 
        : selectedConversation.participant1;

      setUsers(prevUsers => {
        // Check if there are other conversations with this user
        const hasOtherConversations = conversations.some(conv => 
          conv.$id !== conversationId && 
          (conv.participant1 === friendId || conv.participant2 === friendId)
        );

        if (!hasOtherConversations) {
          console.log('🗑️ Removing user from users list:', friendId);
          const updatedUsers = { ...prevUsers };
          delete updatedUsers[friendId];
          return updatedUsers;
        }

        return prevUsers;
      });

      console.log('🗑️ Deletion completed successfully');
      setLastDeleteTime(Date.now()); // Mark deletion time to prevent immediate reload
      
      // Show a brief success message without an alert dialog
      console.log(`✅ Conversation with ${selectedFriend.name} has been deleted`);
      
      // You could add a toast notification here instead of Alert.alert
      Alert.alert('Success', `Conversation with ${selectedFriend.name} deleted successfully`);
      
    } catch (error) {
      console.error('🗑️ Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
      
      // Revert the conversation back to the list on error
      setConversations(prevConversations => {
        if (!prevConversations.find(conv => conv.$id === conversationId)) {
          console.log('🗑️ Reverting conversation back to list');
          return [...prevConversations, selectedConversation];
        }
        return prevConversations;
      });
    } finally {
      setDeletingConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
      setSelectedConversation(null);
      setSelectedFriend(null);
    }
  };

  const handleLongPress = (conversation) => {
    const friendId = conversation.participant1 === currentUserId 
      ? conversation.participant2 
      : conversation.participant1;
    const friend = users[friendId] || { name: "Unknown User" };

    setSelectedConversation(conversation);
    setSelectedFriend(friend);
    setShowOptionsModal(true);
    
    // Animate modal in
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeOptionsModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowOptionsModal(false);
      setSelectedConversation(null);
      setSelectedFriend(null);
    });
  };

  const openDeleteModal = () => {
    setShowOptionsModal(false);
    setShowDeleteModal(true);
    
    // Reset and animate delete modal
    modalScale.setValue(0.8);
    modalOpacity.setValue(0);
    
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeDeleteModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowDeleteModal(false);
      setSelectedConversation(null);
      setSelectedFriend(null);
    });
  };

  const handleOpenChat = () => {
    if (selectedConversation) {
      closeOptionsModal();
      navigateToChat(selectedConversation);
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
    
    const isDeleting = deletingConversations.has(item.$id);
    
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
          style={[
            styles.conversationCard,
            isDeleting && styles.deletingCard
          ]}
          onPress={() => navigateToChat(item)}
          onLongPress={() => handleLongPress(item)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isDeleting}
        >
          <View style={styles.conversationContent}>
            <View style={styles.avatarContainer}>
              <Image 
                source={typeof friend.avatar === 'string' ? { uri: friend.avatar } : friend.avatar}
                style={[styles.avatarImage, isDeleting && styles.deletingAvatar]}
                defaultSource={DEFAULT_AVATAR}
              />
              <View style={[
                styles.statusIndicator,
                { backgroundColor: friend.status === 'online' ? '#00FF94' : '#9E9E9E' }
              ]} />
            </View>
            
            <View style={styles.conversationInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.friendName, isDeleting && styles.deletingText]}>
                  {friend.name}
                </Text>
                <Text style={[styles.timeText, isDeleting && styles.deletingText]}>
                  {formatLastMessageTime(item.lastMessageAt)}
                </Text>
              </View>
              <View style={styles.messageRow}>
                <Text style={[styles.lastMessage, isDeleting && styles.deletingText]} numberOfLines={1}>
                  {isDeleting ? "Deleting conversation..." : (item.lastMessage || "Start a conversation")}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: friend.status === 'online' ? '#00FF94' : 'rgba(255, 255, 255, 0.3)' },
                  isDeleting && styles.deletingBadge
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
            {isDeleting ? (
              <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.6)" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
            )}
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

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              💡 Tap to open chat • Long press for options
            </Text>
          </View>

          {/* Conversations List */}
          {error ? (
            <View style={styles.errorContainer}>
              <View style={styles.errorContent}>
                <Ionicons name="warning-outline" size={48} color={Colors.primary} />
                <Text style={styles.errorTitle}>Connection Error</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={handleForceRefresh}
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
                keyExtractor={(item) => item.$id}
                renderItem={renderConversationItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshing={isLoading}
                onRefresh={handleForceRefresh}
                ListEmptyComponent={() => (
                  <View style={styles.emptyListMessage}>
                    <Text style={styles.emptyListText}>
                      {searchQuery ? 'No matching conversations' : 'Pull down to refresh'}
                    </Text>
                  </View>
                )}
              />
            </View>
          )}
        </Animated.View>

        {/* Options Modal */}
        <Modal
          visible={showOptionsModal}
          transparent={true}
          animationType="none"
          onRequestClose={closeOptionsModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeOptionsModal}
            />
            <Animated.View
              style={[
                styles.optionsModal,
                {
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }]
                }
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalUserInfo}>
                    {selectedFriend && (
                      <>
                        <Image 
                          source={typeof selectedFriend.avatar === 'string' ? { uri: selectedFriend.avatar } : selectedFriend.avatar}
                          style={styles.modalAvatar}
                          defaultSource={DEFAULT_AVATAR}
                        />
                        <View>
                          <Text style={styles.modalUserName}>{selectedFriend.name}</Text>
                          <Text style={styles.modalSubtitle}>Conversation Options</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Modal Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalActionButton}
                    onPress={handleOpenChat}
                  >
                    <View style={styles.modalActionIcon}>
                      <Ionicons name="chatbubble-outline" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.modalActionText}>
                      <Text style={styles.modalActionTitle}>Open Chat</Text>
                      <Text style={styles.modalActionSubtitle}>Continue conversation</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" />
                  </TouchableOpacity>

                  <View style={styles.modalDivider} />

                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.deleteActionButton]}
                    onPress={openDeleteModal}
                  >
                    <View style={[styles.modalActionIcon, styles.deleteActionIcon]}>
                      <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                    </View>
                    <View style={styles.modalActionText}>
                      <Text style={[styles.modalActionTitle, styles.deleteActionTitle]}>Delete Conversation</Text>
                      <Text style={styles.modalActionSubtitle}>Remove all messages</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 107, 107, 0.6)" />
                  </TouchableOpacity>
                </View>

                {/* Cancel Button */}
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={closeOptionsModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="none"
          onRequestClose={closeDeleteModal}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeDeleteModal}
            />
            <Animated.View
              style={[
                styles.deleteModal,
                {
                  opacity: modalOpacity,
                  transform: [{ scale: modalScale }]
                }
              ]}
            >
              <TouchableOpacity activeOpacity={1}>
                {/* Warning Icon */}
                <View style={styles.deleteModalHeader}>
                  <View style={styles.warningIconContainer}>
                    <Ionicons name="warning" size={48} color="#FF6B6B" />
                  </View>
                  <Text style={styles.deleteModalTitle}>Delete Conversation</Text>
                  <Text style={styles.deleteModalMessage}>
                    Are you sure you want to delete your conversation with{' '}
                    <Text style={styles.deleteModalUserName}>{selectedFriend?.name}</Text>?
                  </Text>
                  <Text style={styles.deleteModalWarning}>
                    This action cannot be undone. All messages will be permanently deleted.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.deleteModalActions}>
                  <TouchableOpacity 
                    style={styles.deleteModalCancelButton}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.deleteModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteModalConfirmButton}
                    onPress={deleteConversation}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteModalConfirmText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
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
    marginBottom: 15,
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
  instructionsContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    overflow: 'hidden',
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
  deletingCard: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  deletingAvatar: {
    opacity: 0.5,
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
  deletingText: {
    color: 'rgba(255, 255, 255, 0.5)',
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
  deletingBadge: {
    opacity: 0.5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Much darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backdropFilter: 'blur(10px)', // Blur effect (iOS)
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  optionsModal: {
    backgroundColor: 'rgba(20, 25, 35, 0.95)', // Darker, more opaque background
    borderRadius: 20,
    width: '90%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
    // Add backdrop blur for better separation
    backdropFilter: 'blur(20px)',
  },
  modalHeader: {
    padding: 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalActions: {
    padding: 20,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
  },
  deleteActionButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  modalActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  deleteActionIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  modalActionText: {
    flex: 1,
  },
  modalActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  deleteActionTitle: {
    color: '#FF6B6B',
  },
  modalActionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 5,
  },
  modalCancelButton: {
    marginTop: 10,
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deleteModal: {
    backgroundColor: 'rgba(25, 20, 20, 0.95)', // Darker background with red tint
    borderRadius: 20,
    width: '90%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
    backdropFilter: 'blur(20px)',
  },
  deleteModalHeader: {
    padding: 30,
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 15,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  deleteModalUserName: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  deleteModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  emptyListMessage: {
    padding: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});