import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function NoConversationScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No conversations yet</Text>
      <Text style={styles.subtitle}>Start chatting with someone!</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('SearchFriends')}
      >
        <Text style={styles.buttonText}>Find Friends</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: '#666'
  },
  button: {
    backgroundColor: '#01CC97',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});