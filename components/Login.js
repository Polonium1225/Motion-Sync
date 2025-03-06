import React, { useState } from "react";
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
    height: "40%",
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  welcomeText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: -30,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    padding: 20,
    alignItems: "center",
  },
  signInText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  inputWrapper: {
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
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  signUpText: {
    marginTop: 20,
    color: "#555",
  },
});
