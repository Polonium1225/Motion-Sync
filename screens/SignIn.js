import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground, // 👈 Updated import
} from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { account, userProfiles } from "../lib/AppwriteService";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

// 👈 Import the background image
import backgroundImage from '../assets/sfgsdh.png'; // Adjust the path to your image

export default function SignIn({ setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert("Error", "Please enter both email and password");
        return;
      }

      // Clear existing sessions
      await account.deleteSessions().catch(() => {});

      // Create new session
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();

      // Update status to online (silently fail if it doesn't work)
      await userProfiles.safeUpdateStatus(user.$id, 'online');

      // Complete login
      await AsyncStorage.setItem('profile_name', user.name);
      setIsLoggedIn(true);

    } catch (error) {
      console.error("Login Error Details:", {
        message: error.message,
        code: error.code,
        type: error.type
      });

      let errorMessage = "Invalid email or password";
      if (error.code === 401) {
        errorMessage = "Invalid credentials";
      } else if (error.code === 404) {
        errorMessage = "Account not found";
      }

      Alert.alert("Login Error", errorMessage);
    }
  };

  const handleNavigateToSignUp = () => {
    navigation.navigate("SignUp");
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {/* 👈 Replace View with ImageBackground */}
      <ImageBackground
        source={backgroundImage} // 👈 Set the background image
        style={styles.container}
        resizeMode="cover" // 👈 Ensure the image covers the screen
      >
        <View colors={["#ff4c48", "#04032d"]} style={styles.topSection}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.signInText}>Sign In</Text>

          {/* Email Input */}
          <View>
            <Text style={styles.inputText}>Email</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="person" size={20} color="#ff4c48" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textSecondary}
                cursorColor={Colors.primary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View>
            <Text style={styles.inputText}>Password</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#ff4c48" />
              <TextInput
                style={styles.input}
                placeholder="Enter Your Password"
                placeholderTextColor={Colors.textSecondary}
                cursorColor={Colors.primary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoFocus={false}
              />
              <TouchableOpacity style={{ padding: 10 }} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonWrapper}>
            <TouchableOpacity>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNavigateToSignUp}>
              <Text style={[styles.signUpText]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Fixed Login Button with pointerEvents */}
          <LinearGradient
            colors={['#ff4c48', '#0b0a1f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={[styles.loginButton, styles.androidShadow]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={styles.buttonInner}
              onPress={handleLogin}
            >
              <Ionicons name="arrow-forward" size={28} color={Colors.textPrimary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 👈 Remove backgroundColor since the image will be the background
  },
  topSection: {
    height: "50%",
  },
  welcomeText: {
    color: Colors.textPrimary,
    fontSize: 40,
    fontWeight: "bold",
    marginTop: "40%",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#0b0a1f",
    marginTop: -80,
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  signInText: {
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
  forgotPassword: {
    color: Colors.textPrimary,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  loginButton: {
    position: 'absolute',
    top: -30,
    right: 40,
    backgroundColor: Colors.primaryDeep,
    padding: 16,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    color: "#ff4c48",
    fontWeight: 'bold',
  },
  boxShadow: {
    shadowColor: '#333333',
    shadowOffset: {
      width: 6,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  androidShadow: {
    elevation: 10
  },
  buttonWrapper: {
    marginTop: 15,
    width: '90%',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  buttonInner: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});