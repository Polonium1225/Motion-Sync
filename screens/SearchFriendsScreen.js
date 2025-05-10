import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  TextInput, ActivityIndicator, SafeAreaView, StatusBar, Image 
} from 'react-native';
import { account, databases, DATABASE_ID, Query, userProfiles, COLLECTIONS } from "../lib/AppwriteService";
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../assets/avatar.png');
const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; 
const PROJECT_ID = '67d0bb27002cfc0b22d2';
const BUCKET_ID = 'profile_images'; 

export default function SearchFriendsScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all user profiles
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        console.log("Fetching user profiles..."); // Debug log
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          [
            Query.notEqual('userId', user.$id),
            Query.select(['userId', 'name', 'avatar', 'status'])
          ]
        );
        
        console.log("Received profiles:", response.documents); // Debug log
        
        const mappedUsers = response.documents.map(doc => {
          let avatarUrl = DEFAULT_AVATAR;
          
          if (doc.avatar) {
            avatarUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${doc.avatar}/view?project=${PROJECT_ID}`;
          }
          
          return {
            $id: doc.userId,
            name: doc.name || 'Unknown User', // Fallback for name
            avatar: avatarUrl,
            status: doc.status || 'offline' // Fallback for status
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
    const updateStatuses = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USER_PROFILES,
          [
            Query.notEqual('userId', currentUserId),
            Query.select(['userId', 'status'])
          ]
        );
        
        setUsers(prevUsers => 
          prevUsers.map(user => {
            const updatedUser = response.documents.find(doc => doc.userId === user.$id);
            return updatedUser ? {...user, status: updatedUser.status} : user;
          })
        );
      } catch (error) {
        console.error("Error updating statuses:", error);
      }
    };

    const interval = setInterval(updateStatuses, 10000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const renderUserItem = ({ item }) => {
    console.log("Rendering user:", item); // Debug log
    
    return (
      <TouchableOpacity 
        style={styles.userItem}
        onPress={() => startConversation(item.$id, item.name)}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar}
            style={styles.avatarImage}
            defaultSource={DEFAULT_AVATAR}
          />
          <View style={[
            styles.statusIndicator,
            { 
              backgroundColor: item.status === 'online' ? '#4CAF50' : '#9E9E9E',
              borderColor: '#fff' // Make sure this is visible
            }
          ]} />
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.name || 'Unknown User'}
          </Text>
          <Text style={[
            styles.userStatus,
            { 
              color: item.status === 'online' ? '#4CAF50' : '#9E9E9E',
              fontSize: 12 // Make sure it's visible
            }
          ]}>
            {item.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

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

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    backgroundColor: '#22272B',
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
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    resizeMode: 'cover',
  },
});