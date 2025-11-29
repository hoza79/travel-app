import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image,
  FlatList,
} from "react-native";
import React, { useState } from "react";
import styles from "../styles/PostScreen_styles";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SuccessMessageBox from "../common/SuccessMessageBox";
import { GOOGLE_API_KEY } from "@env";
import BASE_URL from "../config/api";
import * as ImagePicker from "expo-image-picker"; // ✅ ADDED

let fromTimeout;
let toTimeout;

const PostScreen = () => {
  const navigation = useNavigation();

  const [selectedMain, setSelectedMain] = useState("trip");
  const [tripType, setTripType] = useState("Offering");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [date, setDate] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [description, setDescription] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [location, setLocation] = useState("");
  // -----------------------------------------------------
  // NEW: Selected photo state
  // -----------------------------------------------------
  const [photo, setPhoto] = useState(null);

  // -----------------------------------------------------
  // NEW: Image picker function
  // -----------------------------------------------------

  const CLOUD_NAME = "del5ajmby";
  const UPLOAD_PRESET = "profile_preset";

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error:", error);
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

  const handlePhotoPost = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;
    let uploadedPhotoUrl = null;
    if (photo) {
      uploadedPhotoUrl = await uploadToCloudinary(photo);
    }

    await fetch(`${BASE_URL}/post/photo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        photo_url: uploadedPhotoUrl,
        description,
        location,
      }),
    });
  };

  let timeouts = { from: null, to: null };

  const fetchSuggestions = async (query, type) => {
    if (!query || query.length < 2) {
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }

    clearTimeout(timeouts[type]);
    timeouts[type] = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_API_KEY}&language=en&types=(cities)`
        );
        const data = await res.json();

        if (!data.predictions || data.predictions.length === 0) {
          if (type === "from") setFromSuggestions([]);
          else setToSuggestions([]);
          return;
        }

        const simplified = data.predictions.map((item) => ({
          id: item.place_id,
          name: item.description,
        }));

        if (type === "from") setFromSuggestions(simplified);
        else setToSuggestions(simplified);
      } catch (e) {
        console.error(`${type} fetch error:`, e);
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Create Post</Text>
        <Image source={require("../assets/logo.png")} style={styles.logo} />
      </View>

      <View style={styles.mainTabContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "trip" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("trip")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "trip" && styles.activeMainText,
            ]}
          >
            Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            selectedMain === "photo" && styles.activeMainTab,
          ]}
          onPress={() => setSelectedMain("photo")}
        >
          <Text
            style={[
              styles.mainTabText,
              selectedMain === "photo" && styles.activeMainText,
            ]}
          >
            Photo
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {selectedMain === "trip" && (
            <View style={styles.tripInfoWrapper}>
              <View style={styles.tripInfo}>
                {/* trip UI EXACT as before… */}
                <View style={styles.subTabInsideBox}>
                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Offering" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Offering")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Offering" && styles.activeSubText,
                      ]}
                    >
                      Offering
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabSmall,
                      tripType === "Searching" && styles.activeSubTab,
                    ]}
                    onPress={() => setTripType("Searching")}
                  >
                    <Text
                      style={[
                        styles.subText,
                        tripType === "Searching" && styles.activeSubText,
                      ]}
                    >
                      Searching
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ALL your trip input fields kept untouched */}
                {/* ... */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="From"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={from}
                      onChangeText={(text) => {
                        setFrom(text);
                        fetchSuggestions(text, "from");
                      }}
                      onFocus={() => setToSuggestions([])}
                    />
                  </View>

                  {fromSuggestions.length > 0 && (
                    <FlatList
                      data={fromSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setFrom(item.name);
                            setFromSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                {/* second input */}
                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="To"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={to}
                      onChangeText={(text) => {
                        setTo(text);
                        fetchSuggestions(text, "to");
                      }}
                      onFocus={() => setFromSuggestions([])}
                    />
                  </View>

                  {toSuggestions.length > 0 && (
                    <FlatList
                      data={toSuggestions}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdown}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            setTo(item.name);
                            setToSuggestions([]);
                          }}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                {/* date/seats */}
                <View style={styles.dateAndSeatsContainer}>
                  <View style={styles.dateAndIcon}>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                      <Image
                        source={require("../assets/dateIcon.png")}
                        style={styles.icon}
                      />
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Date (YYYY-MM-DD)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.smallInput}
                      value={date}
                      editable={false}
                    />
                  </View>

                  <TextInput
                    placeholder={
                      tripType === "Offering"
                        ? "Seats available"
                        : "Seats needed"
                    }
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.smallInput}
                    onChangeText={setSeatsAvailable}
                  />
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date ? new Date(date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        const formatted = selectedDate
                          .toISOString()
                          .split("T")[0];
                        setDate(formatted);
                      }
                    }}
                  />
                )}

                <TextInput
                  placeholder="Description"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.descriptionTextInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={300}
                  onChangeText={setDescription}
                />
              </View>
            </View>
          )}

          {selectedMain === "photo" && (
            <View style={styles.photoContainer}>
              {/* -----------------------------------------------------
                  ONLY CHANGE: Add onPress + image preview
              ----------------------------------------------------- */}
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{ width: "100%", height: "100%", borderRadius: 15 }}
                  />
                ) : (
                  <>
                    <Image
                      source={require("../assets/uploadIcon.png")}
                      style={styles.uploadIcon}
                    />
                    <Text style={styles.uploadText}>Upload photo</Text>
                    <Text style={styles.uploadHint}>
                      Tap to select from gallery
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TextInput
                placeholder="Location"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.textInputPhoto}
                value={location}
                onChangeText={setLocation}
              />

              <TextInput
                placeholder="Description"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.descriptionPhotoInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <TouchableOpacity
        style={styles.postButton}
        onPress={async () => {
          if (selectedMain === "photo") {
            handlePhotoPost();
            setMessageType("success");
            setMessage("Photo selected. Cloudinary next.");
            setVisible(true);
            setTimeout(() => setVisible(false), 2000);
            return;
          }

          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;
            const response = await fetch(`${BASE_URL}/post`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                from,
                to,
                date,
                seatsAvailable,
                description,
                type: tripType,
              }),
            });
            const data = await response.json();
            const messageText = Array.isArray(data.message)
              ? data.message[0]
              : data.message;
            if (response.ok) {
              setMessageType("success");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 3000);
              setTimeout(() => navigation.replace("BottomNavigator"), 3000);
            } else {
              setMessageType("error");
              setMessage(messageText);
              setVisible(true);
              setTimeout(() => setVisible(false), 2000);
            }
          } catch (error) {
            console.error("❌ Fetch error:", error);
          }
        }}
      >
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>

      {visible && <SuccessMessageBox text={message} type={messageType} />}
    </View>
  );
};

export default PostScreen;
