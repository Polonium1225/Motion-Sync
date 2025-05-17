import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // You can use FontAwesome icons
import Colors from '../constants/color';

export default function BadgesMilestoneCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Badges & Milestone</Text>

      {/* List Items */}
      <View style={styles.listItem}>
        <Icon name="lock" size={20} color={Colors.primary} />
        <Text style={styles.listText}>Badges & Milestones</Text>
      </View>

      <View style={styles.listItem}>
        <Icon name="check-square" size={20} color={Colors.primary} />
        <Text style={styles.listText}>XP & Levels</Text>
      </View>

      <View style={styles.listItem}>
        <Icon name="bullseye" size={20} color={Colors.primary} />
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
    backgroundColor: '#0c1423',
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
    width: '90%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.textPrimary,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  listText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.surfaceDark,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: "#ff4c48",  // Correct property
    width:200,
    borderWidth: 2,          // Required for the border to appear
    borderRadius: 30,
    marginTop: 15,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
