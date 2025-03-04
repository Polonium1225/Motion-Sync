import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';  

export default function SettingsScreen() {
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
  background: {
    flex: 1,
    resizeMode: 'cover', // Ensures the background image covers the entire screen
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1F2229', // Optional: Adds a slight dark overlay for readability
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
    color: '#fff',  // Updated to white for better visibility on dark backgrounds
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Slightly transparent for better UI blending
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
