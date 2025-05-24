import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, SafeAreaView, StatusBar, Image
} from 'react-native';
import { account, databases, DATABASE_ID, Query, userProfiles, COLLECTIONS } from "../lib/AppwriteService";
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

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
              backgroundColor: item.status === 'online' ? Colors.accentBlue : Colors.textSecondary,
              borderColor: Colors.background // Make sure this is visible
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
              color: item.status === 'online' ? Colors.accentBlue : Colors.textSecondary,
              fontSize: 12 // Make sure it's visible
            }
          ]}>
            {item.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
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
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <Text style={[styles.errorText, {color: Colors.textPrimary}]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, {backgroundColor: Colors.primary}]}
          onPress={() => navigation.replace('SearchFriends')}
        >
          <Text style={[styles.retryButtonText, {color: Colors.textPrimary}]}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Search by name..."
        placeholderTextColor={Colors.textSecondary}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.surfaceDark,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  searchBar: {
    backgroundColor: Colors.surfaceDark,
    padding: 15,
    margin: 15,
    borderRadius: 10,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryDeep,
    backgroundColor: Colors.surfaceDark,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.background,
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
    color: Colors.textPrimary,
  },
  userStatus: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  // Style already defined above
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});