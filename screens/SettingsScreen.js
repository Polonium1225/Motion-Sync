import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Button } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';  
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const [isEditing, setIsEditing] = useState(false); // To toggle the edit mode
  const [fullName, setFullName] = useState('FULL NAME'); // State for full name
  const [profileImage, setProfileImage] = useState(require('../assets/icon.png')); // Default profile image
  
  // Function to handle image selection using Expo Image Picker
  const pickImage = async () => {
    // Request permission to access the media library
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert('Permission to access media library is required!');
      return;
    }

    // Pick the image
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    // Check if user didn't cancel the picker
    if (!pickerResult.canceled) { // Note: "canceled" not "cancelled"
      // Update the profile image with the selected image URI
      setProfileImage({ uri: pickerResult.assets[0].uri }); // Access URI through assets array
    }
  };

  // Function to save the profile
  const saveProfile = () => {
    setIsEditing(false); // Close the edit mode
    // You can handle saving the name and image here (e.g., to a server or local storage)
  };

  return (
    <View style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        {/* Profile Image */}
        <Image
          source={profileImage}  // Dynamically set the profile image
          style={styles.profileImage}
        />
        <Text style={styles.fullName}>{fullName}</Text>

        {/* Edit Profile Button */}
        {!isEditing ? (
          <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.editProfileText}>EDIT PROFILE</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editPanel}>
            {/* Image Upload Button */}
            <Button title="Upload Image" onPress={pickImage} />
            <TextInput
              style={styles.input}
              placeholder="Enter full name"
              value={fullName}
              onChangeText={setFullName} // Update full name as user types
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
              <Text style={styles.saveText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Settings Buttons */}
      <TouchableOpacity style={styles.settingButton}>
        <Text style={styles.settingText}>DARK MODE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingButton}>
        <Icon name="credit-card" size={20} color="#fff" />
        <Text style={styles.settingText}>Subscription & Payments</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingButton}>
        <Icon name="phone" size={20} color="#fff" />
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
    backgroundColor: '#22272B',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderColor: "#01CC97",  
    borderWidth: 2,          
    borderRadius: 30,
    marginTop: 15,
    width: '200',
    height: '50',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  editProfileText: {
    color: '#fff',
    fontSize: 16,
  },
  editPanel: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    width: '80%',
    paddingHorizontal: 10,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#01CC97',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginTop: 15,
    width: '200',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
  },
  settingButton: {
    backgroundColor: '#1F2229', 
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#01CC97", 
    borderWidth: 2,          
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 4 },  
    shadowOpacity: 0.3,  
    shadowRadius: 1,  
    elevation: 5,  
  },
  settingText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#fff',
  },
});