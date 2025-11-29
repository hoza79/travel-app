import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, FlatList } from "react-native";
import styles from "../styles/ProfilePassengerView_styles";
import PhotoGrid from "../common/PhotoGrid";
import FullScreenImageViewer from "../common/FullScreenImageViewer";
import Trip from "../common/Trip";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import BASE_URL from "../config/api";

const ProfilePassengerView = () => {
  const [activeTab, setActiveTab] = useState("Photos");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [trips, setTrips] = useState([]);
  const [isOwner, setIsOwner] = useState(false);

  const [name, setName] = useState("User");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);

  const [loading, setLoading] = useState(true);

  const route = useRoute();
  const passedUserId = route.params?.userId;

  useEffect(() => {
    loadProfile();
  }, [passedUserId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const myId = parseInt(await AsyncStorage.getItem("userId"), 10);
      const owner = !passedUserId || passedUserId === myId;
      setIsOwner(owner);

      const url = owner
        ? `${BASE_URL}/profile/me`
        : `${BASE_URL}/profile/${passedUserId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      setName(`${data.first_name} ${data.last_name}`);
      setBio(data.bio || "");
      setCity(data.city || "");
      setInterests(data.interests || "");

      setProfilePhoto(data.profile_photo || null);
      setCoverPhoto(data.cover_photo || null);

      if (owner) {
        await AsyncStorage.setItem("profilePhoto", data.profile_photo || "");
        await AsyncStorage.setItem("coverPhoto", data.cover_photo || "");
      }

      const tripsUrl = owner
        ? `${BASE_URL}/post/my-trips`
        : `${BASE_URL}/post/user/${passedUserId}`;

      const tripsRes = await fetch(tripsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTrips(await tripsRes.json());
    } catch (err) {
      console.log("❌ Profile load error:", err);
    } finally {
      setLoading(false);
    }
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

  const coverSource = coverPhoto
    ? { uri: coverPhoto }
    : require("../assets/profile-picture2.jpeg");

  const profileSource = profilePhoto
    ? { uri: profilePhoto }
    : require("../assets/profile-picture.jpeg");

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        ListHeaderComponent={
          <View>
            <View style={styles.headerSection}>
              <TouchableOpacity
                style={styles.coverPhoto}
                onPress={() => openImage(coverSource)}
              >
                <Image source={coverSource} style={styles.coverPhotoImage} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profilePicture}
                onPress={() => openImage(profileSource)}
              >
                <Image source={profileSource} style={styles.profileImage} />
              </TouchableOpacity>
            </View>

            <View style={styles.nameSection}>
              <Text style={styles.name}>{name}</Text>

              {isOwner && (
                <TouchableOpacity style={styles.editPenContainer}>
                  <Image
                    source={require("../assets/editPen.png")}
                    resizeMode="contain"
                    style={styles.editPen}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.aboutSection}>
              {city ? (
                <Text style={styles.aboutSectionText}>{city}</Text>
              ) : null}
              {bio ? <Text style={styles.aboutSectionText}>{bio}</Text> : null}
              {interests ? (
                <Text style={styles.aboutSectionText}>{interests}</Text>
              ) : null}
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

                {isOwner && (
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
                )}
              </View>
            </View>

            {activeTab === "Photos" && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <PhotoGrid />
              </View>
            )}

            {activeTab === "Trips" && (
              <FlatList
                data={trips}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }) => (
                  <Trip
                    from={item.origin}
                    to={item.destination}
                    date={item.trip_date}
                    seatsAvailable={item.available_seats}
                    description={item.description}
                    tripType={item.type}
                    firstName={item.first_name}
                  />
                )}
                scrollEnabled={false}
              />
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

export default ProfilePassengerView;
