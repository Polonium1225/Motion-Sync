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

  // Real-time status updates
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          '67d0bbf8003206b11780',
          [Query.select(['$id', 'name', 'avatar', 'status'])]
        );
        
        const otherUsers = response.documents
          .filter(u => u.$id !== user.$id)
          .map(user => ({
            ...user,
            avatar: user.avatar || 'default' // Use 'default' as fallback
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

    // Set up real-time updates for status
    const interval = setInterval(fetchUsers, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => startConversation(item.$id, item.name)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar && item.avatar !== 'avatar.png' ? (

        <Image 
        source={item.avatar === 'avatar.png' ? require('../assets/icon.png') : { uri: item.avatar }}
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
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userStatus}>
          {item.status === 'online' ? 'Online' : 'Offline'}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
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
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
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
    backgroundColor: '#f0f0f0', // Background for loading state
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
    right: 0,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#777',
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