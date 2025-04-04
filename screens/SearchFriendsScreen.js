//SearchFriendsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { databases, account } from "../lib/AppwriteService";
import { Query } from 'appwrite';

export default function SearchFriendsScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        const response = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67d0bbf8003206b11780',
          [Query.notEqual('$id', user.$id)]
        );
        
        setUsers(response.documents);
      } catch (error) {
        console.error("Search error:", error);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search friends..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      <FlatList
        data={filteredUsers}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.userItem}
            onPress={() => navigation.navigate('Chat', {
              friendId: item.$id,
              friendName: item.name,
              conversationId: `new_${currentUserId}_${item.$id}`
            })}
          >
            <Text style={styles.userName}>{item.name}</Text>
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
  userItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  userName: {
    fontSize: 16
  }
});