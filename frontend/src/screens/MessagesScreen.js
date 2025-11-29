import { StyleSheet, View, TextInput, Image, ScrollView } from "react-native";
import React from "react";
import styles from "../styles/MessagesScreen_styles";
import Chat from "../common/Chat";

const MessagesScreen = () => {
  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Image
          source={require("../assets/searchIcon.png")}
          resizeMode="cover"
          style={styles.searchIcon}
        />
        <TextInput
          placeholderTextColor={"rgb(87,107,134)"}
          placeholder="Search"
          style={styles.searchBarTextInput}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
      >
        <Chat />
      </ScrollView>
    </View>
  );
};

export default MessagesScreen;
