// src/screens/ChatTestScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import { getSocket, connectSocket, onSocketReady } from "../socket";

export default function ChatTestScreen() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState(null);
  const [receiverId, setReceiverId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const id = await AsyncStorage.getItem("userId");
      const numericId = Number(id);
      setUserId(numericId);

      // Automatic receiver logic
      if (numericId === 7) setReceiverId(15);
      else if (numericId === 15) setReceiverId(7);
      else setReceiverId(7);
    };
    loadUser();
  }, []);

  useEffect(() => {
    // Ensure the shared socket exists and listen on it
    connectSocket().catch(() => {});

    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      // prevent duplicate handlers on hot reload by cleaning existing named handler
      try {
        if (socket.__chat_handler) {
          socket.off("newMessage", socket.__chat_handler);
        }
      } catch {}

      const handler = (msg) => {
        setMessages((prev) => [...prev, msg]);
      };

      socket.on("newMessage", handler);
      socket.__chat_handler = handler;
    });

    // no local socket to disconnect; shared socket lives for app lifecycle
  }, []);

  const sendMessage = async () => {
    if (!text.trim() || !receiverId) return;

    const socket = getSocket();
    const message = {
      sender_id: userId,
      receiver_id: receiverId,
      message_text: text,
      sent_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, message]);

    if (socket && socket.connected) {
      socket.emit("sendMessage", message);
    } else {
      // fallback: POST to server (optional)
      try {
        await fetch(`${BASE_URL}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
      } catch (e) {
        console.log("chat send fallback failed", e);
      }
    }

    setText("");
  };

  const renderItem = ({ item }) => {
    const isMe = item.sender_id === userId;
    return (
      <View
        style={{
          marginVertical: 6,
          alignSelf: isMe ? "flex-end" : "flex-start",
          backgroundColor: isMe ? "#2D66F5" : "#1E2A45",
          padding: 10,
          borderRadius: 12,
          maxWidth: "70%",
        }}
      >
        <Text style={{ color: "white" }}>{item.message_text}</Text>
      </View>
    );
  };

  if (!userId || !receiverId) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#061237", padding: 10 }}>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
      />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor="#999"
          style={{
            flex: 1,
            backgroundColor: "#112448",
            color: "white",
            padding: 10,
            borderRadius: 10,
          }}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: "#2D66F5",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            marginLeft: 10,
          }}
        >
          <Text style={{ color: "white" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
