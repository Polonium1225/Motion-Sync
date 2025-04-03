import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { databases, account, ID, Permission, Role } from "../lib/AppwriteService";
import { Query } from 'appwrite';

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
          queries.push(Query.search('name', query));
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
        
        // First check if conversation already exists
        const existingConvos = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67edc4ef0032ae87bfe4',
          [
            Query.or([
              Query.and([
                Query.equal('participant1', user.$id),
                Query.equal('participant2', friendId)
              ]),
              Query.and([
                Query.equal('participant1', friendId),
                Query.equal('participant2', user.$id)
              ])
            ])
          ]
        );
    
        // If exists, use that conversation
        if (existingConvos.documents.length > 0) {
          const existingConvo = existingConvos.documents[0];
          navigation.navigate('Chat', {
            conversationId: existingConvo.$id,
            friendId,
            friendName: users.find(u => u.$id === friendId)?.name || 'Friend'
          });
          return;
        }
    
        // Otherwise create new conversation
        const conversationId = ID.unique();
        const conversation = await databases.createDocument(
          '67d0bba1000e9caec4f2',
          '67edc4ef0032ae87bfe4',
          ID.unique(),
          {
            conversationId: conversationId,
            participant1: user.$id,
            participant2: friendId,
            lastMessage: "Conversation started",
            lastMessageAt: new Date().toISOString()
          }
        );
    
        navigation.navigate('Chat', {
          conversationId: conversation.$id,
          friendId,
          friendName: users.find(u => u.$id === friendId)?.name || 'Friend'
        });
    
      } catch (error) {
        console.log("Error:", error);
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