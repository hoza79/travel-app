import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#061237",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },

  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "white",
    overflow: "hidden",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  textContainer: {
    flex: 1,
    marginLeft: 10,
  },

  name: {
    color: "white",
    fontSize: 17,
    fontWeight: "bold",
  },

  lastMessage: {
    color: "rgb(87,107,134)",
    fontSize: 15,
    marginTop: 2,
  },

  dateContainer: {
    alignItems: "flex-end",
  },

  date: {
    color: "rgb(87,107,134)",
    fontSize: 14,
  },
});
