import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config/api";
import { getSocket, onSocketReady } from "../socket";
import styles from "../styles/Chat_styles";
import { MessageContext } from "../context/MessageContext";
import { SafeAreaView } from "react-native-safe-area-context";

const ChatScreen = ({ route, navigation }) => {
  const { conversationId, receiverId, receiverName, receiverPhoto } =
    route.params;

  const { setActiveConversation } = useContext(MessageContext);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollViewRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    setActiveConversation(conversationId);

    return () => {
      setActiveConversation(null);

      onSocketReady(async () => {
        const socket = getSocket();
        if (!socket || !currentUserId) return;

        socket.emit("mark_read", {
          conversationId,
          userId: currentUserId,
        });
      });
    };
  }, [currentUserId]);

  useEffect(() => {
    const load = async () => {
      const id = await AsyncStorage.getItem("userId");
      setCurrentUserId(Number(id));
    };
    load();
  }, []);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${BASE_URL}/messages/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 50);
    } catch {}
  };

  const markAsRead = (uid) => {
    onSocketReady(() => {
      const socket = getSocket();
      socket.emit("mark_read", {
        conversationId,
        userId: uid,
      });
    });
  };

  useEffect(() => {
    if (!currentUserId) return;
    fetchMessages();
    markAsRead(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    onSocketReady(() => {
      const socket = getSocket();

      const handler = (msg) => {
        if (msg.conversationId !== conversationId) return;

        setMessages((prev) => [...prev, msg]);

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      };

      socket.on("newMessage", handler);
      return () => socket.off("newMessage", handler);
    });
  }, []);

  const send = () => {
    if (!text.trim() || !currentUserId) return;

    onSocketReady(() => {
      const socket = getSocket();
      socket.emit("sendMessage", {
        conversationId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        message_text: text.trim(),
      });
    });

    setText("");

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.header}
          onPress={() => {
            if (receiverId === currentUserId) {
              navigation.navigate("BottomNavigator", { screen: "Profile" });
            } else {
              navigation.navigate("UserProfile", { userId: receiverId });
            }
          }}
        >
          <Image
            source={
              receiverPhoto
                ? { uri: receiverPhoto }
                : require("../assets/profile-picture.jpeg")
            }
            style={styles.headerImage}
          />
          <Text style={styles.headerName}>{receiverName}</Text>
        </TouchableOpacity>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingVertical: 10 }}
        >
          {messages.map((msg, i) => {
            const isMine = msg.sender_id === currentUserId;

            return (
              <View
                key={i}
                style={[
                  styles.messageBubble,
                  isMine ? styles.myMessage : styles.theirMessage,
                  { marginVertical: 4 },
                ]}
              >
                <Text style={styles.messageText}>{msg.message_text}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#8fa1c7"
          />

          <TouchableOpacity onPress={send} style={styles.sendButton}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
