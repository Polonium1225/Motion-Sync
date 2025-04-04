//NoConversationScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function NoConversationScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No conversations yet</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('SearchFriends')}
      >
        <Text style={styles.buttonText}>Add Friends</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#01CC97',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});