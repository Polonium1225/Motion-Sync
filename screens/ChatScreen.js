import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { databases, account } from '../lib/AppwriteService';
import { Query } from 'appwrite';

export default function ChatScreen({ route }) {
  const { conversationId, friendId, friendName } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUserAndMessages = async () => {
      try {
        // Get current user
        const user = await account.get();
        setCurrentUser(user);

        // Load messages
        const response = await databases.listDocuments(
          '67d0bba1000e9caec4f2',
          '67edc5c00017db23e0fa',
          [
            Query.equal('conversation', conversationId),
            Query.orderAsc('$createdAt')
          ]
        );
        setMessages(response.documents);
      } catch (error) {
        console.log("Error loading messages:", error.message);
      }
    };

    fetchUserAndMessages();
  }, [conversationId]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      // Create message document
      const message = await databases.createDocument(
        '67d0bba1000e9caec4f2',
        '67edc5c00017db23e0fa',
        'unique()',
        {
          conversation: conversationId,
          sender: currentUser.$id,
          content: messageText
        },
        [
          `read("user:${currentUser.$id}")`,
          `read("user:${friendId}")`
        ]
      );

      // Update conversation last message
      await databases.updateDocument(
        '67d0bba1000e9caec4f2',
        '67edc4ef0032ae87bfe4',
        conversationId,
        {
          lastMessage: messageText,
          lastMessageAt: new Date().toISOString()
        }
      );

      // Update UI
      setMessages([...messages, message]);
      setMessageText('');
    } catch (error) {
      console.log("Error sending message:", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.friendName}>{friendName}</Text>
        <Text style={styles.status}>Online</Text>
      </View>

      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.$id}
        contentContainerStyle={styles.messagesContainer}
        renderItem={({ item }) => (
          <View style={[
            styles.messageBubble,
            item.sender === currentUser?.$id ? styles.myMessage : styles.theirMessage
          ]}>
            <Text style={styles.messageText}>{item.content}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      />

      {/* Message Input */}
      <KeyboardAvoidingView behavior="padding" style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2229',
  },
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#22272B',
    alignItems: 'center'
  },
  friendName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  status: {
    color: '#01CC97',
    fontSize: 12
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 70
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#01CC97',
    borderBottomRightRadius: 0
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#22272B',
    borderBottomLeftRadius: 0
  },
  messageText: {
    color: 'white',
    fontSize: 16
  },
  messageTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#22272B',
    backgroundColor: '#1F2229',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  input: {
    flex: 1,
    backgroundColor: '#22272B',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#01CC97',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center'
  },
  sendText: {
    color: 'white',
    fontWeight: 'bold'
  }
});