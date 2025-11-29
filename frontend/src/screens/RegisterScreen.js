import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import styles from "../styles/RegisterScreen_styles";
import Title from "../common/Title";
import SuccessMessageBox from "../common/SuccessMessageBox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

const RegisterScreen = ({ navigation }) => {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleRegister = async () => {
    try {
      // 🔥 important: reset previous session automatically
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");

      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name,
          last_name,
          email,
          password,
          confirmedPassword,
        }),
      });

      const data = await response.json();
      const messageText = Array.isArray(data.message)
        ? data.message[0]
        : data.message;

      if (response.ok && data.token) {
        // save token + userId
        await AsyncStorage.setItem("token", data.token);
        if (data.user?.id) {
          await AsyncStorage.setItem("userId", data.user.id.toString());
        }

        setMessageType("success");
        setMessage(messageText);
        setVisible(true);
        setTimeout(() => setVisible(false), 1500);

        setTimeout(() => {
          navigation.navigate("CompleteProfileScreen");
        }, 1000);
      } else {
        setMessageType("error");
        setMessage(messageText);
        setVisible(true);
        setTimeout(() => setVisible(false), 2000);
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        style={styles.container}
      >
        <View style={styles.container}>
          <Title style={styles.title} />

          <TextInput
            placeholder="First Name"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setFirstName}
          />
          <TextInput
            placeholder="Last Name"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setLastName}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor="white"
            style={styles.TextInput}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="white"
            secureTextEntry
            style={styles.TextInput}
            onChangeText={setPassword}
          />
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="white"
            secureTextEntry
            style={styles.TextInput}
            onChangeText={setConfirmedPassword}
          />

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.registerButtonText}>Continue</Text>
          </TouchableOpacity>

          {visible && <SuccessMessageBox text={message} type={messageType} />}

          <View style={styles.loginRedirect}>
            <Text style={styles.haveAnAccountText}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.goBackToSignInText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default RegisterScreen;
