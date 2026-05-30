import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

import { FlashList } from "@shopify/flash-list";
import TravelCard from "../common/TravelCard";
import PhotoCard from "../common/PhotoCard";
import styles from "../styles/HomeScreen_styles";
import * as Location from "expo-location";
import { GOOGLE_API_KEY } from "@env";

import BASE_URL from "../config/api";
import { getSocket, onSocketConnected, onSocketReady } from "../socket";

import { SafeAreaView } from "react-native-safe-area-context";

const HomeScreen = () => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showRouteFilter, setShowRouteFilter] = useState(false);
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [pickupRadius, setPickupRadius] = useState("0.5");
  const [destinationRadius, setDestinationRadius] = useState("0.5");
  const [routeFromCoords, setRouteFromCoords] = useState(null);
  const [routeToCoords, setRouteToCoords] = useState(null);
  const [activeRouteFilter, setActiveRouteFilter] = useState(null);

  const [routeFromSuggestions, setRouteFromSuggestions] = useState([]);
  const [routeToSuggestions, setRouteToSuggestions] = useState([]);

  const routeSuggestionTimeouts = useRef({
    from: null,
    to: null,
  });
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
  const fetchRouteSuggestions = (query, type) => {
    if (!query || query.trim().length < 2) {
      if (type === "from") {
        setRouteFromSuggestions([]);
      } else {
        setRouteToSuggestions([]);
      }

      return;
    }

    clearTimeout(routeSuggestionTimeouts.current[type]);

    routeSuggestionTimeouts.current[type] = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query,
          )}&key=${GOOGLE_API_KEY}&language=en`,
        );

        const data = await response.json();

        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
          throw new Error("Could not load suggestions");
        }

        const suggestions = (data.predictions || []).map((item) => ({
          id: item.place_id,
          name: item.description,
        }));

        if (type === "from") {
          setRouteFromSuggestions(suggestions);
        } else {
          setRouteToSuggestions(suggestions);
        }
      } catch {
        if (type === "from") {
          setRouteFromSuggestions([]);
        } else {
          setRouteToSuggestions([]);
        }
      }
    }, 120);
  };

  const selectRouteLocation = async (item, type) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.id}&fields=geometry,formatted_address,name&key=${GOOGLE_API_KEY}`,
      );

      const data = await response.json();
      const location = data.result?.geometry?.location;

      if (
        data.status !== "OK" ||
        !location ||
        typeof location.lat !== "number" ||
        typeof location.lng !== "number"
      ) {
        return;
      }

      const coordinates = {
        lat: location.lat,
        lng: location.lng,
      };

      if (type === "from") {
        setRouteFrom(item.name);
        setRouteFromCoords(coordinates);
        setRouteFromSuggestions([]);
      } else {
        setRouteTo(item.name);
        setRouteToCoords(coordinates);
        setRouteToSuggestions([]);
      }

      Keyboard.dismiss();
    } catch {}
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

  const fetchRouteResults = async (filter, offsetVal = 0) => {
    try {
      const routeUrl =
        `${BASE_URL}/post/route-search?originLat=${filter.origin.lat}` +
        `&originLng=${filter.origin.lng}` +
        `&destinationLat=${filter.destination.lat}` +
        `&destinationLng=${filter.destination.lng}` +
        `&pickupRadiusKm=${filter.pickupRadiusKm}` +
        `&destinationRadiusKm=${filter.destinationRadiusKm}` +
        `&offset=${offsetVal}&limit=${LIMIT}`;

      const response = await fetch(routeUrl);
      const trips = await response.json().catch(() => []);

      const routeItems = trips.map((trip) => ({
        ...trip,
        feedType: "trip",
        distance: trip.pickup_distance,
      }));

      if (offsetVal === 0) {
        setItems(routeItems);
        setFilteredItems(routeItems);
      } else {
        setItems((prev) => {
          const map = new Map();
          [...prev, ...routeItems].forEach((item) => {
            map.set(`trip-${item.id}`, item);
          });
          return Array.from(map.values());
        });

        setFilteredItems((prev) => {
          const map = new Map();
          [...prev, ...routeItems].forEach((item) => {
            map.set(`trip-${item.id}`, item);
          });
          return Array.from(map.values());
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const loadFeed = (offsetVal = 0, filter = activeRouteFilter) => {
    if (filter) {
      return fetchRouteResults(filter, offsetVal);
    }

    if (userLat != null && userLng != null) {
      return fetchAll(userLat, userLng, search, offsetVal);
    }

    return Promise.resolve();
  };

  const buildRouteFilter = () => {
    if (pickupRadius.trim() === "" || destinationRadius.trim() === "") {
      return null;
    }
    const parsedPickupRadius = Number(pickupRadius.replace(",", "."));
    const parsedDestinationRadius = Number(destinationRadius.replace(",", "."));

    if (
      !routeFromCoords ||
      !routeToCoords ||
      !Number.isFinite(parsedPickupRadius) ||
      !Number.isFinite(parsedDestinationRadius) ||
      parsedPickupRadius < 0 ||
      parsedDestinationRadius < 0
    ) {
      return null;
    }

    return {
      origin: routeFromCoords,
      destination: routeToCoords,
      pickupRadiusKm: parsedPickupRadius,
      destinationRadiusKm: parsedDestinationRadius,
    };
  };

  const applyRouteFilter = () => {
    const filter = buildRouteFilter();

    if (!filter) return;

    setSearch("");
    setOffset(0);
    setActiveRouteFilter(filter);
    setShowRouteFilter(false);
  };

  const clearRouteFilter = () => {
    setActiveRouteFilter(null);
    setRouteFrom("");
    setRouteTo("");
    setRouteFromCoords(null);
    setRouteToCoords(null);
    setRouteFromSuggestions([]);
    setRouteToSuggestions([]);
    setPickupRadius("0.5");
    setDestinationRadius("0.5");
    setOffset(0);
    setShowRouteFilter(false);
  };

  const canApplyRouteFilter = buildRouteFilter() !== null;

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
    let socketRef = null;

    const handleNewNotification = () => {
      setOffset(0);
      loadFeed(0);
    };

    const handleTripCreatedEvent = () => {
      setOffset(0);
      loadFeed(0);
    };

    const handleTripDeletedEvent = ({ tripId }) => {
      handleTripDeleted(tripId);
    };

    const handlePhotoDeletedEvent = ({ photoId }) => {
      handlePhotoDeleted(photoId);
    };

    const attachListeners = () => {
      const socket = getSocket();
      if (!socket) return;

      if (socketRef && socketRef !== socket) {
        socketRef.off("new_notification", handleNewNotification);
        socketRef.off("trip_created", handleTripCreatedEvent);
        socketRef.off("trip_deleted", handleTripDeletedEvent);
        socketRef.off("photo_deleted", handlePhotoDeletedEvent);
      }

      socketRef = socket;
      socket.off("new_notification", handleNewNotification);
      socket.off("trip_created", handleTripCreatedEvent);
      socket.off("trip_deleted", handleTripDeletedEvent);
      socket.off("photo_deleted", handlePhotoDeletedEvent);

      socket.on("new_notification", handleNewNotification);
      socket.on("trip_created", handleTripCreatedEvent);
      socket.on("trip_deleted", handleTripDeletedEvent);
      socket.on("photo_deleted", handlePhotoDeletedEvent);
    };

    const unsubscribeReady = onSocketReady(attachListeners);
    const unsubscribeConnect = onSocketConnected(attachListeners);

    return () => {
      unsubscribeReady();
      unsubscribeConnect();

      if (socketRef) {
        socketRef.off("new_notification", handleNewNotification);
        socketRef.off("trip_created", handleTripCreatedEvent);
        socketRef.off("trip_deleted", handleTripDeletedEvent);
        socketRef.off("photo_deleted", handlePhotoDeletedEvent);
      }
    };
  }, [userLat, userLng, search, activeRouteFilter]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setOffset(0);
      loadFeed(0);
    }, 500);

    return () => clearTimeout(delay);
  }, [search, userLat, userLng, activeRouteFilter]);

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
                setRefreshing(true);
                setOffset(0);
                loadFeed(0);
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={styles.searchRow}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  editable={!activeRouteFilter}
                  placeholder={
                    activeRouteFilter
                      ? "Route filter active"
                      : "Search trips..."
                  }
                  placeholderTextColor="#9bb0d4"
                  style={styles.searchBar}
                />

                <TouchableOpacity
                  style={styles.filterButton}
                  activeOpacity={0.8}
                  onPress={() => setShowRouteFilter(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open route filter"
                >
                  <Image
                    source={require("../assets/filter.png")}
                    resizeMode="contain"
                    style={styles.filterIcon}
                  />
                </TouchableOpacity>
              </View>
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
                  pickupDistance={item.pickup_distance}
                  destinationDistance={item.destination_distance}
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
            if (
              loadingMore ||
              (!activeRouteFilter && (userLat == null || userLng == null))
            ) {
              return;
            }

            setLoadingMore(true);

            setOffset((prevOffset) => {
              const newOffset = prevOffset + LIMIT;

              loadFeed(newOffset).finally(() => {
                setLoadingMore(false);
              });

              return newOffset;
            });
          }}
          onEndReachedThreshold={0.5}
        />
        <Modal
          transparent
          animationType="fade"
          visible={showRouteFilter}
          onRequestClose={() => setShowRouteFilter(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.filterModal}>
                <Text style={styles.modalTitle}>Find a matching route</Text>

                <View style={styles.locationField}>
                  <Text style={styles.fieldLabel}>From</Text>
                  <TextInput
                    value={routeFrom}
                    onChangeText={(text) => {
                      setRouteFrom(text);
                      setRouteFromCoords(null);
                      fetchRouteSuggestions(text, "from");
                    }}
                    onFocus={() => setRouteToSuggestions([])}
                    placeholder="Select start location"
                    placeholderTextColor="#8294b7"
                    style={styles.filterInput}
                  />

                  {routeFromSuggestions.length > 0 && (
                    <View style={styles.suggestionList}>
                      {routeFromSuggestions.slice(0, 5).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.suggestionItem}
                          activeOpacity={0.8}
                          onPress={() => selectRouteLocation(item, "from")}
                        >
                          <Text style={styles.suggestionText} numberOfLines={2}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.locationFieldSecond}>
                  <Text style={styles.fieldLabel}>To</Text>
                  <TextInput
                    value={routeTo}
                    onChangeText={(text) => {
                      setRouteTo(text);
                      setRouteToCoords(null);
                      fetchRouteSuggestions(text, "to");
                    }}
                    onFocus={() => setRouteFromSuggestions([])}
                    placeholder="Select destination"
                    placeholderTextColor="#8294b7"
                    style={styles.filterInput}
                  />

                  {routeToSuggestions.length > 0 && (
                    <View style={styles.suggestionList}>
                      {routeToSuggestions.slice(0, 5).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.suggestionItem}
                          activeOpacity={0.8}
                          onPress={() => selectRouteLocation(item, "to")}
                        >
                          <Text style={styles.suggestionText} numberOfLines={2}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.radiusRow}>
                  <View style={styles.radiusField}>
                    <Text style={styles.fieldLabel}>
                      Max distance to pickup
                    </Text>
                    <View style={styles.distanceInputRow}>
                      <TextInput
                        value={pickupRadius}
                        onChangeText={setPickupRadius}
                        keyboardType="decimal-pad"
                        style={styles.distanceInput}
                      />
                      <Text style={styles.distanceUnit}>km</Text>
                    </View>
                  </View>

                  <View style={styles.radiusField}>
                    <Text style={styles.fieldLabel}>
                      Max distance from drop-off
                    </Text>
                    <View style={styles.distanceInputRow}>
                      <TextInput
                        value={destinationRadius}
                        onChangeText={setDestinationRadius}
                        keyboardType="decimal-pad"
                        style={styles.distanceInput}
                      />
                      <Text style={styles.distanceUnit}>km</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  {activeRouteFilter && (
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      activeOpacity={0.8}
                      onPress={clearRouteFilter}
                    >
                      <Text style={styles.modalCloseButtonText}>Reset</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                    onPress={() => setShowRouteFilter(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      !canApplyRouteFilter && styles.disabledButton,
                    ]}
                    activeOpacity={0.8}
                    disabled={!canApplyRouteFilter}
                    onPress={applyRouteFilter}
                  >
                    <Text style={styles.applyButtonText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default HomeScreen;
