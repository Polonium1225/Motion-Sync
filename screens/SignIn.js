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

export default function SignIn({ setIsLoggedIn }) { 
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    // The logic of Sign in Perform here (backend) 
    setIsLoggedIn(true); //Updating the state!
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0a0a0f", "#15151e"]} style={styles.topSection}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.signInText}>Sign In</Text>
        <View>
            <Text style={styles.inputText}>Email or Mobile Number</Text>
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
        </View>

        <View>
            <Text style={styles.inputText}>Password</Text>
            <View style={styles.inputWrapper}>
            <Octicons name="lock" size={20} color="#555" />
            <TextInput
                style={[styles.input]}
                placeholder="Enter Your Password"
                placeholderTextColor="#777"
                cursorColor={"#000"}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
            />
            <TouchableOpacity style={{padding:10}} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#555"
                />
            </TouchableOpacity>
    
            </View>
        </View>

        <View style={styles.buttonWrapper}>
            <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity>
            <Text style={[styles.signUpText]}>Sign Up</Text>
            </TouchableOpacity>
        </View>
        <LinearGradient
        colors={['#D3D3D3', '#000000']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 0.2, y: 1 }} 
        style={[styles.loginButton, styles.androidShadow]}
        >
            <TouchableOpacity style={styles.buttonInner} onPress={handleLogin}>
            <Ionicons name="arrow-forward" size={28} color="#fff" />
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
    color: "#F5F5F5",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 40,
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
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingLeft: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  inputText: {
    fontSize: 16,
    marginBottom: 10,
  },
  forgotPassword: {
    color: "#555",
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
    color: "#555",
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
  androidShadow:{
    elevation: 10 
  },
  buttonWrapper: {
    marginTop: 15,
    width: '90%',
    justifyContent: 'space-between',
    flexDirection: 'row',
  }
});
