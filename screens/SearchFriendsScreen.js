import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export default function SearchFriendsScreen() {
  return (
    <View style={styles.container}>
      <TextInput 
        style={styles.searchBar} 
        placeholder="Search for friends" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    padding: 20 
  },
  searchBar: { 
    height: 40, 
    backgroundColor: '#f0f0f0', 
    borderRadius: 10, 
    paddingHorizontal: 10 
  },
});