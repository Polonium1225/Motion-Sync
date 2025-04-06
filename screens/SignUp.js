import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { account, databases, ID, userProfiles, DATABASE_ID, COLLECTIONS } from "../lib/AppwriteService";
import { useNavigation } from "@react-navigation/native";
import bcrypt from 'react-native-bcrypt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

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
  
      // 1. Clear any existing sessions first
      try {
        await account.deleteSessions();
        console.log("Cleared existing sessions");
      } catch (sessionError) {
        console.log("No sessions to clear:", sessionError.message);
      }
  
      // 2. Create account with unique ID
      const userId = ID.unique();
      console.log("Creating account with ID:", userId);
      
      // Create the auth account (this goes to Appwrite's auth system)
      const user = await account.create(userId, email, password, name);
      console.log("Account created:", user.$id);
  
      // 3. Create profile document in user_profiles collection
      try {
        await userProfiles.ensureProfile(userId);
        console.log("User profile created/verified");
      } catch (profileError) {
        console.error("Profile creation error:", profileError);
        // Continue even if profile creation fails - it will be created on first login
      }
  
      // 4. Create session after cleanup
      await account.createEmailPasswordSession(email, password);
      console.log("Session created successfully");
  
      // 5. Store user data
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
    <View style={styles.container}>
      <LinearGradient colors={["#01CC97", "#22272B"]} style={styles.topSection}>
        <Text style={styles.welcomeText}>Create Account</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.signUpText}>Sign Up</Text>

        <View>
          <Text style={styles.inputText}>Name</Text>
          <View style={styles.inputWrapper}>
            <Octicons name="person" size={20} color="#01CC97" />
            <TextInput
              style={styles.input}
              placeholder="Enter Your Name"
              placeholderTextColor="#777"
              cursorColor={"#000"}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View>
          <Text style={styles.inputText}>Email</Text>
          <View style={styles.inputWrapper}>
            <Octicons name="mail" size={20} color="#01CC97" />
            <TextInput
              style={styles.input}
              placeholder="Enter Your Email"
              placeholderTextColor="#777"
              cursorColor={"#000"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View>
          <Text style={styles.inputText}>Password</Text>
          <View style={styles.inputWrapper}>
            <Octicons name="lock" size={20} color="#01CC97" />
            <TextInput
              style={[styles.input]}
              placeholder="Enter Your Password"
              placeholderTextColor="#777"
              cursorColor={"#000"}
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
                color="#555"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
            <Text style={[styles.signInText]}>Sign In</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={['#01CC97', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={[styles.loginButton, styles.androidShadow]}
        >
          <TouchableOpacity style={styles.buttonInner} onPress={handleSignUp}>
            <Ionicons name="arrow-forward" size={28} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Add Google Sign-In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => promptAsync()}
        >
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e5e5e5",
  },
  topSection: {
    height: "50%",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "bold",
    marginTop: "40%",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#1F2229",
    marginTop: -80,
    alignItems: "center",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  signUpText: {
    color: "#01CC97",
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
    borderColor: "#01CC97",
    borderWidth: 2,
    borderRadius: 30,
    paddingLeft: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#fff",
  },
  inputText: {
    color: "white",
    fontSize: 16,
    marginBottom: 10,
  },
  loginButton: {
    position: "absolute",
    top: -30,
    right: 40,
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonInner: {
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  androidShadow: {
    elevation: 10,
  },
  signInText: {
    color: "#01CC97",
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#4285F4', // Google Blue
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    width: '90%',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});