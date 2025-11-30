import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView } from "react-native";
import styles from "../styles/PhotoCard_styles";
import FullScreenImageViewer from "./FullScreenImageViewer";

const PhotoCard = ({ userName, caption, photos = [], profilePhoto }) => {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  return (
    <View style={styles.container}>
      {fullscreenImage && (
        <FullScreenImageViewer
          source={{ uri: fullscreenImage }}
          onClose={() => setFullscreenImage(null)}
        />
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profilePicture}>
          <Image
            source={
              profilePhoto
                ? { uri: profilePhoto }
                : require("../assets/profile-picture.jpeg")
            }
            resizeMode="cover"
            style={styles.profileImage}
          />
        </View>

        <View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.subText}>Shared a photo</Text>
        </View>
      </View>

      {/* FULL-WIDTH PHOTO */}
      {photos.map((photo, index) => (
        <TouchableOpacity
          key={index}
          activeOpacity={0.8}
          onPress={() => setFullscreenImage(photo)}
        >
          <Image
            source={{ uri: photo }}
            style={styles.photo}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ))}

      {caption && <Text style={styles.caption}>{caption}</Text>}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Shared recently</Text>
      </View>
    </View>
  );
};
export default PhotoCard;
