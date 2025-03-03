import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import BadgesMilestoneCard from '../components/BadgesMilestoneCard';
export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance</Text>
      <Text style={styles.description}>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</Text>
      <BadgesMilestoneCard/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
  },
});
