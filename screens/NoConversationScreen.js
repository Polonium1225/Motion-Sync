import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/Colors';

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
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.textPrimary
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: Colors.textSecondary
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
  },
});