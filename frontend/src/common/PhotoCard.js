import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import styles from "../styles/PhotoCard_styles";

const PhotoCard = ({ userName, caption, photos = [] }) => {
  return (
    <TouchableOpacity activeOpacity={0.9}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profilePicture}>
            <Image
              source={require("../assets/profile-picture.jpeg")}
              resizeMode="cover"
              style={styles.profileImage}
            />
          </View>

          <View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.subText}>Shared a photo</Text>
          </View>
        </View>

        {/* Photos */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoScroll}
          contentContainerStyle={{ paddingRight: 10 }}
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.photo}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {caption && <Text style={styles.caption}>{caption}</Text>}

        <View style={styles.footer}>
          <Text style={styles.footerText}>12 Oct 2025</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PhotoCard;
