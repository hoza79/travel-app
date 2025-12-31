import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import styles from "../styles/ProfilePassengerView_styles";
import PhotoGrid from "../common/PhotoGrid";
import FullScreenImageViewer from "../common/FullScreenImageViewer";
import TravelCard from "../common/TravelCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import BASE_URL from "../config/api";

const ProfileSelfScreen = () => {
  const [activeTab, setActiveTab] = useState("Photos");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trips, setTrips] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [name, setName] = useState("User");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const myId = parseInt(await AsyncStorage.getItem("userId"), 10);
      if (!token || !myId) return;

      const res = await fetch(`${BASE_URL}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const first = data.first_name || "";
      const last = data.last_name || "";
      const fullName = `${first} ${last}`.trim();

      setName(fullName || "User");
      setBio(data.bio || "");
      setCity(data.city || "");
      setInterests(data.interests || "");
      setProfilePhoto(data.profile_photo || null);
      setCoverPhoto(data.cover_photo || null);

      const tripsRes = await fetch(`${BASE_URL}/post/my-trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrips(await tripsRes.json());

      const photosRes = await fetch(`${BASE_URL}/post/photos/${myId}`);
      setPhotos(await photosRes.json());
    } catch (err) {
      console.log("❌ Profile load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const openImage = (src) => {
    setSelectedImage(src);
    setIsFullScreen(true);
  };

  const closeImage = () => {
    setIsFullScreen(false);
    setSelectedImage(null);
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: "#051636" }} />;
  }

  const coverSource = coverPhoto ? { uri: coverPhoto } : null;
  const profileSource = profilePhoto
    ? { uri: profilePhoto }
    : require("../assets/avatar.png");

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerSection}>
              {coverSource && (
                <TouchableOpacity
                  style={styles.coverPhoto}
                  onPress={() => openImage(coverSource)}
                >
                  <Image source={coverSource} style={styles.coverPhotoImage} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.profilePicture}
                onPress={() => openImage(profileSource)}
              >
                <Image source={profileSource} style={styles.profileImage} />
              </TouchableOpacity>
            </View>

            <View style={styles.nameSection}>
              <Text style={styles.name}>{name}</Text>
              <TouchableOpacity style={styles.editPenContainer}>
                <Image
                  source={require("../assets/editPen.png")}
                  resizeMode="contain"
                  style={styles.editPen}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutSection}>
              {city && <Text style={styles.aboutSectionText}>{city}</Text>}
              {bio && <Text style={styles.aboutSectionText}>{bio}</Text>}
              {interests && (
                <Text style={styles.aboutSectionText}>{interests}</Text>
              )}
            </View>

            <View style={styles.headerTabsRow}>
              <View style={styles.tabsContainer}>
                <TouchableOpacity onPress={() => setActiveTab("Photos")}>
                  <Text
                    style={[
                      styles.headerText,
                      activeTab === "Photos" && styles.activeTabText,
                    ]}
                  >
                    Photos
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab("Trips")}>
                  <Text
                    style={[
                      styles.headerText,
                      activeTab === "Trips" && styles.activeTabText,
                    ]}
                  >
                    Trips
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setActiveTab("Myfriends")}>
                  <Text
                    style={[
                      styles.headerText,
                      activeTab === "Myfriends" && styles.activeTabText,
                    ]}
                  >
                    Myfriends
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {activeTab === "Photos" && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <PhotoGrid photos={photos} />
              </View>
            )}

            {activeTab === "Trips" && (
              <FlatList
                data={trips}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }) => (
                  <TravelCard
                    from={item.origin}
                    to={item.destination}
                    date={item.trip_date}
                    seatsAvailable={item.available_seats}
                    description={item.description}
                    tripType={item.type}
                    firstName={item.first_name}
                    creatorId={item.creator_id}
                    tripId={item.id}
                    profilePhoto={item.profile_photo}
                    embeddedMode={false}
                  />
                )}
                scrollEnabled={false}
              />
            )}

            {activeTab === "Myfriends" && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <Text style={{ color: "white" }}>My friends list here...</Text>
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.scrollContent}
      />

      {isFullScreen && selectedImage && (
        <FullScreenImageViewer source={selectedImage} onClose={closeImage} />
      )}
    </View>
  );
};

export default ProfileSelfScreen;
