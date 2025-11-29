import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import TravelCard from "../common/TravelCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";

export default function TripViewScreen({ route }) {
  const tripId = route?.params?.tripId;

  // 🔥 FIX: Prevent NaN / undefined crash
  if (!tripId) {
    console.log(
      "❌ TripViewScreen opened WITHOUT tripId → preventing NaN fetch"
    );
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#061237",
        }}
      >
        <Text style={{ color: "white" }}>
          Trip unavailable. Missing tripId.
        </Text>
      </View>
    );
  }

  const [trip, setTrip] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem("token");

        // LOAD TRIP
        const res = await fetch(`${BASE_URL}/post/${tripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tripData = await res.json();
        setTrip(tripData);

        // LOAD INTEREST STATUS
        const sRes = await fetch(
          `${BASE_URL}/interest_requests/status/${tripId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const sData = await sRes.json();
        setStatus(sData.status || null);
      } catch (err) {
        console.log("TripView error:", err);
      }
      setLoading(false);
    };

    load();
  }, [tripId]);

  if (loading || !trip) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#061237",
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 20,
        backgroundColor: "#061237",
        flexGrow: 1,
      }}
    >
      <TravelCard {...trip} initialStatus={status} />
    </ScrollView>
  );
}
