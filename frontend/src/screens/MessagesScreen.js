// src/screens/MessagesScreen.js
import React, { useEffect, useState } from "react";
import { View, TextInput, Image, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import styles from "../styles/MessagesScreen_styles";
import Chat from "../common/Chat";
import { getSocket, onSocketReady } from "../socket";
import { useIsFocused } from "@react-navigation/native";

const MessagesScreen = () => {
  const [conversations, setConversations] = useState([]);
  const isFocused = useIsFocused();

  const load = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setConversations([]);
        return;
      }

      const res = await fetch(`${BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);
    } catch {
      setConversations([]);
    }
  };

  // Refresh whenever screen is opened again
  useEffect(() => {
    if (isFocused) load();
  }, [isFocused]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();
      if (!socket) return;

      const handleNewMessage = () => load();

      const handleConversationUpdate = (preview) => {
        setConversations((prev) => {
          const idx = prev.findIndex(
            (c) => c.conversationId === preview.conversationId
          );
          if (idx === -1) return [preview, ...prev];
          const updated = [...prev];
          updated[idx] = preview;
          return updated;
        });
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("conversationUpdate", handleConversationUpdate);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("conversationUpdate", handleConversationUpdate);
      };
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Image
          source={require("../assets/searchIcon.png")}
          resizeMode="cover"
          style={styles.searchIcon}
        />

        <TextInput
          placeholderTextColor={"rgb(87,107,134)"}
          placeholder="Search"
          style={styles.searchBarTextInput}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        {conversations.map((c) => (
          <Chat key={c.conversationId} conversation={c} />
        ))}
      </ScrollView>
    </View>
  );
};

export default MessagesScreen;
