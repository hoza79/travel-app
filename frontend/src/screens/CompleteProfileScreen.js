import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import styles from "../styles/CompleteProfileScreen_styles";
import BASE_URL from "../config/api";

const CLOUD_NAME = "del5ajmby";
const UPLOAD_PRESET = "profile_preset";

const CompleteProfileScreen = ({ navigation }) => {
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");

  const pickImage = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === "cover" ? [4, 2] : [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      if (type === "cover") setCoverPhoto(result.assets[0].uri);
      else setProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const data = new FormData();
    data.append("file", {
      uri,
      type: "image/jpeg",
      name: "upload.jpg",
    });
    data.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: data },
    );

    const result = await res.json();
    return result.secure_url;
  };

  const handleContinue = async () => {
    if (!city.trim()) {
      setMessage("City is required");
      setShowModal(true);
      return;
    }

    if (!profilePhoto) {
      setMessage("Profile photo is required");
      setShowModal(true);
      return;
    }

    if (!coverPhoto) {
      setMessage("Cover photo is required");
      setShowModal(true);
      return;
    }

    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      const uploadedProfileUrl = await uploadToCloudinary(profilePhoto);
      const uploadedCoverUrl = await uploadToCloudinary(coverPhoto);

      await fetch(`${BASE_URL}/profile/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          city,
          bio,
          interests,
          profile_photo: uploadedProfileUrl,
          cover_photo: uploadedCoverUrl,
        }),
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "BottomNavigator" }],
      });
    } catch (err) {
      console.error("❌ Profile setup error:", err);
      setMessage("Something went wrong");
      setShowModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.coverContainer}
        onPress={() => pickImage("cover")}
      >
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={styles.coverPhoto} />
        ) : (
          <Text style={styles.addText}>+ Add Cover</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profileContainer}
        onPress={() => pickImage("profile")}
      >
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <Text style={styles.addText}>+</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="City"
        placeholderTextColor="#B0B0B0"
        value={city}
        onChangeText={setCity}
      />

      <TextInput
        style={styles.input}
        placeholder="Bio"
        placeholderTextColor="#B0B0B0"
        value={bio}
        onChangeText={setBio}
      />

      <TextInput
        style={styles.input}
        placeholder="Interests"
        placeholderTextColor="#B0B0B0"
        value={interests}
        onChangeText={setInterests}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>

      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{message}</Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CompleteProfileScreen;
