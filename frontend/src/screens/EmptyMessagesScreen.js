import { StyleSheet, Text, View, Image } from "react-native";
import React from "react";
import styles from "../styles/EmptyMessagesScreen_styles";

const EmptyMessagesScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}> Messages</Text>
      </View>

      <View style={styles.iconContainer}>
        <Image
          source={require("../assets/emptyMessagesIcon.png")}
          style={styles.icon}
        />
        <View style={styles.bottomTextContainer}>
          <Text style={styles.noMessagesYetText}>No messages yet</Text>
          <Text style={styles.lastText}>
            Reach out to other travelers and start a conversation!
          </Text>
        </View>
      </View>
    </View>
  );
};

export default EmptyMessagesScreen;
