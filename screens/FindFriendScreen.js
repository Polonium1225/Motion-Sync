import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image } from 'react-native';
import { databases, account } from "../lib/AppwriteService";
import { Query } from 'appwrite';
import defaultAvatar from '../assets/avatar.png';

export default function FindFriend({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  console.log("[DEBUG] FindFriend rendering, friends count:", friends.length);

  useEffect(() => {
    console.log("[DEBUG] useEffect triggered in FindFriend");
    
    const fetchFriends = async () => {
      console.log("[DEBUG] fetchFriends called");
      try {
        setIsLoading(true);
        console.log("[DEBUG] Getting current user");
        const user = await account.get();
        console.log("[DEBUG] Current user ID:", user.$id);
        setCurrentUser(user.$id);

        console.log("[DEBUG] Querying conversations for user");
        const conversations = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67edc4ef0032ae87bfe4',
          [
            Query.or([
              Query.equal('participant1', user.$id),
              Query.equal('participant2', user.$id)
            ])
          ]
        );
        console.log("[DEBUG] Found conversations:", conversations.documents.length);

        const friendIds = conversations.documents.map(conv => {
          const friendId = conv.participant1 === user.$id ? conv.participant2 : conv.participant1;
          console.log("[DEBUG] Found friend ID:", friendId);
          return friendId;
        });

        console.log("[DEBUG] Fetching friend details for IDs:", friendIds);
        if (friendIds.length > 0) {
          const friendsData = await databases.listDocuments(
            '67d0bba1000e9caec4f2',
            '67d0bbf8003206b11780',
            [Query.equal('$id', friendIds)]
          );
          console.log("[DEBUG] Friends data received:", friendsData.documents.length);
          setFriends(friendsData.documents);
        } else {
          console.log("[DEBUG] No friends found");
          setFriends([]);
        }
      } catch (error) {
        console.error("[DEBUG] Failed to load friends:", {
          error: error.message,
          code: error.code,
          type: error.name,
          stack: error.stack
        });
      } finally {
        console.log("[DEBUG] Loading complete");
        setIsLoading(false);
      }
    };

    fetchFriends();

    return () => {
      console.log("[DEBUG] Cleanup effect in FindFriend");
    };
  }, []);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log("[DEBUG] Filtered friends count:", filteredFriends.length);

  if (isLoading) {
    console.log("[DEBUG] Rendering loading state");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#01CC97" />
        <Text>Loading conversations...</Text>
      </View>
    );
  }

  console.log("[DEBUG] Rendering main view");
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search friends..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {filteredFriends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {friends.length === 0 
              ? "You don't have any conversations yet" 
              : "No matching friends found"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={item => item.$id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.friendItem}
              onPress={() => {
                console.log("[DEBUG] Friend pressed:", item.$id);
                navigation.navigate('Chat', {
                  friendId: item.$id,
                  friendName: item.name,
                  conversationId: `conv_${currentUser}_${item.$id}`
                });
              }}
            >
              <Image 
                source={item.avatar ? { uri: item.avatar } : defaultAvatar}
                style={styles.avatar}
              />
              <View style={styles.friendInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.status}>
                  {item.status || 'offline'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
  searchBar: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 10
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15
  },
  friendInfo: {
    flex: 1
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  status: {
    fontSize: 14,
    color: '#666'
  }
});