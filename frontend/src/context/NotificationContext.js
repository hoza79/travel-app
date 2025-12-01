// src/context/NotificationContext.js
import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady, connectSocket } from "../socket";
import BASE_URL from "../config/api";
import { AppState } from "react-native";

export const NotificationContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

let __global_listeners_attached = false;
let __initial_load_promise = null;

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch unread notifications
  const fetchInitialUnread = async () => {
    if (!__initial_load_promise) {
      __initial_load_promise = (async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) return 0;

          const res = await fetch(`${BASE_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          return Array.isArray(data) ? data.length : 0;
        } catch (e) {
          return 0;
        }
      })();
    }

    try {
      const value = await __initial_load_promise;
      if (mountedRef.current) setUnreadCount(value);
    } catch {}
  };

  // FIX #1 — wait for userId BEFORE connecting socket
  const initSocketSafely = async () => {
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) return;

    await connectSocket();
    fetchInitialUnread();
  };

  // Connect once on mount (delayed until userId exists)
  useEffect(() => {
    initSocketSafely();
  }, []);

  // FIX #2 — re-identify on app resume
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

  // SOCKET EVENT LISTENERS
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      socket.on("connect", async () => {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) socket.emit("identify", { userId });
        fetchInitialUnread();
      });

      if (__global_listeners_attached) return;

      const newNotificationHandler = () => {
        setUnreadCount((prev) => prev + 1);
      };

      const deletionHandler = () => {
        setUnreadCount((prev) => Math.max(prev - 1, 0));
      };

      const clearedHandler = () => {
        setUnreadCount(0);
      };

      socket.on("new_notification", newNotificationHandler);
      socket.on("notification_deleted", deletionHandler);
      socket.on("notifications_cleared", clearedHandler);

      try {
        socket.__notif_handlers = {
          newNotificationHandler,
          deletionHandler,
          clearedHandler,
        };
      } catch {}

      __global_listeners_attached = true;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
