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
import { useNavigation } from "@react-navigation/native";

const PhotoCard = ({
  userName,
  caption,
  photos = [],
  profilePhoto,
  id,
  user_id,
  onPhotoDeleted,
}) => {
  const navigation = useNavigation();

  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
        {/* ⭐ NOW CLICKABLE → NAVIGATES TO PROFILE */}
        <TouchableOpacity
          style={styles.profilePicture}
          onPress={() => {
            if (currentUserId === user_id) {
              navigation.navigate("BottomNavigator", { screen: "Profile" });
            } else {
              navigation.navigate("UserProfile", { userId: user_id });
            }
          }}
        >
          <Image
            source={
              profilePhoto
                ? { uri: profilePhoto }
                : require("../assets/profile-picture.jpeg")
            }
            resizeMode="cover"
            style={styles.profileImage}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.subText}>Shared a photo</Text>
        </View>

        {/* DELETE BUTTON — OWNER ONLY */}
        {isOwner && (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
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

      {/* DELETE CONFIRMATION MODAL */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete this photo?</Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  handleDeletePhoto();
                }}
                style={styles.modalDeleteButton}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default PhotoCard;
