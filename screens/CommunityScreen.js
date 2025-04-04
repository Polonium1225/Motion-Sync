import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { databases, account } from "../lib/AppwriteService";

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
      
      // Use the list method without the Query object at all
      const response = await databases.listDocuments(
        '67d0bba1000e9caec4f2',
        '67edc4ef0032ae87bfe4'
      );
      
      console.log("[DEBUG] All conversations retrieved:", response.documents.length);
      
      // Filter manually in JavaScript
      const userConversations = response.documents.filter(doc => 
        doc.participant1 === user.$id || doc.participant2 === user.$id
      );
      
      console.log("[DEBUG] User conversations:", userConversations.length);
      
      // Navigate based on results
      navigation.navigate(userConversations.length > 0 ? 'FindFriend' : 'NoConversation');
    } catch (error) {
      console.error("[DEBUG] Error checking conversations:", error);
      
      // If there's any error, just navigate to NoConversation as a fallback
      // since the user likely has no conversations yet
      navigation.navigate('NoConversation');
      
      Alert.alert(
        "Connection Note",
        "There was an issue checking your conversations. We'll assume you don't have any yet.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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