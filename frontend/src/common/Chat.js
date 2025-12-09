import React, { useState } from "react";
import { Text, View, Image, TouchableOpacity, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styles from "../styles/ChatItem_styles";

const Chat = ({ conversation, onDelete }) => {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);

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
    <>
      {/* CARD */}
      <View style={[styles.card, isUnread && styles.cardUnread]}>
        {/* Profile */}
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Chat", {
              conversationId,
              receiverId: otherUserId,
              receiverName: otherUserName,
              receiverPhoto: otherUserPhoto,
            })
          }
        >
          <Image
            source={
              otherUserPhoto
                ? { uri: otherUserPhoto }
                : require("../assets/profile-picture.jpeg")
            }
            style={styles.profileImage}
          />
        </TouchableOpacity>

        {/* Middle */}
        <TouchableOpacity
          style={styles.middle}
          onPress={() =>
            navigation.navigate("Chat", {
              conversationId,
              receiverId: otherUserId,
              receiverName: otherUserName,
              receiverPhoto: otherUserPhoto,
            })
          }
        >
          <Text style={[styles.name, isUnread && styles.nameUnread]}>
            {otherUserName}
          </Text>

          <Text
            style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {lastMessageText || "No messages yet"}
          </Text>
        </TouchableOpacity>

        {/* Right Section */}
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

        {/* DELETE BUTTON */}
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.1)",
            marginLeft: 10,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONFIRM MODAL */}
      <Modal transparent visible={showModal} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: "75%",
              backgroundColor: "#061237",
              borderRadius: 18,
              paddingVertical: 25,
              paddingHorizontal: 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Delete this conversation?
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              {/* Cancel */}
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{
                  flex: 1,
                  marginRight: 10,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  onDelete(conversationId);
                }}
                style={{
                  flex: 1,
                  marginLeft: 10,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: "#d11",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 16 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default Chat;
