import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { account, getUserConversations } from "../lib/AppwriteService";
import { useIsFocused } from '@react-navigation/native';
import Colors from '../constants/Colors';

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
          <ActivityIndicator size="large" color={Colors.primary} />
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
    backgroundColor: Colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: Colors.textPrimary
  },
  input: {
    backgroundColor: Colors.surfaceDark,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: Colors.textSecondary,
  }
});