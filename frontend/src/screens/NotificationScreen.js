import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { getSocket, onSocketReady } from "../socket";
import BASE_URL from "../config/api";
import { NotificationContext } from "../context/NotificationContext";
import TravelCard from "../common/TravelCard";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const { setUnreadCount } = useContext(NotificationContext);

  const isFocused = useIsFocused();

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);

  const load = async () => {
    const token = await AsyncStorage.getItem("token");
    try {
      const res = await fetch(`${BASE_URL}/notifications/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  const openTripPopup = async (notification) => {
    if (!notification) return;

    const tripId = notification.trip_id;
    setPopupLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/post/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tripData = await res.json();

      const senderId = notification.sender_id;
      const senderName = notification.sender_name;
      const senderPhoto = notification.sender_photo;

      setSelectedTrip({
        ...tripData,
        tripId: tripData.id,
        creatorId: tripData.creator_id,
        interestRequestId: notification.interest_request_id,
        notifType: notification.type,
        senderId,
        senderName,
        senderPhoto,
      });
    } catch (err) {
      console.log("Popup load error:", err);
    }

    setPopupLoading(false);
  };

  const closePopup = () => setSelectedTrip(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("new_notification", () => load());
      socket.on("notification_deleted", () => load());
    });

    return () => {
      const socket = getSocket();
      socket?.off("new_notification");
      socket?.off("notification_deleted");
    };
  }, []);

  // ⭐ Mark read on focus
  useEffect(() => {
    if (!isFocused) return;

    (async () => {
      const token = await AsyncStorage.getItem("token");
      try {
        await fetch(`${BASE_URL}/notifications/mark-read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}

      setUnreadCount(0);
      load();
    })();
  }, [isFocused]);

  if (!notifications || notifications.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: "#061237" }]}>
        <Text style={{ color: "white", fontSize: 18 }}>
          No notifications yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((n, i) => (
          <TouchableOpacity
            key={n.id || i}
            style={styles.bubble}
            onPress={() => openTripPopup(n)}
          >
            <View style={styles.headerRow}>
              <Image
                source={{
                  uri: n.sender_photo || "https://i.stack.imgur.com/l60Hf.png",
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{n.sender_name}</Text>
            </View>

            <Text style={styles.message}>{n.message}</Text>

            {n.type === "interest_request" && (
              <View style={styles.buttonsRowCircle}>
                <TouchableOpacity
                  onPress={async () => {
                    const token = await AsyncStorage.getItem("token");
                    try {
                      await fetch(
                        `${BASE_URL}/interest_requests/${n.interest_request_id}/accept`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );

                      load();
                      setUnreadCount((prev) => Math.max(prev - 1, 0));
                    } catch {}
                  }}
                  style={styles.circleBtn}
                >
                  <Text style={styles.circleText}>✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setNotifications((prev) =>
                      prev.filter((x) => x.id !== n.id)
                    );
                    setUnreadCount((prev) => Math.max(prev - 1, 0));
                  }}
                  style={styles.circleBtn}
                >
                  <Text style={styles.circleText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(selectedTrip || popupLoading) && (
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popupContainer}>
                {popupLoading ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    <TravelCard
                      {...selectedTrip}
                      embeddedMode={true}
                      tripId={selectedTrip?.tripId}
                      // ⭐ FIXED LINE: Always correct owner ID for chat
                      creatorId={
                        selectedTrip?.notifType === "interest_accepted"
                          ? selectedTrip?.senderId // owner accepted → sender is owner
                          : selectedTrip?.creatorId // feed data
                      }
                      notifType={selectedTrip?.notifType}
                      interestRequestId={selectedTrip?.interestRequestId}
                      senderId={selectedTrip?.senderId}
                      senderName={selectedTrip?.senderName}
                      senderPhoto={selectedTrip?.senderPhoto}
                    />
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061237" },
  scrollContent: { paddingTop: 40, paddingHorizontal: 18, paddingBottom: 120 },

  bubble: {
    backgroundColor: "#020d2d",
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
  },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 28, marginRight: 12 },
  name: { color: "white", fontSize: 18, fontWeight: "600" },

  message: { color: "#d7d9e8", fontSize: 16, marginBottom: 16, lineHeight: 22 },

  buttonsRowCircle: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 14,
    marginTop: 8,
  },

  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  circleText: {
    color: "#061237",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: -2,
  },

  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  popupContainer: {
    width: "90%",
    maxHeight: "85%",
    backgroundColor: "transparent",
  },
});
