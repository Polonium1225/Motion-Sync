import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { account, databases, ID, userProfiles, DATABASE_ID, COLLECTIONS } from "../lib/AppwriteService";
import { useNavigation } from "@react-navigation/native";
import bcrypt from 'react-native-bcrypt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Colors from '../constants/Colors';
import backgroundImage from '../assets/sfgsdh.png';

export default function SignUp({ setIsLoggedIn }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [id , setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  // Google Sign-In Configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '432125442153-bjkbegagtko0vadulk1stfo0n6376gsm.apps.googleusercontent.com', // Your Web Client ID
    iosClientId: 'YOUR_IOS_CLIENT_ID', // Optional: For iOS
    androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Optional: For Android
  });

  // Handle Google Sign-In Response
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      // Use the authentication object to sign in the user
      console.log("Google Sign-In Success:", authentication);
      handleGoogleSignIn(authentication);
    }
  }, [response]);

  const handleGoogleSignIn = async (authentication) => {
    try {
      // Fetch user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();
      console.log("Google User Info:", userInfo);

      // Extract user details
      const { name, email } = userInfo;

      // Store user details in your database or state
      setName(name);
      setEmail(email);

      // Optionally, log the user in automatically
      setIsLoggedIn(true);
      Alert.alert("Success", "Signed in with Google successfully!");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      Alert.alert("Error", "Failed to sign in with Google.");
    }
  };

  const handleSignUp = async () => {
    try {
      if (!name || !email || !password) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }

      // Clear sessions
      await account.deleteSessions().catch(() => {});

      // Create account
      const userId = ID.unique();
      const user = await account.create(userId, email, password, name);

      // Create profile with online status
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        ID.unique(),
        {
          userId: userId,
          name: name,
          status: 'online',
          avatar: 'avatar.png',
          lastSeen: new Date()
        }
      ).catch(() => {}); // Silently ignore if fails

      // Create session
      await account.createEmailPasswordSession(email, password);
      await AsyncStorage.setItem('profile_name', name);
      setIsLoggedIn(true);

    } catch (error) {
      console.error("SignUp Error Details:", {
        message: error.message,
        code: error.code,
        type: error.type
      });

      let errorMessage = error.message;
      if (error.code === 409) { // User already exists
        errorMessage = "This email is already registered";
      }

      Alert.alert("Sign Up Error", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <Text style={styles.welcomeText}>Create Account</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.signUpText}>Sign Up</Text>

            {/* Name Input */}
            <View>
              <Text style={styles.inputText}>Name</Text>
              <View style={styles.inputWrapper}>
                <Octicons name="person" size={20} color="#ff4c48" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Your Name"
                  placeholderTextColor={Colors.textSecondary}
                  cursorColor={Colors.primary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email Input */}
            <View>
              <Text style={styles.inputText}>Email</Text>
              <View style={styles.inputWrapper}>
                <Octicons name="mail" size={20} color="#ff4c48" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter Your Email"
                  placeholderTextColor={Colors.textSecondary}
                  cursorColor={Colors.primary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View>
              <Text style={styles.inputText}>Password</Text>
              <View style={styles.inputWrapper}>
                <Octicons name="lock" size={20} color="#ff4c48" />
                <TextInput
                  style={[styles.input]}
                  placeholder="Enter Your Password"
                  placeholderTextColor={Colors.textSecondary}
                  cursorColor={Colors.primary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={{ padding: 10 }}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptAsync()}
            >
              <Ionicons name="logo-google" size={20} color={Colors.textPrimary} style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Sign up with Google</Text>
            </TouchableOpacity>

            {/* Navigation Buttons */}
            <View style={styles.buttonWrapper}>
              <Text style={styles.alreadyHaveAccount}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                <Text style={[styles.signInText]}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Button */}
            <LinearGradient
              colors={['#ff4c48', '#0b0a1f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.3, y: 1 }}
              style={[styles.signUpButton, styles.androidShadow]}
            >
              <TouchableOpacity style={styles.buttonInner} onPress={handleSignUp}>
                <Ionicons name="arrow-forward" size={28} color={Colors.textPrimary} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    height: "50%",
    justifyContent: 'center',
  },
  welcomeText: {
    color: Colors.textPrimary,
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: "40%",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#0b0a1f",
    marginTop: -80,
    alignItems: "center",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 40,
  },
  signUpText: {
    color: "#ff4c48",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 35,
    marginBottom: 20,
    marginLeft: -210
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    backgroundColor: "#1F2229",
    borderColor: "#ff4c48",
    borderWidth: 2,
    borderRadius: 30,
    paddingLeft: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#1F2229",
    borderColor: "#ff4c48",
    borderWidth: 2,
    padding: 15,
    borderRadius: 30,
    width: '90%',
    marginBottom: 20,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonWrapper: {
    marginTop: 15,
    width: '90%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyHaveAccount: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
  signInText: {
    color: "#ff4c48",
    fontWeight: 'bold',
    fontSize: 16,
  },
  signUpButton: {
    position: 'absolute',
    top: -30,
    right: 40,
    backgroundColor: Colors.primaryDeep,
    padding: 16,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonInner: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  androidShadow: {
    elevation: 10,
  },
});