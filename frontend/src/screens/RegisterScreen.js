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
  Modal,
} from "react-native";
import styles from "../styles/RegisterScreen_styles";
import Title from "../common/Title";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

const RegisterScreen = ({ navigation }) => {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");

  const [hasRegisteredThisSession, setHasRegisteredThisSession] =
    useState(false);

  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async () => {
    if (hasRegisteredThisSession) {
      navigation.navigate("CompleteProfileScreen");
      return;
    }

    try {
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
        await AsyncStorage.setItem("token", data.token);

        if (data.user?.id) {
          await AsyncStorage.setItem("userId", data.user.id.toString());
        }

        setHasRegisteredThisSession(true);

        setMessage(messageText);
        setIsSuccess(true);
        setShowModal(true);

        setTimeout(() => {
          setShowModal(false);
          navigation.navigate("CompleteProfileScreen");
        }, 1200);
      } else {
        setMessage(messageText);
        setIsSuccess(false);
        setShowModal(true);
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
      setMessage("Something went wrong");
      setIsSuccess(false);
      setShowModal(true);
    }
  };

  return (
    <>
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

      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{message}</Text>

            {!isSuccess && (
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default RegisterScreen;
