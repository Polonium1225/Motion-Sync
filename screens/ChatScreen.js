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
  AppState,
  Animated
} from 'react-native';
import ImageBackground from 'react-native/Libraries/Image/ImageBackground';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';
import { 
  conversations,
  messages as messagesService,
  userProfiles,
  getUserId,
  realtime,
  supabase
} from "../lib/SupabaseService"; // Updated imports
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../assets/avatar.png');

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
    avatar: DEFAULT_AVATAR, 
    status: 'offline' 
  });
  const [isChatActive, setIsChatActive] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const realtimeSubscription = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const statusPulse = useRef(new Animated.Value(1)).current;

  // Add a ref for unique temporary IDs
  const tempIdCounter = useRef(0);

  const keyExtractor = (item, index) => {
    // For pending messages, use their uniqueTempId with a prefix and index
    if (item.id && item.id.toString().startsWith('temp_')) {
      return `pending_${item.uniqueTempId || item.id}_${index}`;
    }
    // For confirmed messages, use id with index as fallback for uniqueness
    return `confirmed_${item.id}_${index}_${item.messageId || ''}`;
  };

  // ==================== UTILITY FUNCTIONS ====================

  const findExistingConversation = async (userId, friendId) => {
    try {
      // Check both possible conversation directions
      const { data: conversations1, error: error1 } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1', userId)
        .eq('participant2', friendId);

      const { data: conversations2, error: error2 } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant1', friendId)
        .eq('participant2', userId);

      if (error1 && error2) {
        console.error("Error finding conversation:", error1, error2);
        return null;
      }

      return conversations1?.[0] || conversations2?.[0] || null;
    } catch (error) {
      console.error("Error finding conversation:", error);
      return null;
    }
  };

  const createConversation = async (userId, friendId) => {
    try {
      const newConversation = await conversations.createConversation(userId, friendId);
      return newConversation.id;
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

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 4,
        bounciness: 6,
        useNativeDriver: true,
      })
    ]).start();

    // Status pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    if (friendData.status === 'online') {
      pulseLoop.start();
    }

    return () => pulseLoop.stop();
  }, [friendData.status]);

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
        const userId = await getUserId();
        if (mounted && userId) {
          await userProfiles.updateStatus(userId, 'online');
        }
      } catch (error) {
        console.error('Error setting online status:', error);
      }
    };

    setOnlineStatus();
    return () => {
      mounted = false;
      const setOfflineStatus = async () => {
        try {
          const userId = await getUserId();
          if (userId) {
            await userProfiles.updateStatus(userId, 'offline');
          }
        } catch (error) {
          console.error('Error setting offline status:', error);
        }
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
        const userId = await getUserId();
        if (!userId) {
          setErrorMessage('Please log in to access chat');
          setIsLoading(false);
          return;
        }

        setCurrentUserId(userId);
    
        // Get current user profile for name
        const currentUserProfile = await userProfiles.getProfileByUserId(userId);
        setCurrentUserName(currentUserProfile?.name || 'User');

        // Load friend profile with avatar
        const friendProfile = await userProfiles.getProfileByUserId(friendId);
        let avatarSource = DEFAULT_AVATAR;
        
        if (friendProfile.avatar) {
          avatarSource = { uri: friendProfile.avatar };
        }
    
        setFriendData({
          avatar: avatarSource,
          status: friendProfile.status || 'offline'
        });

        // Handle conversation ID
        if (conversationId.startsWith('new_')) {
          const existingConv = await findExistingConversation(userId, friendId);
          if (existingConv) {
            setDbConversationId(existingConv.id);
            await loadMessages(existingConv.id);
          } else {
            const newConvId = await createConversation(userId, friendId);
            setDbConversationId(newConvId);
          }
        } else {
          setDbConversationId(conversationId);
          await loadMessages(conversationId);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setErrorMessage('Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
    const unsubscribeStatus = subscribeToFriendStatus();

    return () => {
      unsubscribeStatus();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (realtimeSubscription.current) {
        realtime.unsubscribe(realtimeSubscription.current);
      }
    };
  }, [conversationId, friendId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!dbConversationId) return;

    const subscribeToMessages = () => {
      realtimeSubscription.current = realtime.subscribeToMessages(
        dbConversationId,
        (payload) => {
          console.log('Real-time message received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setMessages(prev => {
              const exists = prev.confirmed.some(msg => 
                msg.id === payload.new.id || 
                msg.messageId === payload.new.messageId
              );

              if (!exists) {
                return {
                  confirmed: [payload.new, ...prev.confirmed],
                  pending: prev.pending
                };
              }
              return prev;
            });
          }
        }
      );
    };

    subscribeToMessages();

    return () => {
      if (realtimeSubscription.current) {
        realtime.unsubscribe(realtimeSubscription.current);
      }
    };
  }, [dbConversationId]);

  // Smart polling mechanism (fallback for real-time)
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
      
      // Less frequent polling when real-time is available
      const interval = isChatActive ? 5000 : 15000;
      pollingIntervalRef.current = setInterval(loadMessagesWithRetry, interval);
    };
  
    startPolling();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [dbConversationId, isChatActive]);

  // ==================== CHAT FUNCTIONS ====================

  const loadMessages = async (convId, retryCount = 0) => {
    if (!convId) return;

    try {
      const messagesList = await messagesService.getMessages(convId);
  
      setMessages(prev => {
        const currentIds = new Set(prev.confirmed.map(msg => msg.id));
        const newMessages = messagesList.filter(
          msg => !currentIds.has(msg.id)
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !dbConversationId || isSending) return;

    setIsSending(true);
    
    // Generate unique temp ID with counter
    tempIdCounter.current += 1;
    const tempId = `temp_${Date.now()}_${tempIdCounter.current}`;
    
    const messageData = {
      messageId: `msg_${Date.now()}_${tempIdCounter.current}`,
      content: newMessage.trim(),
      conversation_id: dbConversationId,
      sender_id: currentUserId,
      id: tempId,
      uniqueTempId: tempId, // Add unique identifier for pending messages
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => ({
      ...prev,
      pending: { ...prev.pending, [tempId]: messageData }
    }));

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const response = await messagesService.sendMessage(
        dbConversationId,
        currentUserId,
        messageContent
      );

      // Update conversation last message (optional - depends on your schema)
      try {
        await supabase
          .from('conversations')
          .update({
            last_message: messageContent,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbConversationId);
      } catch (updateError) {
        console.warn('Failed to update conversation last message:', updateError);
        // Non-critical error, don't throw
      }

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
      // Restore message to input if sending failed
      setNewMessage(messageContent);
      setErrorMessage('Failed to send message. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setIsSending(false);
    }
  };

  // ==================== UI COMPONENTS ====================

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.navigate('MainTabs', { screen: 'Community' })}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      
      <View style={styles.headerUserInfo}>
        <View style={styles.avatarContainer}>
          <Image 
            source={friendData.avatar}
            style={styles.avatarImage}
            defaultSource={DEFAULT_AVATAR}
          />
          <Animated.View 
            style={[
              styles.statusIndicator,
              { 
                backgroundColor: friendData.status === 'online' ? '#4CAF50' : '#9E9E9E',
                transform: friendData.status === 'online' ? [{ scale: statusPulse }] : [{ scale: 1 }]
              }
            ]} 
          />
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
      
      <TouchableOpacity style={styles.headerAction}>
        <Ionicons name="videocam-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderMessageItem = ({ item }) => {
    const isCurrentUser = item.sender_id === currentUserId;
    const isPending = item.isPending || (item.id && item.id.toString().startsWith('temp_'));
    const isFailed = item.status === 'failed';
  
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
      ]}>
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
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isPending && (
              <ActivityIndicator size="small" color="#999" style={styles.messageStatusIcon} />
            )}
            {isFailed && (
              <TouchableOpacity 
                onPress={() => {
                  // Retry sending failed message
                  setNewMessage(item.content);
                  setMessages(prev => ({
                    ...prev,
                    pending: Object.fromEntries(
                      Object.entries(prev.pending).filter(([id]) => id !== item.id)
                    )
                  }));
                }}
              >
                <Ionicons name="refresh" size={16} color="#ff4444" style={styles.messageStatusIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Animated.View 
          style={[
            styles.chatContainer,
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          {renderHeader()}
          
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={16} color="white" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={[
                ...Object.values(messages.pending).map((msg, index) => ({ ...msg, isPending: true, listIndex: `p_${index}` })),
                ...messages.confirmed
                  .filter(msg => !Object.values(messages.pending).some(
                    pendingMsg => pendingMsg.messageId === msg.messageId
                  ))
                  .map((msg, index) => ({ ...msg, isPending: false, listIndex: `c_${index}` }))
              ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))}
              renderItem={renderMessageItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.messagesList}
              inverted
              showsVerticalScrollIndicator={false}
            />
            
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  multiline
                  editable={!isSending}
                />
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    (!newMessage.trim() || isSending) && styles.sendButtonDisabled
                  ]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color="white"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingText: {
    color: Colors.textPrimary,
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 76, 72, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  messageContainer: {
    marginBottom: 12,
  },
  currentUserContainer: {
    alignItems: 'flex-end',
  },
  otherUserContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserMessage: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 5,
  },
  otherUserMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomLeftRadius: 5,
  },
  pendingMessage: {
    opacity: 0.7,
  },
  failedMessage: {
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserMessageText: {
    color: 'white',
  },
  otherUserMessageText: {
    color: Colors.textPrimary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  currentUserMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherUserMessageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageStatusIcon: {
    marginLeft: 6,
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 10,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});