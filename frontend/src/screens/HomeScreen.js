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
import styles from "../styles/HomeScreen_styles";
import * as Location from "expo-location";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";

const HomeScreen = () => {
  const [trips, setTrips] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  const fetchTrips = async (lat, lng) => {
    if (!lat || !lng) return;
    try {
      const response = await fetch(
        `${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}`
      );
      const data = await response.json();
      setTrips(data);
      setFilteredTrips(data);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current_location = await Location.getCurrentPositionAsync({});
      const lat = current_location.coords.latitude;
      const lng = current_location.coords.longitude;

      setUserLat(lat);
      setUserLng(lng);

      await fetchTrips(lat, lng);
    })();
  }, []);

  // 🔥 LISTEN TO SOCKET AND REFRESH LIST WHEN REQUEST IS ACCEPTED
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = () => {
        if (userLat && userLng) fetchTrips(userLat, userLng);
      };

      socket.on("new_notification", handler);

      return () => socket.off("new_notification", handler);
    });
  }, [userLat, userLng]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredTrips(trips);
      return;
    }

    const lower = search.toLowerCase();
    const results = trips.filter((t) =>
      `${t.origin} ${t.destination}`.toLowerCase().includes(lower)
    );
    setFilteredTrips(results);
  }, [search, trips]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <FlashList
          data={filteredTrips}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTrips(userLat, userLng)}
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
          renderItem={({ item }) => (
            <TravelCard
              from={item.origin}
              to={item.destination}
              date={item.trip_date}
              seatsAvailable={item.available_seats}
              description={item.description}
              tripType={item.type}
              firstName={item.first_name}
              distance={item.distance}
              creatorId={item.creator_id}
              tripId={item.id}
              profilePhoto={item.profile_photo}
            />
          )}
          estimatedItemSize={400}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;
