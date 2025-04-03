import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, TextInput, StyleSheet } from 'react-native';
import { databases, account } from '../lib/AppwriteService';
import { Query } from 'appwrite';
import defaultAvatar from '../assets/avatar.png';

export default function FindFriend({ navigation }) {
  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user.$id);
        
        // Get all conversations where current user is participant
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

        // Get unique friend IDs
        const friendIds = conversations.documents.flatMap(conv => 
          [conv.participant1, conv.participant2].filter(id => id !== user.$id)
        );

        // Get friend details
        const friendsData = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67d0bbf8003206b11780', // accounts collection
          [
            Query.equal('$id', friendIds)
          ]
        );

        setFriends(friendsData.documents);
        setFilteredFriends(friendsData.documents);
      } catch (error) {
        console.log("Error loading friends:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = friends.filter(friend => 
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFriends(filtered);
    } else {
      setFilteredFriends(friends);
    }
  }, [searchQuery]);

  const navigateToChat = (friendId, friendName) => {
    navigation.navigate('Chat', {
      conversationId: `temp_${currentUser}_${friendId}`,
      friendId,
      friendName
    });
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
        data={filteredFriends}
        keyExtractor={item => item.$id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.friendItem}
            onPress={() => navigateToChat(item.$id, item.name)}
          >
            <Image 
              source={item.avatar ? { uri: item.avatar } : defaultAvatar}
              style={styles.avatar}
            />
            <View style={styles.friendInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[
                styles.status,
                item.status === 'online' ? styles.online : styles.offline
              ]}>
                {item.status || 'offline'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff'
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
    fontSize: 14
  },
  online: {
    color: 'green'
  },
  offline: {
    color: 'gray'
  }
});