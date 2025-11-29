import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import styles from "../styles/ProfilePhotoItem_styles";

const ProfilePhotoItem = ({ source, size, style, onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(source)}>
      <View
        style={[
          styles.container,
          { width: size, height: size, margin: 5 },
          style,
        ]}
      >
        <Image
          source={source}
          style={[styles.photo, { width: "100%", height: "100%" }]}
          resizeMode="cover"
        />
      </View>
    </TouchableOpacity>
  );
};

export default ProfilePhotoItem;
