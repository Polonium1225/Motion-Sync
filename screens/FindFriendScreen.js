import React, { useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { account, getUserConversations, databases, DATABASE_ID, Query, userProfiles } from "../lib/AppwriteService";
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../assets/avatar.png');
const PROJECT_ID = '67d0bb27002cfc0b22d2'; 
const API_ENDPOINT = 'https://cloud.appwrite.io/v1';

export default function FindFriendScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const isFocused = useIsFocused();

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
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        const userConversations = await getUserConversations(user.$id);
        
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
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load conversations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (isFocused) loadData();
  }, [isFocused]);

  // Optimized status updates
  useEffect(() => {
    if (!currentUserId) return;

    const updateStatuses = async () => {
      try {
        const userIds = conversations.flatMap(conv => [
          conv.participant1,
          conv.participant2
        ].filter(id => id !== currentUserId));

        if (userIds.length === 0) return;

        const uniqueIds = [...new Set(userIds)];
        await Promise.all(uniqueIds.map(async userId => {
          try {
            const profile = await userProfiles.getProfileByUserId(userId);
            setUsers(prev => ({
              ...prev,
              [userId]: {
                ...(prev[userId] || {}),
                status: profile.status || 'offline'
              }
            }));
          } catch (err) {
            console.error(`Status update failed for ${userId}:`, err);
          }
        }));
      } catch (error) {
        console.error("Status update error:", error);
      }
    };

    const interval = setInterval(updateStatuses, 10000);
    return () => clearInterval(interval);
  }, [conversations, currentUserId]);

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
      actualFriendObject: friend // Show full friend object
    });
    
    navigation.navigate('Chat', {
      friendId: friendId,
      friendName: friend.name,
      conversationId: conversation.$id
    });
};

const renderConversationItem = ({ item }) => {
  const friendId = item.participant1 === currentUserId ? item.participant2 : item.participant1;
  const friend = users[friendId] || { 
    name: "Unknown User", 
    status: "offline", 
    avatar: DEFAULT_AVATAR 
  };
  
  return (
    <TouchableOpacity 
      style={styles.conversationItem}
      onPress={() => navigateToChat(item)}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={typeof friend.avatar === 'string' ? { uri: friend.avatar } : friend.avatar}
          style={styles.avatarImage}
          defaultSource={DEFAULT_AVATAR}
        />
        <View style={[
          styles.statusIndicator,
          { backgroundColor: friend.status === 'online' ? '#01CC97' : '#9E9E9E' }
        ]} />
      </View>
      
      <View style={styles.conversationInfo}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || "Start a conversation"}
        </Text>
      </View>
      
      <View style={styles.statusTextContainer}>
        <Text style={[
          styles.statusText,
          { color: friend.status === 'online' ? '#01CC97' : '#9E9E9E' }
        ]}>
          {friend.status === 'online' ? 'Online' : 'Offline'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

  const filteredConversations = getFilteredConversations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Community' })}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Conversations</Text>
        <TouchableOpacity 
          style={styles.newChatButton}
          onPress={() => navigation.navigate('SearchFriends')}
        >
          <Text style={styles.newChatButtonText}>New Chat</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={styles.searchBar}
        placeholder="Search conversations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? "No conversations match your search" : "No conversations found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.$id}
          renderItem={renderConversationItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#22272B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    color:'#fff',
    borderBottomWidth: 1,
    backgroundColor: '#2D343C',
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    color:'#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  newChatButton: {
    padding: 8,
  },
  newChatButtonText: {
    color: '#01CC97',
    fontWeight: 'bold',
  },
  searchBar: {
    padding: 15,
    margin: 15,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#33383D', // Dark input background
    borderWidth: 1,
    borderColor: '#01CC97', // Vibrant border like HomeScreen buttons
    borderRadius: 8,
    marginVertical: 15,
    fontSize: 16,
    color: '#fff', // White text for readability
    
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    backgroundColor: '#2D343C',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
    

  },
  statusIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    bottom: 0,
    right: 0,
  },
  conversationInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color:'#fff',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#777',
  },
  statusTextContainer: {
    marginLeft: 10,
  },
  statusText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#01CC97',
  },
  errorText: {
    color: '#ff0000',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#01CC97',
    padding: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
