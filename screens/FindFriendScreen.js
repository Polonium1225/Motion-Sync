import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, BackHandler } from 'react-native';
import { account, getUserConversations, databases, DATABASE_ID } from "../lib/AppwriteService";
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function FindFriendScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const isFocused = useIsFocused();

  // Replace the current backAction with this:
useEffect(() => {
  const backAction = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Community'); // Fallback if no back stack
    }
    return true;
  };

  const backHandler = BackHandler.addEventListener(
    'hardwareBackPress',
    backAction
  );

  return () => backHandler.remove();
}, [navigation]);

  useEffect(() => {
    const loadConversationsAndUsers = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        // Get user conversations
        const userConversations = await getUserConversations(user.$id);
        
        // Create a set of all user IDs we need to fetch
        const userIdsToFetch = new Set();
        userConversations.forEach(conv => {
          if (conv.participant1 !== user.$id) userIdsToFetch.add(conv.participant1);
          if (conv.participant2 !== user.$id) userIdsToFetch.add(conv.participant2);
        });
        
        // Get user info for each participant
        const userMap = {};
        // Using traditional for loop to avoid race conditions with async/await
        for (const userId of userIdsToFetch) {
          try {
            // Fetch each user's details from the users collection
            const userDocs = await databases.listDocuments(
              DATABASE_ID,
              '67d0bbf8003206b11780',
              []
            );
            
            // Find the user in the returned documents
            const userData = userDocs.documents.find(doc => doc.$id === userId);
            if (userData) {
              userMap[userId] = userData;
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
          }
        }
        
        setUsers(userMap);
        setConversations(userConversations);
      } catch (err) {
        console.error("[DEBUG] Error loading conversations:", err);
        setError("Failed to load conversations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isFocused) { 
      loadConversationsAndUsers();
    }
  }, [isFocused]);

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
    
    navigation.navigate('Chat', {
      friendId: friendId,
      friendName: friend.name,
      conversationId: conversation.$id
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#01CC97" />
        <Text style={styles.loadingText}>Loading your conversations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('FindFriend')}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredConversations = getFilteredConversations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            navigation.navigate('Community');
            
          }}
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
          renderItem={({ item }) => {
            const friendId = item.participant1 === currentUserId ? item.participant2 : item.participant1;
            const friend = users[friendId] || { name: "Unknown User" };
            
            return (
              <TouchableOpacity 
                style={styles.conversationItem}
                onPress={() => navigateToChat(item)}
              >
                <Text style={styles.friendName}>{friend.name}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || "Start a conversation"}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newChatButton: {
    backgroundColor: '#01CC97',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  searchBar: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
  },
  conversationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  friendName: {
    fontSize: 18,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#01CC97',
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  }
});