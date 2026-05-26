import {
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
  Modal,
} from "react-native";
import React, { useRef, useState } from "react";
import styles from "../styles/PostScreen_styles";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOOGLE_API_KEY } from "@env";
import BASE_URL from "../config/api";
import * as ImagePicker from "expo-image-picker";

const PostScreen = () => {
  const navigation = useNavigation();

  const [selectedMain, setSelectedMain] = useState("trip");
  const [tripType, setTripType] = useState("Offering");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [photoLocationSuggestions, setPhotoLocationSuggestions] = useState([]);

  const [date, setDate] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [description, setDescription] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [location, setLocation] = useState("");
  const [photo, setPhoto] = useState(null);

  const [showPostModal, setShowPostModal] = useState(false);
  const [postModalText, setPostModalText] = useState("");
  const [navigateAfterOk, setNavigateAfterOk] = useState(false);

  const suggestionTimeouts = useRef({
    from: null,
    to: null,
    photoLocation: null,
  });

  const CLOUD_NAME = "del5ajmby";
  const UPLOAD_PRESET = "profile_preset";

  const showPostMessage = (message, shouldNavigate = false) => {
    setPostModalText(message);
    setNavigateAfterOk(shouldNavigate);
    setShowPostModal(true);
  };

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
    } catch (error) {}
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
      {
        method: "POST",
        body: data,
      },
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

  const fetchPlaceDetails = async (placeId) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name,types&key=${GOOGLE_API_KEY}`,
    );

    const data = await res.json();

    if (data.status !== "OK" || !data.result) {
      throw new Error(data.error_message || "Could not load place details");
    }

    return data.result;
  };

  const geocodeSelectedAddress = async (address) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address,
      )}&key=${GOOGLE_API_KEY}`,
    );

    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      throw new Error(data.error_message || "Could not geocode selected place");
    }

    return data.results[0];
  };

  const fetchAutocompletePredictions = async (query, typeFilter) => {
    const typeQuery = typeFilter ? `&types=${typeFilter}` : "";

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query,
      )}&key=${GOOGLE_API_KEY}&language=en${typeQuery}`,
    );

    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(data.error_message || "Could not load suggestions");
    }

    return data?.predictions || [];
  };

  const simplifyPredictions = (predictions) => {
    const uniquePredictions = new Map();

    predictions.forEach((item) => {
      if (!uniquePredictions.has(item.place_id)) {
        uniquePredictions.set(item.place_id, {
          id: item.place_id,
          name: item.description,
          types: item.types || [],
        });
      }
    });

    return Array.from(uniquePredictions.values());
  };

  const fetchTripSuggestions = async (query) => {
    let predictions = [];

    try {
      predictions = predictions.concat(
        await fetchAutocompletePredictions(query, "address"),
      );
    } catch (error) {}

    try {
      predictions = predictions.concat(
        await fetchAutocompletePredictions(query, "establishment"),
      );
    } catch (error) {}

    try {
      predictions = predictions.concat(
        await fetchAutocompletePredictions(query),
      );
    } catch (error) {}

    return simplifyPredictions(predictions);
  };

  const fetchGenericSuggestions = async (query) => {
    const predictions = await fetchAutocompletePredictions(query);
    return simplifyPredictions(predictions);
  };

  const selectTripLocation = async (item, type) => {
    try {
      let selectedName = item.name;
      let selectedCoords = null;

      try {
        const details = await fetchPlaceDetails(item.id);
        const location = details.geometry?.location;

        if (
          location &&
          typeof location.lat === "number" &&
          typeof location.lng === "number"
        ) {
          selectedCoords = {
            lat: location.lat,
            lng: location.lng,
          };
        }
      } catch (detailsError) {
        const geocoded = await geocodeSelectedAddress(item.name);
        const location = geocoded.geometry?.location;

        if (
          location &&
          typeof location.lat === "number" &&
          typeof location.lng === "number"
        ) {
          selectedCoords = {
            lat: location.lat,
            lng: location.lng,
          };
        }
      }

      if (!selectedCoords) {
        throw new Error("Missing coordinates for selected place");
      }

      if (type === "from") {
        setFrom(selectedName);
        setFromCoords(selectedCoords);
        setFromSuggestions([]);
      } else {
        setTo(selectedName);
        setToCoords(selectedCoords);
        setToSuggestions([]);
      }
    } catch (error) {
      showPostMessage(
        "Could not get coordinates for that place. Please select another suggestion.",
      );
    }
  };

  const fetchSuggestions = async (query, type) => {
    if (!query || query.length < 2) {
      if (type === "from") setFromSuggestions([]);
      else if (type === "to") setToSuggestions([]);
      else if (type === "photoLocation") setPhotoLocationSuggestions([]);

      return;
    }

    clearTimeout(suggestionTimeouts.current[type]);

    suggestionTimeouts.current[type] = setTimeout(async () => {
      try {
        const simplified =
          type === "from" || type === "to"
            ? await fetchTripSuggestions(query)
            : await fetchGenericSuggestions(query);

        if (type === "from") {
          setFromSuggestions(simplified);
        } else if (type === "to") {
          setToSuggestions(simplified);
        } else {
          setPhotoLocationSuggestions(simplified);
        }
      } catch (error) {}
    }, 120);
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

                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="From (select place or city)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={from}
                      onChangeText={(text) => {
                        setFrom(text);
                        setFromCoords(null);
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
                          onPress={() => selectTripLocation(item, "from")}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

                <View style={{ position: "relative", marginBottom: 10 }}>
                  <View style={styles.inputContainer}>
                    <Image
                      source={require("../assets/mapIcon.png")}
                      style={styles.icon}
                    />
                    <TextInput
                      placeholder="To (select place or city)"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.textInput}
                      value={to}
                      onChangeText={(text) => {
                        setTo(text);
                        setToCoords(null);
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
                          onPress={() => selectTripLocation(item, "to")}
                        >
                          <Text style={styles.dropdownText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>

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
                        setDate(selectedDate.toISOString().split("T")[0]);
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
              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 15,
                    }}
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

              <View style={{ position: "relative", marginBottom: 10 }}>
                <TextInput
                  placeholder="Location"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={styles.textInputPhoto}
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
                    fetchSuggestions(text, "photoLocation");
                  }}
                />

                {photoLocationSuggestions.length > 0 && (
                  <FlatList
                    data={photoLocationSuggestions}
                    keyExtractor={(item) => item.id}
                    style={styles.photoDropdown}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setLocation(item.name);
                          setPhotoLocationSuggestions([]);
                        }}
                      >
                        <Text style={styles.dropdownText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>

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
            await handlePhotoPost();
            setPostModalText("Photo posted successfully");
            setNavigateAfterOk(true);
            setShowPostModal(true);
            return;
          }

          try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            if (!fromCoords || !toCoords) {
              showPostMessage(
                "Please select From and To locations from the suggestions.",
              );
              return;
            }

            const response = await fetch(`${BASE_URL}/post`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                from,
                to,
                originLat: fromCoords.lat,
                originLng: fromCoords.lng,
                destinationLat: toCoords.lat,
                destinationLng: toCoords.lng,
                date,
                seatsAvailable,
                description,
                type: tripType,
              }),
            });

            const data = await response.json();

            if (response.ok) {
              setPostModalText("Trip posted successfully");
              setNavigateAfterOk(true);
            } else {
              setPostModalText(data?.message || "Something went wrong");
              setNavigateAfterOk(false);
            }

            setShowPostModal(true);
          } catch (e) {}
        }}
      >
        <Text style={styles.buttonText}>Post</Text>
      </TouchableOpacity>

      <Modal transparent visible={showPostModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{postModalText}</Text>

            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={() => {
                setShowPostModal(false);

                if (navigateAfterOk) {
                  setNavigateAfterOk(false);
                  navigation.replace("BottomNavigator");
                }
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PostScreen;
