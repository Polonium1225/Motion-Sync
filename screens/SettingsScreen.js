import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';  // For icons like pencil, phone, etc.

export default function ProfileSettings() {
  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Profile Image */}
        <Image
          source={require('../assets/icon.png')}  // Replace with actual profile image
          style={styles.profileImage}
        />
        <Text style={styles.fullName}>FULL NAME</Text>

        {/* Edit Profile Button */}
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>EDIT PROFILE</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Buttons */}
      <TouchableOpacity style={styles.settingButton}>
        <Text style={styles.settingText}>DARK MODE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingButton}>
        <Icon name="credit-card" size={20} color="#333" />
        <Text style={styles.settingText}>Subscription & Payments</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingButton}>
        <Icon name="phone" size={20} color="#333" />
        <Text style={styles.settingText}>Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  fullName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  editProfileButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 16,
  },
  settingButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
});
