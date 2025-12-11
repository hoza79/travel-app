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
import { SafeAreaView } from "react-native-safe-area-context";

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
      const senderFirst = notification.sender_first_name;
      const senderLast = notification.sender_last_name;
      const senderPhoto = notification.sender_photo;

      setSelectedTrip({
        ...tripData,
        tripId: tripData.id,
        creatorId: tripData.creator_id,
        interestRequestId: notification.interest_request_id,
        notifType: notification.type,
        senderId,
        senderFirst,
        senderLast,
        senderPhoto,
      });
    } catch (err) {
      console.log("Popup load error:", err);
    }

    setPopupLoading(false);
  };

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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {notifications.map((n, i) => {
          const dateObj = new Date(n.created_at);

          const formattedDate = dateObj.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          });

          const formattedTime = dateObj.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <TouchableOpacity
              key={n.id || i}
              style={styles.row}
              onPress={() => openTripPopup(n)}
            >
              <View style={styles.bubble}>
                <View style={styles.rowContent}>
                  <Image
                    source={{
                      uri:
                        n.sender_photo || "https://i.stack.imgur.com/l60Hf.png",
                    }}
                    style={styles.avatar}
                  />

                  <View style={styles.textColumn}>
                    <Text style={styles.name}>
                      {n.sender_first_name} {n.sender_last_name}
                    </Text>

                    <Text style={styles.message}>{n.message}</Text>
                  </View>

                  {/* ⭐ HIDE DATE FOR INTEREST REQUESTS ⭐ */}
                  {n.type !== "interest_request" && (
                    <View style={styles.timeColumn}>
                      <Text style={styles.dateText}>{formattedDate}</Text>
                      <Text style={styles.timeText}>{formattedTime}</Text>
                    </View>
                  )}
                </View>

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
                      onPress={async () => {
                        const token = await AsyncStorage.getItem("token");
                        try {
                          await fetch(
                            `${BASE_URL}/interest_requests/${n.interest_request_id}`,
                            {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            }
                          );
                        } catch {}

                        load();
                        setUnreadCount((prev) => Math.max(prev - 1, 0));
                      }}
                      style={styles.circleBtn}
                    >
                      <Text style={styles.circleText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {(selectedTrip || popupLoading) && (
        <TouchableWithoutFeedback onPress={() => setSelectedTrip(null)}>
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
                      creatorId={
                        selectedTrip?.notifType === "interest_accepted"
                          ? selectedTrip?.senderId
                          : selectedTrip?.creatorId
                      }
                      notifType={selectedTrip?.notifType}
                      interestRequestId={selectedTrip?.interestRequestId}
                      senderId={selectedTrip?.senderId}
                      senderName={`${selectedTrip?.senderFirst} ${selectedTrip?.senderLast}`}
                      senderPhoto={selectedTrip?.senderPhoto}
                    />
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#061237" },

  row: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgb(20,35,75)",
    paddingHorizontal: 18,
  },

  bubble: {
    backgroundColor: "#071236",
    padding: 15,
    borderRadius: 20,
    width: "100%",
  },

  rowContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 28,
    marginRight: 12,
  },

  textColumn: {
    flexDirection: "column",
    justifyContent: "center",
  },

  name: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },

  message: {
    color: "#d7d9e8",
    fontSize: 15,
  },

  timeColumn: {
    marginLeft: "auto",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingLeft: 10,
  },

  dateText: {
    color: "rgb(120,130,160)",
    fontSize: 12,
    marginBottom: 4,
  },

  timeText: {
    color: "rgb(120,130,160)",
    fontSize: 12,
  },

  buttonsRowCircle: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 14,
  },

  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  circleText: {
    color: "#061237",
    fontSize: 20,
    fontWeight: "bold",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

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
