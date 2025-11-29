import { Text, View } from "react-native";
import React from "react";
import styles from "../styles/SuccessMessageBox_styles";

const SuccessMessageBox = ({ text, type }) => {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: type === "success" ? "#1e9171" : "#C62828" },
      ]}
    >
      <Text style={styles.boxText}>{text}</Text>
    </View>
  );
};

export default SuccessMessageBox;
