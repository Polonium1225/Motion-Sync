import React from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';

export default function CommunityScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Community</Text>
      <Button title="Post" onPress={() => {}} />
      <Button title="Chat" onPress={() => {}} />
      
      {/* Example Posts */}
      <View style={styles.postContainer}>
        <Text>User 1</Text>
        <Text>Lorem ipsum dolor sit amet...</Text>
      </View>
      <View style={styles.postContainer}>
        <Text>User 2</Text>
        <Text>Lorem ipsum dolor sit amet...</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#1F2229', // Added transparency for readability
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  postContainer: {
    marginTop: 10,
    backgroundColor: '#f4f4f4',
    padding: 10,
    borderRadius: 8,
  },
});
