import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function NoConversationScreen() {
  const navigation = useNavigation();
  
  return (
    <View style={styles.centeredContainer}>
      <Text style={styles.noConversationText}>No Conversations Yet</Text>
      <Text style={styles.subText}>Add friends to start chatting</Text>
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={() => navigation.navigate('SearchFriends')}
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
    backgroundColor: '#1F2229',
    padding: 20 
  },
  noConversationText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: 'white',
    marginBottom: 10 
  },
  subText: { 
    fontSize: 16, 
    color: '#888', 
    marginBottom: 20 
  },
  navButton: { 
    backgroundColor: '#01CC97', 
    padding: 15,
    borderRadius: 30,
    width: 200,
    alignItems: 'center'
  },
  navButtonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});