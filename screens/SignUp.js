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
import { useNavigation } from "@react-navigation/native"; 
import { account, databases, Query} from "../lib/AppwriteService";
import bcrypt from 'react-native-bcrypt';
import { v4 as uuidv4 } from 'uuid';

export default function SignUp({ setIsLoggedIn }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleSignUp = async () => {
    try {
      // Validate inputs
      if (!name || !email || !password) {
        Alert.alert("Error", "Please fill in all fields");
        return;
      }
  
      // Check if the user already exists in the collection
      const existingUser = await databases.listDocuments(
        '67cf7c320035a1dd0e62', // Database ID
        '67cf7ceb002ef53618ef', // Collection ID
        [Query.equal('email', email)] // Query by email
      );
  
      if (existingUser.documents.length > 0) {
        Alert.alert("Error", "User with this email already exists");
        return;
      }
  
      const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password
  
      // Create the user account in Appwrite
      const user = await account.create('unique()', email, password, name);
      console.log("User Object:", user);
  
      // Store the user data in the collection
      await databases.createDocument(
        '67cf7c320035a1dd0e62', // Database ID
        '67cf7ceb002ef53618ef', // Collection ID
        uuidv4(), // Generate a unique document ID
        {
          name: name,
          email: email,
          password: hashedPassword, // Store the hashed password
          createdAt: new Date().toISOString(),
        }
      );
  
      Alert.alert("Success", "Account created successfully!");
      setIsLoggedIn(true); // Log the user in
    } catch (error) {
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