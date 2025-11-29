import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
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
      { method: "POST", body: data }
    );

    const result = await res.json();
    return result.secure_url;
  };

  const handleContinue = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    try {
      let uploadedProfileUrl = null;
      let uploadedCoverUrl = null;

      if (profilePhoto) {
        uploadedProfileUrl = await uploadToCloudinary(profilePhoto);
        await AsyncStorage.setItem("profilePhoto", uploadedProfileUrl);
      }

      if (coverPhoto) {
        uploadedCoverUrl = await uploadToCloudinary(coverPhoto);
        await AsyncStorage.setItem("coverPhoto", uploadedCoverUrl);
      }

      await fetch(`${BASE_URL}/profile/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio,
          city,
          interests,
          profile_photo: uploadedProfileUrl,
          cover_photo: uploadedCoverUrl,
        }),
      });

      navigation.navigate("BottomNavigator");
    } catch (err) {
      console.error("❌ Profile setup error:", err);
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
        placeholder="Bio"
        placeholderTextColor="#B0B0B0"
        value={bio}
        onChangeText={setBio}
      />

      <TextInput
        style={styles.input}
        placeholder="City"
        placeholderTextColor="#B0B0B0"
        value={city}
        onChangeText={setCity}
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
    </View>
  );
};

export default CompleteProfileScreen;
