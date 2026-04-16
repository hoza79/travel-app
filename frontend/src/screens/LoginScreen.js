import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  Modal,
} from "react-native";
import React, { useState } from "react";
import styles from "../styles/LoginScreen_styles";
import Title from "../common/Title";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");

      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        await AsyncStorage.setItem("token", data.token);
        if (data.user?.id) {
          await AsyncStorage.setItem("userId", data.user.id.toString());
        }

        navigation.reset({
          index: 0,
          routes: [{ name: "BottomNavigator" }],
        });
      } else {
        let errorMessage = "Login failed";

        if (Array.isArray(data.message) && data.message.length > 0) {
          errorMessage = data.message[0];
        } else if (typeof data.message === "string") {
          errorMessage = data.message;
        }

        setMessage(errorMessage);
        setShowModal(true);
      }
    } catch (error) {
      setMessage("Something went wrong");
      setShowModal(true);
    }
  };

  return (
    <>
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

      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{message}</Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default LoginScreen;
