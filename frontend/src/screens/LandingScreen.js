import React from "react";
import { Text, View, TouchableOpacity, Image } from "react-native";
import styles from "../styles/LandingScreen_styles";
import Title from "../common/Title";

const LandingScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={require("../assets/logo.png")} style={styles.image} />
      </View>

      <View style={styles.titleAndTaglineContainer}>
        <Title
          style={styles.AppName}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
        />
        <Text
          style={styles.Tagline}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
        >
          Catch a ride together
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => navigation.navigate("Register")}
        >
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default LandingScreen;
