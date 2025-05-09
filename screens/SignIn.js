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
} from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { account, userProfiles } from "../lib/AppwriteService";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      behavior={Platform.OS === "ios" ? "padding" : "height"} // Prevents keyboard dismissal
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LinearGradient colors={["#01CC97", "#22272B"]} style={styles.topSection}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.signInText}>Sign In</Text>
          
          {/* Email Input */}
          <View>
            <Text style={styles.inputText}>Email</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="person" size={20} color="#01CC97" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#777"
                cursorColor={"#000"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus={false} // Prevent focus loss
              />
            </View>
          </View>

          {/* Password Input */}
          <View>
            <Text style={styles.inputText}>Password</Text>
            <View style={styles.inputWrapper}>
              <Octicons name="lock" size={20} color="#01CC97" />
              <TextInput
                style={styles.input}
                placeholder="Enter Your Password"
                placeholderTextColor="#777"
                cursorColor={"#000"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoFocus={false} // Prevent focus loss
              />
              <TouchableOpacity style={{ padding: 10 }} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#555"
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
            colors={['#01CC97', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={[styles.loginButton, styles.androidShadow]}
            pointerEvents="box-none" // 👈 Allow touches to pass through
          >
            <TouchableOpacity 
              style={styles.buttonInner} 
              onPress={handleLogin}
            >
              <Ionicons name="arrow-forward" size={28} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  signInText: {
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
  forgotPassword: {
    color: "#fff",
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  loginButton: {
    position: 'absolute',
    top: -30,
    right: 40,
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    color: "#01CC97",
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
    width: 50,  // 👈 Explicit dimensions for tappable area
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});