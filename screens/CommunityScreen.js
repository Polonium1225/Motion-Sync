import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { account, getUserConversations } from "../lib/AppwriteService";
import { useIsFocused } from '@react-navigation/native';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const isFocused = useIsFocused();

  const handleChatPress = async () => {
    setIsLoading(true);
    try {
      const user = await account.get();
      const conversations = await getUserConversations(user.$id);
      
      if (conversations.length > 0) {
        navigation.navigate('FindFriend');
      } else {
        navigation.navigate('SearchFriends'); // Go directly to SearchFriends instead of NoConversation
      }
    } catch (error) {
      console.error("Error checking conversations:", error);
      navigation.navigate('SearchFriends');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#01CC97" />
          <Text style={styles.loadingText}>Checking your conversations...</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.button}
          onPress={handleChatPress}
        >
          <Text style={styles.buttonText}>Chat</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#22272B',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#fff'
  },
  button: {
    backgroundColor: '#01CC97',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#666',
  }
});