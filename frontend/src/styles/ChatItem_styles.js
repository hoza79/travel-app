// src/styles/ChatItem_styles.js
import { StyleSheet } from "react-native";

export default StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgb(20,35,75)",
  },

  // Highlight background for unread
  cardUnread: {
    backgroundColor: "rgba(77,163,255,0.12)",
  },

  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },

  middle: {
    flex: 1,
    justifyContent: "center",
  },

  name: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 3,
  },

  nameUnread: {
    fontWeight: "700",
  },

  lastMessage: {
    color: "rgb(150,165,195)",
    fontSize: 14,
  },

  lastMessageUnread: {
    color: "white",
    fontWeight: "500",
  },

  rightSection: {
    width: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  time: {
    color: "rgb(120,130,160)",
    fontSize: 12,
    marginBottom: 6,
  },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#4DA3FF",
    justifyContent: "center",
    alignItems: "center",
  },

  unreadBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
});
