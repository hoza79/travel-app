// src/context/MessageContext.js
import React, { createContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, onSocketReady } from "../socket";
import BASE_URL from "../config/api";

export const MessageContext = createContext({
  unreadMessages: 0,
  setUnreadMessages: () => {},
  activeConversation: null,
  setActiveConversation: () => {},
});

export const MessageProvider = ({ children }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeConversation, setActiveConversation] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const recalcUnread = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        if (mountedRef.current) setUnreadMessages(0);
        return;
      }

      const res = await fetch(`${BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const totalUnread = list.reduce(
        (sum, c) => sum + (c.unreadCount || 0),
        0
      );

      if (mountedRef.current) {
        setUnreadMessages(totalUnread);
      }
    } catch (e) {
      if (mountedRef.current) setUnreadMessages(0);
    }
  };

  // initial load
  useEffect(() => {
    recalcUnread();
  }, []);

  // listen to socket updates and recompute unread from server truth
  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handleConversationUpdate = () => {
        recalcUnread();
      };

      const handleNewMessage = () => {
        recalcUnread();
      };

      socket.on("conversationUpdate", handleConversationUpdate);
      socket.on("newMessage", handleNewMessage);

      return () => {
        socket.off("conversationUpdate", handleConversationUpdate);
        socket.off("newMessage", handleNewMessage);
      };
    });
  }, []);

  return (
    <MessageContext.Provider
      value={{
        unreadMessages,
        setUnreadMessages,
        activeConversation,
        setActiveConversation,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
