import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // You can use FontAwesome icons

export default function BadgesMilestoneCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Badges & Milestone</Text>

      {/* List Items */}
      <View style={styles.listItem}>
        <Icon name="lock" size={20} color="#333" />
        <Text style={styles.listText}>Badges & Milestones</Text>
      </View>

      <View style={styles.listItem}>
        <Icon name="check-square" size={20} color="#333" />
        <Text style={styles.listText}>XP & Levels</Text>
      </View>

      <View style={styles.listItem}>
        <Icon name="bullseye" size={20} color="#333" />
        <Text style={styles.listText}>Daily & Weekly Goals</Text>
      </View>

      {/* See Button */}
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>see</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#9fc5e8',
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    width: '90%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  listText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
