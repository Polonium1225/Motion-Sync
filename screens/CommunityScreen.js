import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { account, getUserConversations } from "../lib/AppwriteService";

export default function CommunityScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleChatPress = async () => {
    setIsLoading(true);
    
    try {
      console.log("[DEBUG] Checking conversations on button press");
      
      // Get current user
      const user = await account.get();
      console.log("[DEBUG] User retrieved:", user.$id);
      
      // Get user conversations using our helper function
      const conversations = await getUserConversations(user.$id);
      console.log("[DEBUG] User conversations:", conversations.length);
      
      // Navigate based on results
      if (conversations.length > 0) {
        navigation.navigate('FindFriend');
      } else {
        navigation.navigate('NoConversation');
      }
    } catch (error) {
      console.error("[DEBUG] Error checking conversations:", error);
      // If there's any error, just navigate to NoConversation as a fallback
      navigation.navigate('NoConversation');
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
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333'
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