import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  ActivityIndicator, 
  SafeAreaView, 
  StatusBar,
  Image 
} from 'react-native';
import { databases, account, DATABASE_ID, Query } from "../lib/AppwriteService";
import { Ionicons } from '@expo/vector-icons';

export default function SearchFriendsScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        // Get all users with avatar and status
        const response = await databases.listDocuments(
          DATABASE_ID,
          '67d0bbf8003206b11780', // Your accounts collection
          [
            Query.select(['$id', 'name', 'email', 'avatar', 'status']) // Only get needed fields
          ]
        );
        
        // Filter out current user
        const otherUsers = response.documents
          .filter(u => u.$id !== user.$id)
          .map(user => ({
            ...user,
            avatar: user.avatar || 'avatar.png' // Default avatar if null
          }));
        
        setUsers(otherUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Couldn't load users. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startConversation = async (friendId, friendName) => {
    try {
      const existingConversation = await findExistingConversation(currentUserId, friendId);
      
      if (existingConversation) {
        navigation.navigate('Chat', {
          friendId,
          friendName,
          conversationId: existingConversation.$id
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
    }
  };

  // Find if a conversation already exists between the two users
  const findExistingConversation = async (userId, friendId) => {
    try {
      // First query for participant1=userId and participant2=friendId
      const response1 = await databases.listDocuments(
        DATABASE_ID,
        '67edc4ef0032ae87bfe4', // conversations collection
        [
          Query.equal('participant1', userId),
          Query.equal('participant2', friendId)
        ]
      );
      
      if (response1.documents.length > 0) {
        console.log("[DEBUG] Found existing conversation (1):", response1.documents[0].$id);
        return response1.documents[0];
      }
      
      // If not found, try the opposite: participant1=friendId and participant2=userId
      const response2 = await databases.listDocuments(
        DATABASE_ID,
        '67edc4ef0032ae87bfe4', // conversations collection
        [
          Query.equal('participant1', friendId),
          Query.equal('participant2', userId)
        ]
      );
      
      if (response2.documents.length > 0) {
        console.log("[DEBUG] Found existing conversation (2):", response2.documents[0].$id);
        return response2.documents[0];
      }
      
      return null;
    } catch (error) {
      console.error("[DEBUG] Error finding existing conversation:", error);
      return null;
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => startConversation(item.$id, item.name)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar && item.avatar !== 'avatar.png' ? (
          <Image 
          source={item.avatar === 'enha' ? require('../assets/avatar.png') : { uri: item.avatar }}
          style={styles.avatarImage}
        />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.status === 'online' ? '#4CAF50' : '#9E9E9E' }
        ]} />
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.status === 'online' && (
            <Text style={styles.onlineText}>Online</Text>
          )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1F23" />
        <ActivityIndicator size="large" color="#05907A" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1F23" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => navigation.replace('SearchFriends')}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F23" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={styles.headerRight} />
      </View>
      
      <TextInput
        style={styles.searchBar}
        placeholder="Search by name..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={item => item.$id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1A1F23',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  searchBar: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
  },
  statusIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    bottom: 0,
    right: 10,
  },
  userInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  onlineText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  userEmail: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
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
});