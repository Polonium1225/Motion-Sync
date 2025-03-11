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
import { account, databases, ID } from "../lib/AppwriteService"; 
import { useNavigation } from "@react-navigation/native";
import bcrypt from 'react-native-bcrypt'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignUp({ setIsLoggedIn }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleSignUp = async () => {
    try {
      // Validate input fields
      if (!name || !email || !password) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }
  
      // Hash the password
      const saltRounds = 10; 
      const hashedPassword = bcrypt.hashSync(password, saltRounds); 
  
      const userId = ID.unique();
      console.log("Creating user account with ID:", userId);
      const user = await account.create(userId, email, password, name);
      console.log("User account created:", user);
  
      const documentId = ID.unique(); 
      console.log("Creating document with ID:", documentId);
      await databases.createDocument(
        '67d0bba1000e9caec4f2', // Database ID
        '67d0bbf8003206b11780', // Collection ID
        documentId, 
        {
          name: name,
          email: email,
          password: hashedPassword, // Store the hashed password
        }
      );
      console.log("Document created successfully");
  
      // Store the user name for homepage
      await AsyncStorage.setItem('profile_name', name);
  
      try {
        await account.deleteSessions(); // Delete all active sessions
        console.log("Existing sessions deleted");
      } catch (sessionError) {
        console.log("No existing sessions to delete:", sessionError.message);
      }
  
      //Logging !!
      await account.createEmailPasswordSession(email, password);
      console.log("User logged in successfully");
  
      Alert.alert("Success", "Account created and logged in successfully!");
      setIsLoggedIn(true);
    } catch (error) {
      console.error("SignUp Error:", error); // Log the full error
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#01CC97", "#22272B"]} style={styles.topSection}>
        <Text style={styles.welcomeText}>Create Account</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.signInText}>Sign Up</Text>

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
            <Text style={[styles.signUpText]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={["#01CC97", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={[styles.loginButton, styles.androidShadow]}
        >
          <TouchableOpacity style={styles.buttonInner} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </LinearGradient>
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
  signInText: {
    color: "#01CC97",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 35,
    marginBottom: 20,
    marginLeft: -210,
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
});