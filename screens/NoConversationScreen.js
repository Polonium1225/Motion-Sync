import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, SafeAreaView } from 'react-native';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';

export default function NoConversationScreen({ navigation }) {
  return (
    <ImageBackground
      source={backgroundImage}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={{ flex: 1 }}>
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
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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