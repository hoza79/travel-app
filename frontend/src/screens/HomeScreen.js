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

  const fetchAll = async (lat, lng) => {
    try {
      const [tripsRes, photosRes] = await Promise.all([
        fetch(`${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}`),
        fetch(`${BASE_URL}/post/photos?lat=${lat}&lng=${lng}`),
      ]);

      const trips = await tripsRes.json();
      const rawPhotos = await photosRes.json();

      const photos = Array.isArray(rawPhotos) ? rawPhotos : [];

      // --- FIX: Avoid overwriting item.type ---
      const merged = [
        ...trips.map((t) => ({ ...t, feedType: "trip" })),
        ...photos.map((p) => ({ ...p, feedType: "photo" })),
      ];

      merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setItems(merged);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load once
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);

      await fetchAll(lat, lng);
    })();
  }, []);

  // Refresh on notifications
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = () => {
        if (userLat && userLng) fetchAll(userLat, userLng);
      };

      socket.on("new_notification", handler);
      return () => socket.off("new_notification", handler);
    });
  }, [userLat, userLng]);

  // Search filter
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
            // 🔥 PHOTO POST
            if (item.feedType === "photo") {
              return (
                <PhotoCard
                  userName={item.first_name}
                  caption={item.description}
                  photos={[item.photo_url]}
                  profilePhoto={item.profile_photo}
                />
              );
            }

            // 🔥 TRIP POST
            if (item.feedType === "trip") {
              const tripLabel = item.trip_type || item.type || "trip"; // backend label

              return (
                <TravelCard
                  from={item.origin}
                  to={item.destination}
                  date={item.trip_date}
                  seatsAvailable={item.available_seats}
                  description={item.description}
                  tripType={tripLabel} // <--- this FIXES “trip” showing everywhere
                  firstName={item.first_name}
                  distance={item.distance}
                  creatorId={item.creator_id}
                  tripId={item.id}
                  profilePhoto={item.profile_photo}
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
