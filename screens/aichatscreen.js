// screens/ChatScreen.js - Version avec thème rouge adapté
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Easing,
  Dimensions,
  ImageBackground,
  SafeAreaView,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

// Import your background image - adjust path as needed
import backgroundImage from '../assets/sfgsdh.png';

const { width: screenWidth } = Dimensions.get('window');

// ✅ CORRECTION: Import conditionnel du service AI avec fallback
let AIService = null;
try {
  AIService = require('../ilb/aiService').default;
  console.log('✅ AIService imported successfully');
} catch (error) {
  console.warn('⚠️ AIService not available:', error.message);
  // Try alternative import path
  try {
    AIService = require('../lib/aiService');
    console.log('✅ AIService imported with alternative path');
  } catch (error2) {
    console.warn('⚠️ AIService still not available:', error2.message);
  }
}

const ChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [userActions, setUserActions] = useState([]);
  const [hasError, setHasError] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const messageAnimations = useRef({}).current;

  useEffect(() => {
    console.log('🎬 ChatScreen: Initialisation');
    initializeChat();

    // Keyboard listeners
    const keyboardWillShow = (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const keyboardDidShow = (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    };

    const keyboardDidHide = () => {
      setKeyboardHeight(0);
    };

    // Add listeners based on platform
    let keyboardShowListener, keyboardHideListener;

    if (Platform.OS === 'ios') {
      keyboardShowListener = Keyboard.addListener('keyboardWillShow', keyboardWillShow);
      keyboardHideListener = Keyboard.addListener('keyboardWillHide', keyboardWillHide);
    } else {
      keyboardShowListener = Keyboard.addListener('keyboardDidShow', keyboardDidShow);
      keyboardHideListener = Keyboard.addListener('keyboardDidHide', keyboardDidHide);
    }

    // Cleanup function
    return () => {
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
    };
  }, []);

  const initializeChat = async () => {
    try {
      await loadChatHistory();
      await loadUserData();
      await loadUserActions();
      startEntranceAnimations();
      startPulseAnimation();
      
      // ✅ CORRECTION: Test du service AI avec gestion d'erreur
      if (AIService) {
        console.log('🧪 Testing AI service...');
        // Test silencieux sans bloquer l'interface
        try {
          const isWorking = await AIService.testAPI();
          console.log('🧪 AI Service test result:', isWorking);
          if (!isWorking) {
            console.warn('⚠️ AI Service test failed, but continuing...');
          }
        } catch (error) {
          console.warn('⚠️ AI Service test error:', error);
        }
      } else {
        console.warn('⚠️ AIService not loaded, using fallback responses');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation ChatScreen:', error);
      setHasError(true);
    }
  };

  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startPulseAnimation = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
  };

  const animateTyping = () => {
    const typing = Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(typingAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    typing.start();
    return typing;
  };

  const animateNewMessage = (messageId) => {
    if (!messageAnimations[messageId]) {
      messageAnimations[messageId] = new Animated.Value(0);
    }
    
    Animated.spring(messageAnimations[messageId], {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const loadUserData = async () => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      if (currentUser) {
        const user = JSON.parse(currentUser);
        setUserData(user);
        console.log('👤 Données utilisateur chargées:', user.name);
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement données utilisateur:', error);
    }
  };

  const loadUserActions = async () => {
    try {
      const actions = await AsyncStorage.getItem('userActions');
      if (actions) {
        const parsedActions = JSON.parse(actions);
        setUserActions(parsedActions);
        console.log('📋 Actions utilisateur chargées:', parsedActions.length);
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement actions:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const chatHistory = await AsyncStorage.getItem('chatHistory');
      if (chatHistory) {
        const messages = JSON.parse(chatHistory);
        setMessages(messages);
        console.log('💬 Historique chat chargé:', messages.length);
        
        if (messages.length === 0) {
          addWelcomeMessage();
        }
      } else {
        addWelcomeMessage();
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement historique:', error);
      addWelcomeMessage();
    }
  };

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: 'welcome-' + Date.now(),
      text: '🤖 Hello! I\'m MotionSync AI, your intelligent movement analysis assistant!\n\nI can help you with:\n• Exercise form analysis and corrections\n• Motion tracking setup and optimization\n• Understanding your movement quality scores\n• Personalized training recommendations\n\nReady to perfect your technique? Let\'s get moving! 💪',
      isUser: false,
      timestamp: new Date().toISOString(),
    };
    
    setMessages([welcomeMessage]);
    animateNewMessage(welcomeMessage.id);
    console.log('🎉 MotionSync welcome message added');
  };

  const saveChatHistory = async (newMessages) => {
    try {
      await AsyncStorage.setItem('chatHistory', JSON.stringify(newMessages));
      console.log('💾 Historique sauvegardé');
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde historique:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) {
      console.log('⚠️ Message vide');
      return;
    }

    const userMessage = {
      id: 'user-' + Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Envoi du message:', userMessage.text);

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    animateNewMessage(userMessage.id);
    setInputText('');
    setIsLoading(true);

    const typingAnimation = animateTyping();

    try {
      let aiMessage;

      // ✅ CORRECTION: Better fallback handling
      if (!AIService) {
        console.log('⚠️ AIService not available, using fallback response');
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate waiting
        
        // Create MotionSync-focused fallback responses
        const fallbackResponses = [
          '🤖 AI Assistant temporarily offline. Here are key MotionSync tips:\n\n• Ensure good lighting and camera positioning\n• Wear fitted clothing for better motion tracking\n• Check that your full body is visible in frame\n• Look for 85%+ confidence scores\n• Focus on controlled, deliberate movements',
          '📱 While I\'m reconnecting, remember:\n\n• Position camera 6-8 feet away at chest height\n• MotionSync analyzes 33 body points for accuracy\n• Red zones in analysis indicate form corrections needed\n• Green feedback means optimal technique\n• Use stable phone placement for best results',
          '🎯 Quick motion analysis reminders:\n\n• Quality over quantity - perfect your form first\n• Use MotionSync\'s real-time feedback during exercises\n• Compare your technique with professional models\n• Track your motion quality scores over time\n• Gradual improvement leads to better results'
        ];
        
        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        
        aiMessage = {
          id: 'ai-' + Date.now(),
          text: randomResponse,
          isUser: false,
          timestamp: new Date().toISOString(),
          isOffline: true,
        };
      } else {
        // Use AI service normally
        try {
          console.log('🤖 Using AI service for response');
          const response = await AIService.sendMessage(
            userMessage.text, 
            userData, 
            userActions
          );

          if (response.success) {
            aiMessage = {
              id: 'ai-' + Date.now(),
              text: response.message,
              isUser: false,
              timestamp: response.timestamp,
            };
          } else {
            aiMessage = {
              id: 'error-' + Date.now(),
              text: response.message || '🤖 Sorry, I\'m experiencing technical difficulties.',
              isUser: false,
              timestamp: new Date().toISOString(),
              isError: true,
            };
          }
        } catch (aiError) {
          console.error('🤖 AI Service error:', aiError);
          aiMessage = {
            id: 'error-' + Date.now(),
            text: '🤖 I\'m having trouble connecting right now. Quick tip: Make sure your camera is positioned 6-8 feet away for optimal motion tracking, and check that MotionSync can see your full body in the frame! 📱',
            isUser: false,
            timestamp: new Date().toISOString(),
            isOffline: true,
          };
        }
      }

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      animateNewMessage(aiMessage.id);
      saveChatHistory(finalMessages);

    } catch (error) {
      console.error('💥 Erreur envoi message:', error);
      
      const errorMessage = {
        id: 'error-' + Date.now(),
        text: '🤖 An unexpected error occurred. Can you try again?',
        isUser: false,
        timestamp: new Date().toISOString(),
        isError: true,
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      animateNewMessage(errorMessage.id);

    } finally {
      setIsLoading(false);
      typingAnimation.stop();
      typingAnim.setValue(0);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear the entire conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await AsyncStorage.removeItem('chatHistory');
            addWelcomeMessage();
            console.log('🗑️ Historique effacé');
          },
        },
      ]
    );
  };

  const getQuickSuggestions = () => {
    // ✅ MotionSync-focused suggestions with fallback
    const defaultSuggestions = [
      '📹 Camera setup guide',
      '🎯 Improve exercise form', 
      '📊 Understanding motion scores',
      '🏃 Analyze movement patterns',
    ];

    if (AIService && typeof AIService.getSuggestedQuestions === 'function') {
      try {
        return AIService.getSuggestedQuestions(userData, userActions);
      } catch (error) {
        console.warn('⚠️ Error getting suggestions:', error);
        return defaultSuggestions;
      }
    }

    return defaultSuggestions;
  };

  const sendQuickMessage = (suggestion) => {
    setInputText(suggestion.replace(/^[^\s]+\s/, ''));
    console.log('⚡ Suggestion sélectionnée:', suggestion);
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '00:00';
    }
  };

  const renderMessage = ({ item, index }) => {
    const animation = messageAnimations[item.id] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
          {
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {!item.isUser && (
          <Animated.View 
            style={[
              styles.aiAvatar,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Ionicons 
              name={item.isOffline ? "wifi-outline" : "chatbubble-ellipses"} 
              size={16} 
              color={item.isOffline ? "#F59E0B" : "#ff4c48"} 
            />
          </Animated.View>
        )}
        
        <View style={[
          styles.messageBubble,
          item.isUser ? styles.userMessage : styles.aiMessage,
          item.isError && styles.errorMessage,
          item.isOffline && styles.offlineMessage,
        ]}>
          <Text style={[
            styles.messageText,
            item.isUser ? styles.userMessageText : styles.aiMessageText,
            item.isError && styles.errorMessageText,
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            item.isUser ? styles.userMessageTime : styles.aiMessageTime,
          ]}>
            {formatTimestamp(item.timestamp)}
            {item.isOffline && ' • Offline'}
          </Text>
        </View>

        {item.isUser && userData && (
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {userData.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isLoading) return null;

    return (
      <Animated.View 
        style={[
          styles.typingContainer,
          {
            opacity: typingAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            }),
          },
        ]}
      >
        <View style={styles.aiAvatar}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#ff4c48" />
        </View>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            {[0, 1, 2].map(index => (
              <Animated.View 
                key={index}
                style={[
                  styles.typingDot,
                  {
                    transform: [{
                      scale: typingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    }],
                  },
                ]} 
              />
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  // ✅ CORRECTION: Écran d'erreur si problème critique
  if (hasError) {
    return (
      <ImageBackground source={backgroundImage} style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={64} color="#ff4c48" />
          <Text style={styles.errorTitle}>Loading Error</Text>
          <Text style={styles.errorText}>
            Unable to load AI assistant.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setHasError(false);
              initializeChat();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={backgroundImage} style={styles.backgroundImage} resizeMode="cover">
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <Animated.View 
            style={[
              styles.overlay,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Animated.View 
              style={[
                styles.headerIcon,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Ionicons name="chatbubbles" size={24} color="#ff4c48" />
            </Animated.View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Fitness Assistant</Text>
              <Text style={styles.headerSubtitle}>
                {userData ? `Hello ${userData.name}!` : 'Your personal fitness guide'}
              </Text>
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Suggestions */}
        {messages.length <= 1 && (
          <Animated.View 
            style={[
              styles.suggestionsContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Text style={styles.suggestionsTitle}>Quick suggestions:</Text>
            <View style={styles.suggestionsList}>
              {getQuickSuggestions().map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => sendQuickMessage(suggestion)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContainer,
            { paddingBottom: keyboardHeight > 0 ? 10 : 20 } // Adjust when keyboard is open
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderTypingIndicator}
          onContentSizeChange={() => {
            // Auto scroll to bottom when new messages arrive
            if (messages.length > 0) {
              setTimeout(() => {
                try {
                  // Scroll to end when content changes
                } catch (error) {
                  console.log('Scroll error:', error);
                }
              }, 100);
            }
          }}
        />

        {/* Input */}
        <View 
          style={[
            styles.inputContainer,
            { marginBottom: keyboardHeight > 0 ? keyboardHeight - (Platform.OS === 'ios' ? 34 : 0) : 0 }
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="rgba(255, 255, 255, 0.6)"
              multiline
              maxLength={500}
              editable={!isLoading}
              onFocus={() => {
                // Optional: Auto-scroll to bottom when input is focused
                setTimeout(() => {
                  // Could add auto scroll logic here if needed
                }, 300);
              }}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons 
                  name={isLoading ? "hourglass-outline" : "send"} 
                  size={20} 
                  color="white" 
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Fallback color
  },
  backgroundImage: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    margin: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  retryButton: {
    backgroundColor: '#ff4c48',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: Platform.OS === 'ios' ? 10 : 40, // Adjust for status bar
    paddingBottom: 15,
    paddingHorizontal: 20,
    backdropFilter: 'blur(10px)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionsContainer: {
    margin: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    backdropFilter: 'blur(10px)',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: 'rgba(255, 76, 72, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ff4c48',
  },
  suggestionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4c48',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: screenWidth * 0.75,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#ff4c48',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#ff4c48',
  },
  offlineMessage: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#fff',
  },
  errorMessageText: {
    color: '#ff4c48',
  },
  messageTime: {
    fontSize: 11,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  typingBubble: {
    backgroundColor: 'rgba(255, 76, 72, 0.1)',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 72, 0.3)',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4c48',
    marginHorizontal: 2,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area for home indicator
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    paddingBottom: 15, // Consistent bottom padding
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff4c48',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff4c48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatScreen;