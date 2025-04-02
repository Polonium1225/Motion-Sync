import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import PostCard from '../components/PostCard';
import { useNavigation } from '@react-navigation/native';
import { databases, account } from "../lib/AppwriteService";
import { Query } from 'appwrite';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CommunityScreen() {
  const navigation = useNavigation();
  const [hasConversations, setHasConversations] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndConversations = async () => {
      try {
        // 1. Get current user session
        const user = await account.get();
        setCurrentUserId(user.$id);
        
        // 2. Check for conversations
        const response = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          'conversations',
          [Query.contains('participants', user.$id)]
        );
        
        setHasConversations(response.total > 0);
      } catch (error) {
        console.error('Error:', error);
        Alert.alert("Error", "Failed to load conversations");
        setHasConversations(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndConversations();

    // Cleanup function
    return () => {
      // Cancel any ongoing requests if needed
    };
  }, []);

  const handleChatPress = async () => {
    if (isLoading) return;
    
    try {
      // Double-check authentication
      const session = await account.getSession('current');
      if (!session) {
        Alert.alert("Session Expired", "Please login again");
        return;
      }

      navigation.navigate(hasConversations ? 'Chat' : 'NoConversation');
    } catch (error) {
      console.error('Session check failed:', error);
      Alert.alert("Error", "Please authenticate first");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#01CC97" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Post</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleChatPress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Chat'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Community</Text>

        <View style={styles.posts}>
          <PostCard />
          <PostCard />
          <PostCard />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2229',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Centers buttons horizontally
    alignItems: 'center', // Centers buttons vertically
    marginVertical: 15,
    height: 100,
    gap: 20, // Space between buttons
  },
  button: {
    backgroundColor: '#22272B',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: "#01CC97",
    borderWidth: 2,
    borderRadius: 30,
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#01CC97',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  posts: {
    marginTop: 10,
  },
});

