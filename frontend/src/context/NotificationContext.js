import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady, connectSocket } from "../socket";
import BASE_URL from "../config/api";
import { AppState } from "react-native";

export const NotificationContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);
  const listenersAttached = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const fetchInitialUnread = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 0;

      if (mountedRef.current) setUnreadCount(count);
    } catch {}
  };

  const initSocketSafely = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) return;

    await connectSocket();
    fetchInitialUnread();
  };

  useEffect(() => {
    initSocketSafely();
  }, []);

  // Re-identify on resume
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const socket = getSocket();
        const userId = await AsyncStorage.getItem("userId");
        if (socket && socket.connected && userId) {
          socket.emit("identify", { userId });
        }
      }
    });
    return () => sub.remove();
  }, []);

  // FIX: attach socket listeners only ONCE
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket || listenersAttached.current) return;

      socket.off("new_notification");
      socket.on("new_notification", () => {
        setUnreadCount((prev) => prev + 1);
      });

      listenersAttached.current = true;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
