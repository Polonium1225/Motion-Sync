import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { databases, account, DATABASE_ID, ID } from "../lib/AppwriteService";
import { Query } from 'appwrite';
import { Ionicons } from 'react-native-vector-icons';

export default function ChatScreen({ route, navigation }) {
  const { friendId, friendName, conversationId } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dbConversationId, setDbConversationId] = useState(null);
  const flatListRef = useRef(null);

  // Initialize chat and get or create conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        
        // Get current user info
        const user = await account.get();
        setCurrentUserId(user.$id);
        setCurrentUserName(user.name);
        
        // Check if this is a new conversation or existing one
        if (conversationId.startsWith('new_')) {
          // Check if a conversation between these users already exists
          const existingConversation = await findExistingConversation(user.$id, friendId);
          
          if (existingConversation) {
            // Use existing conversation
            setDbConversationId(existingConversation.$id);
            await loadMessages(existingConversation.$id);
          } else {
            // Create new conversation
            const newConvId = await createConversation(user.$id, friendId);
            setDbConversationId(newConvId);
          }
        } else {
          // Use provided conversation ID
          setDbConversationId(conversationId);
          await loadMessages(conversationId);
        }
      } catch (error) {
        console.error("[DEBUG] Error initializing chat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
    
    // Set up real-time message subscription
    const unsubscribe = subscribeToMessages();
    
    // Clean up subscription when unmounting
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversationId, friendId]);

  // Find if a conversation already exists between the two users
  const findExistingConversation = async (userId, friendId) => {
    try {
      // First query for participant1=userId and participant2=friendId
      const response1 = await databases.listDocuments(
        DATABASE_ID,
        '67edc4ef0032ae87bfe4', // conversations collection
        [
          Query.equal('participant1', userId),
          Query.equal('participant2', friendId)
        ]
      );
      
      if (response1.documents.length > 0) {
        console.log("[DEBUG] Found existing conversation (1):", response1.documents[0].$id);
        return response1.documents[0];
      }
      
      // If not found, try the opposite: participant1=friendId and participant2=userId
      const response2 = await databases.listDocuments(
        DATABASE_ID,
        '67edc4ef0032ae87bfe4', // conversations collection
        [
          Query.equal('participant1', friendId),
          Query.equal('participant2', userId)
        ]
      );
      
      if (response2.documents.length > 0) {
        console.log("[DEBUG] Found existing conversation (2):", response2.documents[0].$id);
        return response2.documents[0];
      }
      
      return null;
    } catch (error) {
      console.error("[DEBUG] Error finding existing conversation:", error);
      return null;
    }
  };

  // Create a new conversation
  const createConversation = async (userId, friendId) => {
    try {
      const uniqueConversationId = `conv_${userId}_${friendId}_${new Date().getTime()}`;
      
      // Create conversation document
      const response = await databases.createDocument(
        DATABASE_ID,
        '67edc4ef0032ae87bfe4', // conversations collection
        ID.unique(),
        {
          conversationId: uniqueConversationId,
          lastMessage: "",
          lastMessageAt: new Date(),
          participant1: userId,
          participant2: friendId
        }
      );
      
      console.log("[DEBUG] Created new conversation:", response.$id);
      return response.$id;
    } catch (error) {
      console.error("[DEBUG] Error creating conversation:", error);
      throw error;
    }
  };

  // Load existing messages for a conversation
  const loadMessages = async (convId) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        'messages', // messages collection
        [
          Query.equal('conversationId', convId),
          Query.orderDesc('$createdAt')
        ]
      );
      
      setMessages(response.documents);
      console.log("[DEBUG] Loaded messages:", response.documents.length);
    } catch (error) {
      console.error("[DEBUG] Error loading messages:", error);
    }
  };

  // Set up real-time message subscription
  const subscribeToMessages = () => {
    // This is a polling mechanism for now
    // For production, implement Appwrite's realtime API
    const interval = setInterval(async () => {
      if (dbConversationId) {
        await loadMessages(dbConversationId);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  };

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !dbConversationId) return;
    
    try {
      // Create message document
      const messageData = {
        messageId: `msg_${new Date().getTime()}`,
        content: newMessage.trim(),
        conversationId: dbConversationId,
        senderId: currentUserId
      };
      
      await databases.createDocument(
        DATABASE_ID,
        '67edc5c00017db23e0fa', // messages collection
        ID.unique(),
        messageData
      );
      
      // Update conversation with last message
      await databases.updateDocument(
        DATABASE_ID,
        '67edc4ef0032ae87bfe4', // conversations collection
        dbConversationId,
        {
          lastMessage: newMessage.trim(),
          lastMessageAt: new Date()
        }
      );
      
      // Optimistically update UI
      setMessages(prevMessages => [
        {
          ...messageData,
          $id: `temp_${Date.now()}`,
          $createdAt: new Date().toISOString()
        },
        ...prevMessages
      ]);
      
      // Clear input
      setNewMessage('');
    } catch (error) {
      console.error("[DEBUG] Error sending message:", error);
    }
  };

  // Render message item
  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    
    return (
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
        ]}>
          {item.content}
        </Text>
        <Text style={[
          styles.messageTime,
          isCurrentUser ? styles.currentUserMessageTime : styles.otherUserMessageTime
        ]}>
          {new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1A1F23" />
        <ActivityIndicator size="large" color="#05907A" />
        <Text style={styles.loadingText}>Loading conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F23" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.$id}
          contentContainerStyle={styles.messagesList}
          inverted
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() ? "#fff" : "#888"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1F23',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1F23',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1A1F23',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    marginBottom: 8,
    maxWidth: '80%',
  },
  currentUserMessage: {
    backgroundColor: '#05907A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    backgroundColor: '#2A3035',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserMessageText: {
    color: '#fff',
  },
  otherUserMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  currentUserMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1A1F23',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A3035',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    color: '#fff',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#05907A',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2A3035',
  },
});