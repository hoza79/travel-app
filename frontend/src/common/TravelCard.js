import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
} from "react-native";
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
  senderId,
  senderName,
  senderPhoto,
  onTripDeleted,
}) => {
  if (!tripId || isNaN(Number(tripId))) {
    console.log("❌ INVALID tripId passed:", tripId);
    return null;
  }

  const navigation = useNavigation();

  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(initialStatus ?? null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [acceptedCount, setAcceptedCount] = useState(0);
  const [isFull, setIsFull] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const collapseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadUser = async () => {
      const storedId = await AsyncStorage.getItem("userId");
      if (storedId) setCurrentUserId(parseInt(storedId, 10));
    };
    loadUser();
  }, []);

  const isOwner = currentUserId === creatorId;

  useEffect(() => {
    if (initialStatus !== undefined) setStatus(initialStatus);
  }, [initialStatus]);

  const fetchAcceptedCount = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/interest_requests/accepted_count/${tripId}`
      );
      const data = await res.json();
      const count = data?.accepted ?? 0;
      setAcceptedCount(count);
      setIsFull(count >= seatsAvailable);
    } catch {}
  };

  useEffect(() => {
    fetchAcceptedCount();
  }, [tripId]);

  useEffect(() => {
    if (initialStatus !== undefined) return;

    const loadStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `${BASE_URL}/interest_requests/status/${tripId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();
        if (data.status) setStatus(data.status);
        else setStatus(null);
      } catch {}
    };

    loadStatus();
  }, [tripId]);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handler = (notif) => {
        if (notif?.interestRequestId === interestRequestId) {
          setStatus("rejected");
          setIsFull(true);
        }
      };

      socket.on("notification_deleted", handler);

      socket.on("new_notification", (notif) => {
        try {
          if (notif?.trip_id !== tripId) return;

          if (notif?.type === "interest_accepted") {
            setStatus("accepted");
            fetchAcceptedCount();
          }
        } catch {}
      });

      return () => {
        socket.off("notification_deleted", handler);
        socket.off("new_notification");
      };
    });
  }, [tripId, interestRequestId]);

  const handleInterest = async () => {
    if (isRequesting) return;
    if (status === "pending" || status === "accepted") return;
    if (isFull) return;

    setIsRequesting(true);
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${BASE_URL}/interest_requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tripId, ownerId: creatorId }),
      });

      if (res.status === 400) {
        setIsFull(true);
        setStatus("rejected");
        return;
      }

      const data = await res.json();
      if (data?.status) setStatus(data.status);
      else setStatus("pending");

      fetchAcceptedCount();
    } catch {
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const token = await AsyncStorage.getItem("token");

      await fetch(`${BASE_URL}/post/${tripId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(collapseAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onTripDeleted) onTripDeleted(tripId);
      });
    } catch {
      setIsDeleting(false);
    }
  };

  const originCity = from?.split(",")[0]?.trim() || "";
  const destinationCity = to?.split(",")[0]?.trim() || "";
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
    require("../assets/avatar.png")
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

  const isRejected = status === "rejected";

  const showFull =
    !embeddedMode &&
    !isOwner &&
    (isFull || isRejected) &&
    status !== "accepted";

  const buttonLabel =
    status === null
      ? "Interested"
      : status === "pending"
      ? "Pending"
      : "Send Message";

  const chatUserId = creatorId;
  const chatUserName = firstName;
  const chatUserPhoto = profilePhoto;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scaleY: collapseAnim }] },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9}>
        <View>
          <View style={styles.rowCenter}>
            <TouchableOpacity
              onPress={() => {
                if (currentUserId === creatorId) {
                  navigation.navigate("BottomNavigator", { screen: "Profile" });
                } else {
                  navigation.navigate("UserProfile", { userId: creatorId });
                }
              }}
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
                <Text style={styles.seekingRideText}>{tripType}</Text>
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
            style={styles.descriptionContainer}
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

            {isOwner && (
              <TouchableOpacity
                onPress={() => setShowModal(true)}
                style={styles.deleteTripButton}
              >
                {isDeleting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.deleteTripButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            )}

            {showFull && (
              <View style={styles.fullBadge}>
                <Text style={styles.fullBadgeIcon}>🔒</Text>
                <Text style={styles.fullBadgeText}>Full</Text>
              </View>
            )}

            {!embeddedMode && !isOwner && !showFull && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (isRequesting || status === "pending") &&
                    styles.disabledButton,
                ]}
                disabled={isRequesting || status === "pending"}
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
                        otherUserId: chatUserId,
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
                  } else {
                    handleInterest();
                  }
                }}
              >
                <Text style={styles.actionButtonText}>{buttonLabel}</Text>
              </TouchableOpacity>
            )}

            {embeddedMode && notifType === "interest_request" && isOwner && (
              <View style={styles.acceptRejectRow}>
                <TouchableOpacity
                  onPress={async () => {
                    const token = await AsyncStorage.getItem("token");
                    await fetch(
                      `${BASE_URL}/interest_requests/${interestRequestId}/accept`,
                      {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );
                    setStatus("accepted");
                    fetchAcceptedCount();
                  }}
                  style={styles.acceptButton}
                >
                  <Text style={styles.acceptRejectText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    const token = await AsyncStorage.getItem("token");
                    await fetch(
                      `${BASE_URL}/interest_requests/${interestRequestId}`,
                      {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    );
                    setStatus("rejected");
                    setIsFull(true);
                    fetchAcceptedCount();
                  }}
                  style={styles.rejectButton}
                >
                  <Text style={styles.acceptRejectText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {embeddedMode && notifType === "interest_accepted" && (
              <TouchableOpacity
                style={styles.acceptedMessageButton}
                onPress={async () => {
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
                }}
              >
                <Text style={styles.acceptedMessageText}>Send Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete this trip?</Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  handleDeleteTrip();
                }}
                style={styles.modalDeleteButton}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

export default TravelCard;
