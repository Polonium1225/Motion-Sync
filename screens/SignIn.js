import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { account, userProfiles } from "../lib/AppwriteService";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

// Import the background image
import backgroundImage from '../assets/sfgsdh.png';

export default function SignIn({ setIsLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const navigation = useNavigation();

  // Check for saved credentials on component mount
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('saved_email');
      const savedPassword = await AsyncStorage.getItem('saved_password');
      const savedRememberMe = await AsyncStorage.getItem('remember_me');

      if (savedEmail && savedPassword && savedRememberMe === 'true') {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        // Automatically sign in
        setIsAutoLogging(true);
        await performLogin(savedEmail, savedPassword, false);
      }
    } catch (error) {
      console.error("Error checking saved credentials:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async (email, password, remember) => {
    try {
      if (remember) {
        await AsyncStorage.setItem('saved_email', email);
        await AsyncStorage.setItem('saved_password', password);
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('saved_password');
        await AsyncStorage.removeItem('remember_me');
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const performLogin = async (loginEmail, loginPassword, showAlert = true) => {
    try {
      // Clear existing sessions
      await account.deleteSessions().catch(() => {});

      // Create new session
      await account.createEmailPasswordSession(loginEmail, loginPassword);
      const user = await account.get();

      // Update status to online (silently fail if it doesn't work)
      await userProfiles.safeUpdateStatus(user.$id, 'online');

      // Save credentials if remember me is checked
      await saveCredentials(loginEmail, loginPassword, rememberMe);

      // Complete login
      await AsyncStorage.setItem('profile_name', user.name);
      setIsLoggedIn(true);

    } catch (error) {
      console.error("Login Error Details:", {
        message: error.message,
        code: error.code,
        type: error.type
      });

      // Clear saved credentials if auto-login fails
      if (isAutoLogging) {
        await saveCredentials('', '', false);
        setIsAutoLogging(false);
      }

      if (showAlert) {
        let errorMessage = "Invalid email or password";
        if (error.code === 401) {
          errorMessage = "Invalid credentials";
        } else if (error.code === 404) {
          errorMessage = "Account not found";
        }

        Alert.alert("Login Error", errorMessage);
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    await performLogin(email, password, true);
  };

  const handleNavigateToSignUp = () => {
    navigation.navigate("SignUp");
  };

  // Show loading spinner while checking saved credentials
  if (isLoading || isAutoLogging) {
    return (
      <ImageBackground
        source={backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {isAutoLogging ? "Signing you in..." : "Loading..."}
          </Text>
        </View>
      </ImageBackground>
    );
  }

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

          {/* Remember Me Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={styles.checkboxWrapper}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={16} color={Colors.textPrimary} />
                )}
              </View>
              <Text style={styles.checkboxText}>Remember Me</Text>
            </TouchableOpacity>
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

          {/* Login Button */}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginTop: 10,
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
  checkboxContainer: {
    width: "90%",
    marginBottom: 10,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ff4c48",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: "#ff4c48",
  },
  checkboxText: {
    color: Colors.textPrimary,
    fontSize: 14,
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