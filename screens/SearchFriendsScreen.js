import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { databases, account } from "../lib/AppwriteService";
import { Query } from 'appwrite';

export default function SearchFriendsScreen() {
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        const response = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67d0bbf8003206b11780',
          searchQuery ? [Query.search('name', searchQuery)] : []
        );
        
        // Filter out current user
        setUsers(response.documents.filter(u => u.$id !== user.$id));
      } catch (error) {
        console.log("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [searchQuery]);

  const startConversation = async (friendId) => {
    try {
      // 1. Create conversation
      const conversation = await databases.createDocument(
        '67d0bba1000e9caec4f2',
        '67edc4ef0032ae87bfe4',
        'unique()',
        {
          participants: [currentUserId, friendId],
          lastMessage: "Conversation started",
          lastMessageAt: new Date().toISOString()
        }
      );
      
      // 2. Navigate to Chat screen with new conversation
      navigation.navigate('Chat', { conversationId: conversation.$id });
      
    } catch (error) {
      console.log("Error creating conversation:", error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search friends..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      <FlatList
        data={users}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userItem}
            onPress={() => startConversation(item.$id)}
          >
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userStatus}>{item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2229',
    padding: 20
  },
  searchBar: {
    backgroundColor: '#22272B',
    color: 'white',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20
  },
  userItem: {
    backgroundColor: '#22272B',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  userName: {
    color: 'white',
    fontSize: 16
  },
  userStatus: {
    color: '#01CC97',
    fontSize: 14
  }
});