import React, { useEffect, useState } from "react";
import { View, TextInput, Image, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import styles from "../styles/MessagesScreen_styles";
import Chat from "../common/Chat";
import { getSocket, onSocketReady } from "../socket";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const deleteConversation = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");

      await fetch(`${BASE_URL}/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setConversations((prev) => prev.filter((c) => c.conversationId !== id));
    } catch {}
  };

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
          // If user deleted the conversation earlier, DO NOT merge old data
          const exists = prev.some(
            (c) => c.conversationId === preview.conversationId
          );

          if (!exists) {
            // fresh conversation
            return [preview, ...prev];
          }

          // overwrite completely with fresh preview (no old state)
          return prev.map((c) =>
            c.conversationId === preview.conversationId ? preview : c
          );
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
    <SafeAreaView style={styles.container}>
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
          <Chat
            key={c.conversationId}
            conversation={c}
            onDelete={deleteConversation}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MessagesScreen;
