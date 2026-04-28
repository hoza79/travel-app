import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady } from "../socket";
import BASE_URL from "../config/api";
import { AppState } from "react-native";

export const NotificationContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const refetchUnread = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;

      if (mountedRef.current) {
        setUnreadCount(count);
      }
    } catch (e) {
      console.log("❌ refetchUnread error:", e);
    }
  };

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handleNewNotification = () => {
        console.log("🔥 NEW NOTIFICATION EVENT");
        refetchUnread();
      };

      const handleDeletion = () => {
        console.log("🗑 NOTIFICATION DELETED EVENT");
        refetchUnread();
      };

      const handleReconnect = async () => {
        console.log("🔁 SOCKET RECONNECTED");

        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          socket.emit("identify", { userId });
          console.log("👤 RE-IDENTIFIED:", userId);
        }

        refetchUnread();
      };

      socket.off("new_notification");
      socket.off("notification_deleted");
      socket.off("connect");

      socket.on("new_notification", handleNewNotification);
      socket.on("notification_deleted", handleDeletion);
      socket.on("connect", handleReconnect);

      refetchUnread();

      return () => {
        socket.off("new_notification", handleNewNotification);
        socket.off("notification_deleted", handleDeletion);
        socket.off("connect", handleReconnect);
      };
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const socket = getSocket();
        const userId = await AsyncStorage.getItem("userId");

        if (socket && socket.connected && userId) {
          socket.emit("identify", { userId });
        }

        refetchUnread();
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
