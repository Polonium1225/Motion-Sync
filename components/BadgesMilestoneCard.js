import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // You can use FontAwesome icons
import Colors from '../constants/Colors';
import { useNavigation } from '@react-navigation/native';

export default function BadgesMilestoneCard({ navigation }) {
  const navigation3 = useNavigation();
  // Handle navigation to Badges and Milestones screen
  const handleNavigateToBadges = () => {
    navigation3.navigate('BadgesAndMilestonesScreen'); // Make sure this matches your route name
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Badges & Milestone</Text>

      {/* List Items */}
      <TouchableOpacity style={styles.listItem} onPress={handleNavigateToBadges}>
        <Icon name="trophy" size={20} color={Colors.primary} />
        <Text style={styles.listText}>Badges & Milestones</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.listItem} onPress={handleNavigateToBadges}>
        <Icon name="star" size={20} color={Colors.primary} />
        <Text style={styles.listText}>XP & Levels</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.listItem} onPress={handleNavigateToBadges}>
        <Icon name="bullseye" size={20} color={Colors.primary} />
        <Text style={styles.listText}>Daily & Weekly Goals</Text>
      </TouchableOpacity>

      {/* See Button */}
      <TouchableOpacity style={styles.button} onPress={handleNavigateToBadges}>
        <Text style={styles.buttonText}>View Achievements</Text>
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
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 8,
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
    width: 200,
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