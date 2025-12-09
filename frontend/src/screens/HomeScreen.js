// src/screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  RefreshControl,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import TravelCard from "../common/TravelCard";
import PhotoCard from "../common/PhotoCard";
import styles from "../styles/HomeScreen_styles";
import * as Location from "expo-location";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";

const HomeScreen = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // TRIP DELETE HANDLER
  const handleTripDeleted = (deletedId) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
    setFilteredItems((prev) => prev.filter((item) => item.id !== deletedId));
  };

  // PHOTO DELETE HANDLER
  const handlePhotoDeleted = (deletedId) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
    setFilteredItems((prev) => prev.filter((item) => item.id !== deletedId));
  };

  // FETCH NEARBY TRIPS + PHOTOS
  const fetchAll = async (lat, lng) => {
    try {
      const [tripsRes, photosRes] = await Promise.all([
        fetch(`${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}`),
        fetch(`${BASE_URL}/post/photos?lat=${lat}&lng=${lng}`),
      ]);

      const trips = await tripsRes.json().catch(() => []);
      const rawPhotos = await photosRes.json().catch(() => []);

      const photos = Array.isArray(rawPhotos) ? rawPhotos : [];

      const merged = [
        ...trips.map((t) => ({ ...t, feedType: "trip" })),
        ...photos.map((p) => ({ ...p, feedType: "photo" })),
      ];

      merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setItems(merged);
      setFilteredItems(merged);
    } catch (e) {
      console.log("❌ Fetch error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // LOAD LOCATION + FETCH
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);

      fetchAll(lat, lng);
    })();
  }, []);

  // SOCKET EVENTS
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("new_notification", () => {
        if (userLat && userLng) fetchAll(userLat, userLng);
      });

      socket.on("trip_deleted", ({ tripId }) => {
        handleTripDeleted(tripId);
      });

      socket.on("photo_deleted", ({ photoId }) => {
        handlePhotoDeleted(photoId);
      });

      return () => {
        socket.off("new_notification");
        socket.off("trip_deleted");
        socket.off("photo_deleted");
      };
    });
  }, [userLat, userLng]);

  // SEARCH FILTER
  useEffect(() => {
    if (!search.trim()) {
      setFilteredItems(items);
      return;
    }

    const lower = search.toLowerCase();

    const results = items.filter((it) => {
      const a = it.origin ?? "";
      const b = it.destination ?? "";
      return `${a} ${b}`.toLowerCase().includes(lower);
    });

    setFilteredItems(results);
  }, [search, items]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <FlashList
          data={filteredItems}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(userLat, userLng)}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search trips..."
                placeholderTextColor="#9bb0d4"
                style={styles.searchBar}
              />
            </View>
          }
          renderItem={({ item }) => {
            if (item.feedType === "photo") {
              return (
                <PhotoCard
                  userName={item.first_name}
                  caption={item.description}
                  photos={[item.photo_url]}
                  profilePhoto={item.profile_photo}
                  id={item.id} // ✅ MATCHES YOUR PHOTOCARD
                  user_id={item.user_id} // ✅ MATCHES YOUR PHOTOCARD
                  onPhotoDeleted={handlePhotoDeleted}
                />
              );
            }

            if (item.feedType === "trip") {
              const tripLabel = item.trip_type || item.type || "trip";

              return (
                <TravelCard
                  from={item.origin}
                  to={item.destination}
                  date={item.trip_date}
                  seatsAvailable={item.available_seats}
                  description={item.description}
                  tripType={tripLabel}
                  firstName={item.first_name}
                  distance={item.distance}
                  creatorId={item.creator_id}
                  tripId={item.id}
                  profilePhoto={item.profile_photo}
                  onTripDeleted={handleTripDeleted}
                />
              );
            }

            return null;
          }}
          estimatedItemSize={400}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;
