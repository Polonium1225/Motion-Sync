import React, { useState, Platform } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Octicons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function Login({ setIsLoggedIn }) { 
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0a0a0f", "#15151e"]} style={styles.topSection}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.signInText}>Sign in</Text>

        <View style={styles.inputWrapper}>
          <Octicons name="person" size={20} color="#555" />
          <TextInput
            style={styles.input}
            placeholder="Email or Mobile Number"
            placeholderTextColor="#777"
            cursorColor={"#000"}
            value={userName}
            onChangeText={setUserName}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Octicons name="lock" size={20} color="#555" />
          <TextInput
            style={styles.input}
            placeholder="Enter Your Password"
            placeholderTextColor="#777"
            cursorColor={"#000"}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Ionicons name="arrow-forward" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.signUpText}>Sign up</Text>
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
    color: "#F5F5F5",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 35,
    marginLeft:25
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -30,
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  signInText: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 35,
    marginBottom: 20,
    marginLeft: -210
  },
  inputWrapper: {
    backgroundColor: 'red',
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    backgroundColor: "#f7f9ef",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  forgotPassword: {
    color: "#555",
    alignSelf: "flex-start",
    marginLeft: "6%",
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
    // ...Platform.select({
    //   ios: {
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 2 },
    //     shadowOpacity: 0.5,
    //     shadowRadius: 4,
    //   },
    //   android: {
    //     elevation: 5,
    //   },
    // }),
  },
  signUpText: {
    marginTop: 20,
    color: "#555",
  },
});
