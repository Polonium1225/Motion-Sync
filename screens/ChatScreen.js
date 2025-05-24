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
  Image,
  AppState
} from 'react-native';
import Colors from '../constants/Colors';
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

const DEFAULT_AVATAR = require('../assets/avatar.png');
const API_ENDPOINT = 'https://cloud.appwrite.io/v1'; 
const PROJECT_ID = '67d0bb27002cfc0b22d2';
const BUCKET_ID = 'profile_images';

export default function ChatScreen({ route, navigation }) {
  const { 
    friendId = '', 
    friendName = 'Unknown', 
    conversationId = '' 
  } = route.params || {};

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
  const [isChatActive, setIsChatActive] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');


  // Add a ref for unique temporary IDs
  const tempIdCounter = useRef(0);

  const keyExtractor = (item) => {
    // For pending messages, use their uniqueTempId with a prefix
    if (item.$id.startsWith('temp_')) {
      return `pending_${item.uniqueTempId || Date.now()}`;
    }
    // For confirmed messages, add a prefix and ensure uniqueness
    return `confirmed_${item.$id}_${item.$createdAt || Date.now()}`;
  };

  // ==================== UTILITY FUNCTIONS ====================

  const findExistingConversation = async (userId, friendId) => {
    try {
      // Check both possible conversation directions
      const [response1, response2] = await Promise.all([
        databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CONVERSATIONS,
          [
            Query.equal('participant1', userId),
            Query.equal('participant2', friendId)
          ]
        ),
        databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CONVERSATIONS,
          [
            Query.equal('participant1', friendId),
            Query.equal('participant2', userId)
          ]
        )
      ]);

      return response1.documents[0] || response2.documents[0] || null;
    } catch (error) {
      console.error("Error finding conversation:", error);
      return null;
    }
  };

  const createConversation = async (userId, friendId) => {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        ID.unique(),
        {
          participant1: userId,
          participant2: friendId,
          lastMessage: "",
          lastMessageAt: new Date().toISOString()
        }
      );
      return response.$id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  };

  const subscribeToFriendStatus = () => {
    // Implement status subscription
    const interval = setInterval(async () => {
      try {
        const profile = await userProfiles.getProfileByUserId(friendId);
        setFriendData(prev => ({
          ...prev,
          status: profile.status || 'offline'
        }));
      } catch (error) {
        console.error("Error fetching friend status:", error);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  };

  // ==================== LIFECYCLE EFFECTS ====================

  // App state handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      setIsChatActive(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Online status management
  useEffect(() => {
    let mounted = true;
    const setOnlineStatus = async () => {
      try {
        const user = await account.get();
        if (mounted) await userProfiles.safeUpdateStatus(user.$id, 'online');
      } catch {}
    };

    setOnlineStatus();
    return () => {
      mounted = false;
      const setOfflineStatus = async () => {
        try {
          const user = await account.get();
          await userProfiles.safeUpdateStatus(user.$id, 'offline');
        } catch {}
      };
      setOfflineStatus();
    };
  }, []);

  // Back handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.navigate('FindFriend');
        return true;
      }
    );
    return () => backHandler.remove();
  }, [navigation]);

  // Core chat initialization
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        const user = await account.get();
        setCurrentUserId(user.$id);
        setCurrentUserName(user.name);
    
        // Load friend profile with proper avatar URL
        const friendProfile = await userProfiles.getProfileByUserId(friendId);
        let avatarUrl = DEFAULT_AVATAR;
        
        if (friendProfile.avatar) {
          avatarUrl = `${API_ENDPOINT}/storage/buckets/profile_images/files/${friendProfile.avatar}/view?project=${PROJECT_ID}`;
        }
    
        setFriendData({
          avatar: avatarUrl,
          status: friendProfile.status || 'offline'
        });

        // Handle conversation ID
        if (conversationId.startsWith('new_')) {
          const existingConv = await findExistingConversation(user.$id, friendId);
          if (existingConv) {
            setDbConversationId(existingConv.$id);
            await loadMessages(existingConv.$id);
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
    const unsubscribeMessages = subscribeToMessages();
    const unsubscribeStatus = subscribeToFriendStatus();

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [conversationId, friendId]);

  // Smart polling mechanism (updated)
  useEffect(() => {
    const loadMessagesWithRetry = async () => {
      try {
        await loadMessages(dbConversationId);
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
  
    const startPolling = () => {
      if (!dbConversationId) return;
      
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      
      const interval = isChatActive ? 1000 : 5000;
      pollingIntervalRef.current = setInterval(loadMessagesWithRetry, interval);
    };
  
    startPolling();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [dbConversationId, isChatActive]);

  // ==================== CHAT FUNCTIONS ====================

  const loadMessages = async (convId, retryCount = 0) => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [
          Query.equal('conversationId', convId),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );
  
      setMessages(prev => {
        const currentIds = new Set(prev.confirmed.map(msg => msg.$id));
        const newMessages = response.documents.filter(
          msg => !currentIds.has(msg.$id)
        );
  
        if (newMessages.length > 0) {
          return {
            confirmed: [...newMessages, ...prev.confirmed],
            pending: prev.pending
          };
        }
        return prev;
      });
    } catch (error) {
      console.log("Error loading messages:", error);
      setErrorMessage('Connection issues - messages might not load properly');
      setTimeout(() => setErrorMessage(''), 5000);
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadMessages(convId, retryCount + 1);
      }
    }
  };

  const subscribeToMessages = () => {
    if (!dbConversationId) return () => {};

    return realtime.subscribe(
      [`databases.${DATABASE_ID}.collections.${COLLECTIONS.MESSAGES}.documents`],
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create') &&
            response.payload.conversationId === dbConversationId) {
          
          setMessages(prev => {
            const exists = prev.confirmed.some(msg => 
              msg.$id === response.payload.$id || 
              msg.messageId === response.payload.messageId
            );

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !dbConversationId || isSending) return;

    setIsSending(true);
    
    // Generate unique temp ID with counter
    tempIdCounter.current += 1;
    const tempId = `temp_${Date.now()}_${tempIdCounter.current}`;
    
    const messageData = {
      messageId: `msg_${Date.now()}_${tempIdCounter.current}`,
      content: newMessage.trim(),
      conversationId: dbConversationId,
      senderId: currentUserId,
      $id: tempId,
      uniqueTempId: tempId, // Add unique identifier for pending messages
      $createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => ({
      ...prev,
      pending: { ...prev.pending, [tempId]: messageData }
    }));

    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.MESSAGES,
        ID.unique(),
        {
          ...messageData,
          $id: undefined,
          uniqueTempId: undefined
        }
      );

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.CONVERSATIONS,
        dbConversationId,
        {
          lastMessage: newMessage.trim(),
          lastMessageAt: new Date().toISOString()
        }
      );

      setMessages(prev => ({
        confirmed: [response, ...prev.confirmed],
        pending: Object.fromEntries(
          Object.entries(prev.pending).filter(([id]) => id !== tempId)
        )
      }));
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => ({
        ...prev,
        pending: {
          ...prev.pending,
          [tempId]: { ...prev.pending[tempId], status: 'failed' }
        }
      }));
    } finally {
      setIsSending(false);
      setNewMessage('');
    }
  };

  // ==================== UI COMPONENTS ====================

  {errorMessage ? (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{errorMessage}</Text>
    </View>
  ) : null}

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
          <Image 
            source={typeof friendData.avatar === 'string' ? { uri: friendData.avatar } : friendData.avatar}
            style={styles.avatarImage}
            defaultSource={DEFAULT_AVATAR}
          />
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

  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    const isPending = item.isPending || item.$id.startsWith('temp_');
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
          data={[
            ...Object.values(messages.pending).map(msg => ({ ...msg, isPending: true })),
            ...messages.confirmed
              .filter(msg => !Object.values(messages.pending).some(
                pendingMsg => pendingMsg.messageId === msg.messageId
              ))
              .map(msg => ({ ...msg, isPending: false }))
          ].sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))}
          renderItem={renderMessageItem}
          keyExtractor={keyExtractor}
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
    backgroundColor: '#1A1F23',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1F23'
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#1A1F23',
    borderBottomWidth: 1,
    borderBottomColor: '#2D3439'
  },
  backButton: {
    marginRight: 15
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1A1F23'
  },
  headerTextContainer: {
    flex: 1
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerStatus: {
    fontSize: 14,
    marginTop: 2
  },
  headerRight: {
    width: 24
  },
  keyboardAvoidingView: {
    flex: 1
  },
  messagesList: {
    paddingVertical: 15,
    paddingHorizontal: 10
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#05907A',
    borderBottomRightRadius: 2
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2D3439',
    borderBottomLeftRadius: 2
  },
  pendingMessage: {
    opacity: 0.7
  },
  failedMessage: {
    borderWidth: 1,
    borderColor: '#ff4444'
  },
  messageText: {
    fontSize: 16
  },
  currentUserMessageText: {
    color: 'white'
  },
  otherUserMessageText: {
    color: '#E0E0E0'
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  messageTime: {
    fontSize: 12
  },
  currentUserMessageTime: {
    color: 'rgba(255,255,255,0.7)'
  },
  otherUserMessageTime: {
    color: 'rgba(255,255,255,0.5)'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#2D3439',
    borderTopWidth: 1,
    borderTopColor: '#3A4249'
  },
  input: {
    flex: 1,
    backgroundColor: '#3A4249',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    marginRight: 10
  },
  sendButton: {
    backgroundColor: '#05907A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#3A4249'
  },
  errorBanner: {
    backgroundColor: '#ff4444',
    padding: 10,
    alignItems: 'center'
  },
  errorText: {
    color: 'white',
    fontSize: 14
  },
});