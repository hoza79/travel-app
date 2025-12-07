// src/common/TravelCard.js
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import styles from "../styles/TravelCard_styles";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";
import { countryFlags } from "../common/Flags";

const getFlagForLocation = (location) => {
  if (!location || typeof location !== "string") return "";
  const parts = location.split(",");
  const country = parts[parts.length - 1].trim();
  return countryFlags[country] || "";
};

const TravelCard = ({
  firstName,
  from,
  to,
  date,
  seatsAvailable,
  description,
  tripType,
  distance,
  creatorId,
  tripId,
  profilePhoto,
  initialStatus,
  embeddedMode,
  notifType,
  interestRequestId,

  // ⭐ ADDED FOR FIX
  senderId,
  senderName,
  senderPhoto,
}) => {
  if (!tripId || isNaN(Number(tripId))) {
    console.log("❌ INVALID tripId passed to TravelCard:", tripId);
    return null;
  }

  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(initialStatus ?? null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const loadUser = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      if (storedId) setCurrentUserId(parseInt(storedId, 10));
    };
    loadUser();
  }, []);

  const isOwner = currentUserId === creatorId;

  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialStatus !== undefined) return;

    const loadStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `${BASE_URL}/interest_requests/status/${tripId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await res.json();
        if (data.status) setStatus(data.status);
        else setStatus(null);
      } catch (err) {
        console.log("Status fetch error:", err);
      }
    };

    loadStatus();
  }, [tripId]);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = (notif) => {
        try {
          if (
            notif?.type === "interest_accepted" &&
            notif?.trip_id === tripId
          ) {
            setStatus("accepted");
          }

          if (
            notif?.type === "interest_request_deleted" &&
            notif?.trip_id === tripId
          ) {
            setStatus(null);
          }
        } catch {}
      };

      socket.on("new_notification", handler);
      return () => socket.off("new_notification", handler);
    });
  }, [tripId]);

  const handleInterest = async () => {
    if (isRequesting) return;
    if (status === "pending" || status === "accepted") return;

    setIsRequesting(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/interest_requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId: tripId, ownerId: creatorId }),
      });

      const data = await res.json();

      if (data && data.status) {
        setStatus(data.status);
      } else {
        setStatus("pending");
      }
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAccept = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/interest_requests/${interestRequestId}/accept`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus("accepted");
    } catch (err) {
      console.log("Accept error:", err);
    }
  };

  const handleDecline = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      await fetch(`${BASE_URL}/interest_requests/${interestRequestId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setStatus(null);
    } catch (err) {
      console.log("Decline error:", err);
    }
  };

  const originCity = from ? from.split(",")[0].trim() : "";
  const destinationCity = to ? to.split(",")[0].trim() : "";

  const originFlag = getFlagForLocation(from);
  const destinationFlag = getFlagForLocation(to);

  let formattedDate = "";
  if (date) {
    formattedDate = new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
    });
    formattedDate =
      formattedDate.charAt(0).toLowerCase() + formattedDate.slice(1);
  }

  const [avatarSource, setAvatarSource] = useState(
    require("../assets/profile-picture.jpeg")
  );

  useEffect(() => {
    const loadAvatar = async () => {
      if (profilePhoto) {
        setAvatarSource({ uri: profilePhoto });
        return;
      }

      const stored = await AsyncStorage.getItem("profilePhoto");
      if (stored) {
        setAvatarSource({ uri: stored });
        return;
      }
    };

    loadAvatar();
  }, [profilePhoto]);

  const buttonLabel =
    status === null
      ? "Interested"
      : status === "pending"
      ? "Pending"
      : "Send Message";

  const buttonDisabled = isOwner || status === "pending" || isRequesting;

  // ⭐ FIX: Decide the correct messaging target
  const chatUserId = embeddedMode && senderId ? senderId : creatorId;
  const chatUserName = embeddedMode && senderName ? senderName : firstName;
  const chatUserPhoto =
    embeddedMode && senderPhoto ? senderPhoto : profilePhoto;

  return (
    <TouchableOpacity activeOpacity={0.9}>
      <View style={styles.container}>
        <View>
          <View style={styles.rowCenter}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Profile", { userId: creatorId })
              }
              style={styles.profilePicture}
            >
              <Image
                source={avatarSource}
                resizeMode="cover"
                style={styles.profileImage}
              />
            </TouchableOpacity>

            <View style={styles.columnStart}>
              <Text style={styles.firstName}>{firstName}</Text>

              <View style={styles.seekingRideContainer}>
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {tripType}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            {distance != null && (
              <Text style={styles.distanceText}>
                {distance < 1 ? "Nearby" : `${distance.toFixed(0)} km away`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.destination}>
          <Text
            style={styles.destinationText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {originCity} {originFlag} → {destinationCity} {destinationFlag}
          </Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <TouchableOpacity
          style={styles.description}
          onPress={() => setExpanded(!expanded)}
        >
          <Text
            style={styles.descriptionText}
            numberOfLines={expanded ? undefined : 3}
          >
            {description}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.seatsAvailable}>
            {seatsAvailable} Seats available
          </Text>

          {/* OWNER: Accept / Decline */}
          {embeddedMode &&
            notifType === "interest_request" &&
            isOwner &&
            status !== "accepted" && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 14,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  onPress={handleAccept}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "white",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#061237",
                      fontSize: 22,
                      fontWeight: "700",
                      marginTop: -2,
                    }}
                  >
                    ✓
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDecline}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: "white",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#061237",
                      fontSize: 22,
                      fontWeight: "700",
                      marginTop: -2,
                    }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {/* HOME FEED BUTTON */}
          {!embeddedMode && !isOwner && (
            <TouchableOpacity
              style={[
                styles.button,
                buttonDisabled ? { opacity: 0.6 } : undefined,
              ]}
              onPress={async () => {
                if (status === "accepted") {
                  const token = await AsyncStorage.getItem("token");

                  const res = await fetch(`${BASE_URL}/conversations/start`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      otherUserId: creatorId,
                    }),
                  });

                  const data = await res.json();
                  const conversationId = data.conversationId;

                  navigation.navigate("Chat", {
                    conversationId,
                    receiverId: creatorId,
                    receiverName: firstName,
                    receiverPhoto: profilePhoto,
                  });
                } else {
                  handleInterest();
                }
              }}
              disabled={buttonDisabled}
            >
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            </TouchableOpacity>
          )}

          {/* NOTIFICATION MODE BUTTON */}
          {embeddedMode &&
            (notifType === "interest_accepted" ||
              (notifType === "interest_request" &&
                isOwner &&
                status === "accepted")) && (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: "white", opacity: 1 },
                ]}
                onPress={async () => {
                  const token = await AsyncStorage.getItem("token");

                  const res = await fetch(`${BASE_URL}/conversations/start`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      otherUserId: chatUserId, // ⭐ FIXED
                    }),
                  });

                  const data = await res.json();
                  const conversationId = data.conversationId;

                  navigation.navigate("Chat", {
                    conversationId,
                    receiverId: chatUserId,
                    receiverName: chatUserName,
                    receiverPhoto: chatUserPhoto,
                  });
                }}
              >
                <Text style={styles.buttonText}>Send Message</Text>
              </TouchableOpacity>
            )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TravelCard;
