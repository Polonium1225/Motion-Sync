import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  SafeAreaView,
  BackHandler,
  Image
} from 'react-native';
import { 
  databases, 
  account, 
  DATABASE_ID, 
  ID, 
  userProfiles, 
  COLLECTIONS,
  realtime
} from "../lib/AppwriteService";
import { Query } from 'appwrite';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../assets/avatar.png'); // Make sure this path is correct

export default function ChatScreen({ route, navigation }) {
  const { 
    friendId = '', 
    friendName = 'Unknown', 
    conversationId = '' 
  } = route.params || {};

  console.log("[CHAT] Initial params:", { friendId, friendName, conversationId });

  const [messages, setMessages] = useState({
    confirmed: [], 
    pending: {}    
  });
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dbConversationId, setDbConversationId] = useState(null);
  const [friendData, setFriendData] = useState({ 
    avatar: 'avatar.png', 
    status: 'offline' 
  });
  const flatListRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingMessages, setPendingMessages] = useState({});

  // Set user as online when entering chat
  useEffect(() => {
    let mounted = true;
  
    const setOnlineStatus = async () => {
      try {
        const user = await account.get();
        if (mounted) {
          await userProfiles.safeUpdateStatus(user.$id, 'online');
        }
      } catch {} // Ignore errors
    };
  
    setOnlineStatus();
  
    return () => {
      mounted = false;
      const setOfflineStatus = async () => {
        try {
          const user = await account.get();
          await userProfiles.safeUpdateStatus(user.$id, 'offline');
        } catch {} // Ignore errors
      };
      setOfflineStatus();
    };
  }, []);

  // Handle back button
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('FindFriend');
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // Initialize chat and get friend data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        
        // Get current user info
        const user = await account.get();
        setCurrentUserId(user.$id);
        setCurrentUserName(user.name);
  
        // Get friend profile data
        const friendProfile = await userProfiles.getProfileByUserId(friendId);
        setFriendData({
          avatar: friendProfile.avatar || 'avatar.png',
          status: friendProfile.status || 'offline'
        });
  
        // Check if this is a new conversation or existing one
        if (conversationId.startsWith('new_')) {
          const existingConversation = await findExistingConversation(user.$id, friendId);
          
          if (existingConversation) {
            setDbConversationId(existingConversation.$id);
            await loadMessages(existingConversation.$id);
          } else {
            const newConvId = await createConversation(user.$id, friendId);
            setDbConversationId(newConvId);
          }
        } else {
          setDbConversationId(conversationId);
          await loadMessages(conversationId);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    initializeChat();
    
    // Set up real-time subscriptions
    const unsubscribeMessages = subscribeToMessages();
    const unsubscribeStatus = subscribeToFriendStatus();
    
    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [conversationId, friendId]);

  // auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: 0, animated: true });
    }
  }, [messages]);

  // Subscribe to friend's status changes
  const subscribeToFriendStatus = () => {
    const interval = setInterval(async () => {
      try {
        const friendProfile = await userProfiles.getProfileByUserId(friendId);
        setFriendData(prev => ({
          ...prev,
          status: friendProfile.status || 'offline'
        }));
      } catch (error) {
        console.error("Status update error:", error);
      }
    }, 10000); // Every 10 seconds
  
    return () => clearInterval(interval);
  };

  // Find if a conversation already exists between the two users
  const findExistingConversation = async (userId, friendId) => {
    try {
      // First query for participant1=userId and participant2=friendId
      const response1 = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
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
        COLLECTIONS.CONVERSATIONS,
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
        COLLECTIONS.CONVERSATIONS,
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
        COLLECTIONS.MESSAGES,
        [
          Query.equal('conversationId', convId),
          Query.orderDesc('$createdAt'),
          Query.limit(50) // Adjust limit as needed
        ]
      );
      
      setMessages(prev => ({
        ...prev,
        confirmed: response.documents
      }));
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Set up real-time message subscription
  const subscribeToMessages = () => {
    if (!dbConversationId) return () => {};
  
    return realtime.subscribe(
      [`databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`],
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create') &&
            response.payload.conversationId === dbConversationId) {
          
          setMessages(prev => {
            // Check if we already have this message
            const exists = prev.confirmed.some(msg => msg.$id === response.payload.$id) ||
                           (response.payload.messageId && 
                            prev.confirmed.some(msg => msg.messageId === response.payload.messageId));
  
            if (!exists) {
              return {
                confirmed: [response.payload, ...prev.confirmed],
                pending: prev.pending
              };
            }
            return prev;
          });
        }
      }
    );
  };

  const allMessages = useMemo(() => {
    const pending = Object.values(messages.pending);
    return [...pending, ...messages.confirmed].sort((a, b) => 
      new Date(b.$createdAt) - new Date(a.$createdAt)
    );
  }, [messages]);

  // Send a new message
  // Corrected sendMessage function
  const sendMessage = async () => {
    if (!newMessage.trim() || !dbConversationId || isSending) return;
  
    setIsSending(true);
    const tempId = `temp_${Date.now()}`;
    const messageData = {
      messageId: `msg_${new Date().getTime()}`,
      content: newMessage.trim(),
      conversationId: dbConversationId,
      senderId: currentUserId,
      $id: tempId,
      $createdAt: new Date().toISOString(),
      status: 'sending'
    };
  
    // Add to pending messages
    setMessages(prev => ({
      ...prev,
      pending: {
        ...prev.pending,
        [tempId]: messageData
      }
    }));
  
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          ...messageData,
          $id: undefined // Let server generate ID
        }
      );
  
      // Update conversation last message
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        dbConversationId,
        {
          lastMessage: newMessage.trim(),
          lastMessageAt: new Date()
        }
      );
  
      // Move from pending to confirmed
      setMessages(prev => ({
        confirmed: [response, ...prev.confirmed],
        pending: Object.fromEntries(
          Object.entries(prev.pending).filter(([id]) => id !== tempId)
        )
      }));
  
    } catch (error) {
      console.error("Error sending message:", error);
      // Mark as failed
      setMessages(prev => ({
        ...prev,
        pending: {
          ...prev.pending,
          [tempId]: {
            ...prev.pending[tempId],
            status: 'failed'
          }
        }
      }));
    } finally {
      setIsSending(false);
      setNewMessage('');
    }
  };

  // Enhanced header component
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.navigate('FindFriend')}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      
      <View style={styles.headerUserInfo}>
        <View style={styles.avatarContainer}>
          {friendData.avatar && friendData.avatar !== 'avatar.png' ? (
            <Image 
              source={{ uri: friendData.avatar }} 
              style={styles.avatarImage}
              defaultSource={DEFAULT_AVATAR}
            />
          ) : (
            <Image 
              source={DEFAULT_AVATAR}
              style={styles.avatarImage}
            />
          )}
          <View style={[
            styles.statusIndicator,
            { backgroundColor: friendData.status === 'online' ? '#4CAF50' : '#9E9E9E' }
          ]} />
        </View>
        
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{friendName}</Text>
          <Text style={[
            styles.headerStatus,
            { color: friendData.status === 'online' ? '#4CAF50' : '#9E9E9E' }
          ]}>
            {friendData.status === 'online' ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerRight} />
    </View>
  );

  // Render message item
  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    const isPending = item.$id.startsWith('temp_');
    const isFailed = item.status === 'failed';
  
    return (
      <View style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        isPending && styles.pendingMessage,
        isFailed && styles.failedMessage
      ]}>
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText
        ]}>
          {item.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserMessageTime : styles.otherUserMessageTime
          ]}>
            {new Date(item.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isPending && (
            <ActivityIndicator size="small" color="#999" style={styles.statusIndicator} />
          )}
          {isFailed && (
            <Ionicons name="warning" size={16} color="#ff4444" style={styles.statusIndicator} />
          )}
        </View>
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
      
      {renderHeader()}
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={allMessages}
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
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={newMessage.trim() && !isSending ? "#fff" : "#888"} 
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1A1F23',
  },
  backButton: {
    marginRight: 15,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusIndicator: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#1A1F23',
    bottom: 0,
    right: 0,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 12,
  },
  headerRight: {
    width: 24, // Same as back button for balance
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#01CC97',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserMessageText: {
    color: '#fff',
  },
  otherUserMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  currentUserMessageTime: {
    color: '#e0e0e0',
  },
  otherUserMessageTime: {
    color: '#777',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#01CC97',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
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
  debugContainer: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  statusIndicator: {
    marginLeft: 8
  },
  pendingMessage: {
    opacity: 0.7
  },
  failedMessage: {
    borderColor: '#ff4444',
    borderWidth: 1
  }
});