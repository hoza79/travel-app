// src/common/Chat.js
import React from "react";
import { Text, View, Image, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../styles/ChatItem_styles";

const Chat = ({ conversation }) => {
  const navigation = useNavigation();

  const {
    conversationId,
    otherUserId,
    otherUserName,
    otherUserPhoto,
    lastMessageText,
    lastMessageTime,
    unreadCount,
  } = conversation;

  const isUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={() =>
        navigation.navigate("Chat", {
          conversationId,
          receiverId: otherUserId,
          receiverName: otherUserName,
          receiverPhoto: otherUserPhoto,
        })
      }
    >
      {/* Profile Picture */}
      <Image
        source={
          otherUserPhoto
            ? { uri: otherUserPhoto }
            : require("../assets/profile-picture.jpeg")
        }
        style={styles.profileImage}
      />

      {/* Middle Section */}
      <View style={styles.middle}>
        <Text style={[styles.name, isUnread && styles.nameUnread]}>
          {otherUserName}
        </Text>

        <Text
          style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
          numberOfLines={1}
        >
          {lastMessageText || "No messages yet"}
        </Text>
      </View>

      {/* Right Side: Time + Badge */}
      <View style={styles.rightSection}>
        <Text style={styles.time}>
          {lastMessageTime
            ? new Date(lastMessageTime).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })
            : ""}
        </Text>

        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default Chat;
