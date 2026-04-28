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
import { SafeAreaView } from "react-native-safe-area-context";

const HomeScreen = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false); // ✅ FIX

  const LIMIT = 50;

  const handleTripDeleted = (deletedId) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
    setFilteredItems((prev) => prev.filter((item) => item.id !== deletedId));
  };

  const handlePhotoDeleted = (deletedPhotoId) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedPhotoId));
    setFilteredItems((prev) =>
      prev.filter((item) => item.id !== deletedPhotoId),
    );
  };

  const fetchAll = async (lat, lng, searchTerm = "", offsetVal = 0) => {
    try {
      const tripsUrl = `${BASE_URL}/post/nearby?lat=${lat}&lng=${lng}&search=${searchTerm}&offset=${offsetVal}&limit=${LIMIT}`;
      const photosUrl = `${BASE_URL}/post/photos?lat=${lat}&lng=${lng}&offset=${offsetVal}&limit=${LIMIT}`;

      const [tripsRes, photosRes] = await Promise.all([
        fetch(tripsUrl),
        fetch(photosUrl),
      ]);

      const trips = await tripsRes.json().catch(() => []);
      const photos = await photosRes.json().catch(() => []);

      const merged = [
        ...trips.map((t) => ({ ...t, feedType: "trip" })),
        ...photos.map((p) => ({ ...p, feedType: "photo" })),
      ];

      merged.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      if (offsetVal === 0) {
        setItems(merged);
        setFilteredItems(merged);
      } else {
        setItems((prev) => {
          const map = new Map();
          [...prev, ...merged].forEach((item) => {
            map.set(`${item.feedType}-${item.id}`, item);
          });
          return Array.from(map.values());
        });

        setFilteredItems((prev) => {
          const map = new Map();
          [...prev, ...merged].forEach((item) => {
            map.set(`${item.feedType}-${item.id}`, item);
          });
          return Array.from(map.values());
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
    })();
  }, []);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("new_notification", () => {
        if (userLat && userLng) {
          setOffset(0);
          fetchAll(userLat, userLng, search, 0);
        }
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
  }, [userLat, userLng, search]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (userLat && userLng) {
        setOffset(0);
        fetchAll(userLat, userLng, search, 0);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [search, userLat, userLng]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <FlashList
          data={filteredItems}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) =>
            item.feedType === "photo" ? `photo-${item.id}` : `trip-${item.id}`
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setOffset(0);
                fetchAll(userLat, userLng, search, 0);
              }}
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
                  id={item.id}
                  user_id={item.user_id}
                  userName={item.first_name}
                  caption={item.description}
                  photos={[item.photo_url]}
                  profilePhoto={item.profile_photo}
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
          onEndReached={() => {
            if (!userLat || !userLng || loadingMore) return;

            setLoadingMore(true);

            setOffset((prevOffset) => {
              const newOffset = prevOffset + LIMIT;

              fetchAll(userLat, userLng, search, newOffset).finally(() => {
                setLoadingMore(false);
              });

              return newOffset;
            });
          }}
          onEndReachedThreshold={0.5}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;
