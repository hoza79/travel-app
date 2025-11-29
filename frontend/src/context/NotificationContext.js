// src/context/NotificationContext.js
import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady, connectSocket } from "../socket";
import BASE_URL from "../config/api";

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

  // 🔵 Fetch unread notifications from server
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
          console.log("[NotificationProvider] initial fetch err", e);
          return 0;
        }
      })();
    }

    try {
      const value = await __initial_load_promise;
      if (mountedRef.current) setUnreadCount(value);
    } catch (e) {
      console.log("[NotificationProvider] initial fetch failed", e);
    }
  };

  useEffect(() => {
    connectSocket().catch(() => {});

    fetchInitialUnread();

    // 🔵 Attach socket listeners once
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      // 🚀 NEW: ALWAYS re-sync unread badge when socket connects
      socket.on("connect", () => {
        console.log(
          "[NotificationProvider] socket reconnected → refreshing unread"
        );
        fetchInitialUnread(); // <--- THE NEW FIX
      });

      if (__global_listeners_attached) return;

      const newNotificationHandler = (notif) => {
        try {
          setUnreadCount((prev) => {
            const next = prev + 1;
            console.log("[NotificationProvider] unread ->", prev, "=>", next);
            return next;
          });
        } catch (e) {
          console.log("[NotificationProvider] newNotification handler err", e);
        }
      };

      const deletionHandler = (payload) => {
        try {
          setUnreadCount((prev) => Math.max(prev - 1, 0));
          console.log("[NotificationProvider] notification_deleted", payload);
        } catch (e) {
          console.log("[NotificationProvider] deletion handler err", e);
        }
      };

      const clearedHandler = () => {
        try {
          setUnreadCount(0);
          console.log("[NotificationProvider] notifications_cleared");
        } catch (e) {
          console.log("[NotificationProvider] cleared handler err", e);
        }
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
      console.log("[NotificationProvider] listeners attached");
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
