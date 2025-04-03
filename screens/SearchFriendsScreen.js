import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { databases, account } from "../lib/AppwriteService";
import { Query, Permission, Role } from 'appwrite';

export default function SearchFriendsScreen() {
    const navigation = useNavigation();
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState('');
  
    const fetchUsers = async (query = '') => {
      try {
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        const queries = [Query.notEqual('$id', user.$id)];
        if (query) {
          queries.push(Query.search('name', query)); // Requires fulltext index
        } else {
          queries.push(Query.limit(25));
        }
  
        const response = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67d0bbf8003206b11780',
          queries
        );
        
        setUsers(response.documents);
      } catch (error) {
        console.log("Search error:", error.message);
      }
    };
  
    // Debounced search
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
      const timer = setTimeout(() => fetchUsers(searchQuery), 300);
      return () => clearTimeout(timer);
    }, [searchQuery]);
  
    const startConversation = async (friendId) => {
      try {
        const user = await account.get();
        
        // Correct permission format for Appwrite 1.6.2
        const permissions = [
          `read("user:${user.$id}")`,
          `update("user:${user.$id}")`,
          `read("user:${friendId}")`
        ];
    
        // 1. Create friendship
        await databases.createDocument(
          '67d0bba1000e9caec4f2',
          '67edbf2c0002aa7c483e', // friendships collection
          'unique()',
          {
            requester: user.$id,
            recipient: friendId,
            status: 'accepted'
          },
          permissions
        );
    
        // 2. Create conversation
        const conversation = await databases.createDocument(
          '67d0bba1000e9caec4f2',
          '67edc4ef0032ae87bfe4', // conversations collection
          'unique()',
          {
            participants: [user.$id, friendId],
            lastMessage: "Conversation started",
            lastMessageAt: new Date().toISOString()
          },
          permissions
        );
    
        navigation.navigate('Chat', {
          conversationId: conversation.$id,
          friendId: friendId,
          friendName: users.find(u => u.$id === friendId)?.name || 'Friend'
        });
    
      } catch (error) {
        console.log("Error creating conversation:", {
          message: error.message,
          solution: "Using exact permission format for Appwrite 1.6.2"
        });
        
        // Fallback navigation
        navigation.navigate('Chat', {
          conversationId: 'temp_' + Date.now(),
          friendId: friendId,
          friendName: users.find(u => u.$id === friendId)?.name || 'Friend'
        });
      }
    };
  
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <FlatList
          data={users}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.userItem}
              onPress={() => startConversation(item.$id)}
            >
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userStatus}>
                {item.status || 'offline'}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.$id}
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