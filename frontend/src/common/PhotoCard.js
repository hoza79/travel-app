import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import styles from "../styles/PhotoCard_styles";
import FullScreenImageViewer from "./FullScreenImageViewer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

const PhotoCard = ({
  userName,
  caption,
  photos = [],
  profilePhoto,
  id,
  user_id,
  onPhotoDeleted,
}) => {
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("userId");
      if (stored) setCurrentUserId(parseInt(stored, 10));
    };
    loadUser();
  }, []);

  const isOwner = currentUserId === user_id;

  const handleDeletePhoto = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const token = await AsyncStorage.getItem("token");

      await fetch(`${BASE_URL}/post/photo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (onPhotoDeleted) onPhotoDeleted(id);
    } catch (err) {
      console.log("❌ Photo delete error:", err);
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {fullscreenImage && (
        <FullScreenImageViewer
          source={{ uri: fullscreenImage }}
          onClose={() => setFullscreenImage(null)}
        />
      )}

      {/* HEADER */}
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

        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.subText}>Shared a photo</Text>
        </View>

        {/* DELETE BUTTON — OWNER ONLY */}
        {isOwner && (
          <TouchableOpacity
            onPress={handleDeletePhoto}
            style={styles.deleteButton}
          >
            {isDeleting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.deleteText}>Delete</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* PHOTO */}
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
