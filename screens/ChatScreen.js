import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { databases, account, ID, realtime } from '../lib/AppwriteService';
import { Query } from 'appwrite';

// Constants matching your exact collection IDs
const DATABASE_ID = '67d0bba1000e9caec4f2';
const CONVERSATIONS_COLLECTION_ID = '67edc4ef0032ae87bfe4';
const MESSAGES_COLLECTION_ID = '67edc5c00017db23e0fa';

export default function ChatScreen({ route }) {
  const { conversationId, friendId, friendName } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  // Load initial data and setup realtime
  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);

        // Get existing messages
        const response = await databases.listDocuments(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          [
            Query.equal('conversationId', conversationId),
            Query.orderAsc('$createdAt')
          ]
        );
        setMessages(response.documents);
      } catch (error) {
        console.error("Failed to load chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Realtime subscription for new messages
    unsubscribeRef.current = realtime.subscribe(
      `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
      response => {
        if (response.events.includes(`databases.*.collections.*.documents.*.create`)) {
          const newMessage = response.payload;
          if (newMessage.conversationId === conversationId) {
            setMessages(prev => [...prev, newMessage]);
            
            // Auto-scroll would go here if using FlatList ref
          }
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!messageText.trim() || !currentUser || isSending) return;
    
    setIsSending(true);
    const tempId = ID.unique(); // For optimistic UI
    
    try {
      // Optimistic update
      setMessages(prev => [...prev, {
        $id: tempId,
        conversationId,
        senderId: currentUser.$id,
        content: messageText,
        $createdAt: new Date().toISOString()
      }]);

      // Actual API call
      await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(), // Real ID will come through realtime
        {
          conversationId,
          senderId: currentUser.$id,
          content: messageText
        }
      );

      // Update conversation last message
      await databases.updateDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        conversationId,
        {
          lastMessage: messageText,
          lastMessageAt: new Date().toISOString()
        }
      );

      setMessageText('');
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic update if failed
      setMessages(prev => prev.filter(msg => msg.$id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

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
            item.senderId === currentUser?.$id ? styles.myMessage : styles.theirMessage
          ]}>
            <Text style={styles.messageText}>{item.content}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.$createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
        )}
      />

      {/* Message Input */}
      <KeyboardAvoidingView 
        behavior="padding" 
        style={styles.inputContainer}
        keyboardVerticalOffset={80}
      >
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          onSubmitEditing={sendMessage}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[styles.sendButton, isSending && styles.disabledButton]}
          onPress={sendMessage}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 15,
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  friendName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  status: {
    color: 'lightgray',
    fontSize: 14
  },
  messagesContainer: {
    padding: 10
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6'
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white'
  },
  messageText: {
    fontSize: 16
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
    marginTop: 5
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: 'white'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#6200ee',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center'
  },
  disabledButton: {
    backgroundColor: '#a881f0'
  },
  sendText: {
    color: 'white',
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});