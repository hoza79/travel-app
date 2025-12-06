import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#061237",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },

  headerImage: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginRight: 10,
  },

  headerName: {
    fontSize: 18,
    color: "white",
    fontWeight: "600",
  },

  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },

  messageBubble: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 12,
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4C8BFF",
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  messageText: {
    color: "white",
    fontSize: 16,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#061237",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  input: {
    flex: 1,
    height: 45,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 25,
    paddingHorizontal: 15,
    color: "white",
  },

  sendButton: {
    marginLeft: 10,
    width: 45,
    height: 45,
    backgroundColor: "#4C8BFF",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  sendText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});
