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
  const [search, setSearch] = useState("");
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

      // ✅ filter + deduplicate
      const clean = list
        .filter((c) => c.conversationId && c.lastMessageTime)
        .reduce((acc, curr) => {
          if (!acc.find((c) => c.conversationId === curr.conversationId)) {
            acc.push(curr);
          }
          return acc;
        }, []);

      setConversations(clean);
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
    let socket;

    onSocketReady(() => {
      socket = getSocket();
      if (!socket) return;

      const handleConversationUpdate = (preview) => {
        if (!preview?.conversationId) return;

        setConversations((prev) => {
          const filtered = prev.filter(
            (c) => c.conversationId !== preview.conversationId,
          );

          return [preview, ...filtered];
        });
      };

      socket.on("conversationUpdate", handleConversationUpdate);
    });

    return () => {
      if (socket) {
        socket.off("conversationUpdate");
      }
    };
  }, []);

  const filtered = conversations.filter((c) => {
    const name = c.otherUserName?.toLowerCase() || "";
    const term = search.toLowerCase();
    return name.includes(term);
  });

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
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView style={styles.scrollView}>
        {filtered.map((c) => (
          <Chat
            key={c.conversationId} // ✅ FIXED KEY
            conversation={c}
            onDelete={deleteConversation}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MessagesScreen;
