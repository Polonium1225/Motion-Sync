import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createPost } from '../lib/AppwriteService';
import { useNavigation } from '@react-navigation/native';

const CreatePostScreen = () => {
  const [content, setContent] = useState('');
  const navigation = useNavigation();

  const handlePost = async () => {
    if (content.trim()) {
      // Replace with actual user ID from your auth system
      const userId = 'current_user_id'; 
      const success = await createPost(userId, content);
      if (success) {
        navigation.goBack();
      }
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        multiline
        numberOfLines={4}
        value={content}
        onChangeText={setContent}
      />
      
      <TouchableOpacity style={styles.postButton} onPress={handlePost}>
        <Ionicons name="send" size={24} color="white" />
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
  },
  postButton: {
    flexDirection: 'row',
    backgroundColor: '#05907A',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreatePostScreen;