import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function NoConversationScreen() {
  const navigation = useNavigation();
  
  return (
    <View style={styles.centeredContainer}>
      <Text style={styles.noConversationText}>No Conversation</Text>
      <Text style={styles.subText}>Add some friends and start chatting with them.</Text>
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={() => navigation.navigate('Community')}
      >
        <Text style={styles.navButtonText}>Add Friends</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centeredContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: '#fff'
  },
  noConversationText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  subText: { 
    fontSize: 16, 
    color: 'gray', 
    marginBottom: 20 
  },
  navButton: { 
    backgroundColor: '#007BFF', 
    padding: 10, 
    borderRadius: 5, 
    alignItems: 'center', 
    marginTop: 10 
  },
  navButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});