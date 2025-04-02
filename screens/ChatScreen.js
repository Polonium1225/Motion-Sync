import React from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const friends = [
  { id: '1', name: 'Clara', message: 'hi', avatar: require('../assets/clara.png'), status: 'online' },
  { id: '2', name: 'Jessica', message: 'hello', avatar: require('../assets/jessica.png'), status: 'online' },
  { id: '3', name: 'Clara', message: 'hi', avatar: require('../assets/clara.png'), status: 'offline' },
  { id: '4', name: 'Edward', message: 'wax abro', avatar: require('../assets/edward.png'), status: 'offline' },
  { id: '5', name: 'Mike', message: 'hi', avatar: require('../assets/mike.png'), status: 'online' },
];

export default function ChatScreen() {
    const navigation = useNavigation();
    
    return (
      <View style={styles.container}>
        <TextInput style={styles.searchBar} placeholder="Find friends" />
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.friendItem}>
              <Image source={item.avatar} style={styles.avatar} />
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.message}>{item.message}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('NoConversation')}
        >
          <Text style={styles.navButtonText}>No Conversation</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('SearchFriends')}
        >
          <Text style={styles.navButtonText}>Search Friends</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  export function NoConversationScreen() {
    const navigation = useNavigation();
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.noConversationText}>No Conversation</Text>
        <Text style={styles.subText}>Add some friends and start chatting with them.</Text>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('CommunityScreen')}>
          <Text style={styles.navButtonText}>Add Friends</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  export function SearchFriendsScreen() {
    return (
      <View style={styles.container}>
        <TextInput style={styles.searchBar} placeholder="Search for friends" />
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    searchBar: { height: 40, backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10 },
    friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    name: { fontSize: 16, fontWeight: 'bold' },
    message: { fontSize: 14, color: 'gray' },
    noConversationText: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    subText: { fontSize: 16, color: 'gray', marginBottom: 20 },
    navButton: { backgroundColor: '#007BFF', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
    navButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  });