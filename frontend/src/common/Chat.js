import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import styles from "../styles/Chat_styles";

const Chat = () => {
  return (
    <TouchableOpacity style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.profilePicture}>
        <Image
          source={require("../assets/profile-picture.jpeg")}
          resizeMode="cover"
          style={styles.profileImage}
        />
      </View>

      {/* Middle section: name + last message */}
      <View style={styles.textContainer}>
        <Text style={styles.name}>Hosam</Text>
        <Text style={styles.lastMessage}>How are you</Text>
      </View>

      {/* Right section: date */}
      <View style={styles.dateContainer}>
        <Text style={styles.date}>Yesterday</Text>
      </View>
    </TouchableOpacity>
  );
};

export default Chat;
