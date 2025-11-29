import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
} from "react-native";

import React, { useState } from "react";
import styles from "../styles/LoginScreen_styles";
import Title from "../common/Title";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      // 🔥 important: reset previous session automatically
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");

      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // save token + userId
        await AsyncStorage.setItem("token", data.token);
        if (data.user?.id) {
          await AsyncStorage.setItem("userId", data.user.id.toString());
        }

        navigation.navigate("BottomNavigator");
      } else {
        console.log("❌ Login failed:", data.message || "No token received");
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        style={styles.container}
      >
        <View style={styles.container}>
          <Title style={styles.title} />

          <TextInput
            placeholder="Email"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="white"
            style={styles.TextInput}
            secureTextEntry
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;
