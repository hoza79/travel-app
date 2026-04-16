import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
    paddingHorizontal: 15,
  },

  searchBar: {
    height: 50,
    width: "100%",
    borderRadius: 25,
    backgroundColor: "rgb(13,26,67)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginTop: 20,
  },

  searchIcon: {
    width: 22,
    height: 22,
    tintColor: "rgb(87,107,134)",
  },

  searchBarTextInput: {
    flex: 1,
    fontSize: 15,
    paddingLeft: 10,
    color: "white",
  },

  scrollView: {
    marginTop: 20,
  },

  conversationCard: {
    width: "100%",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgb(20,35,75)",
  },

  conversationName: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 3,
  },

  lastMessage: {
    color: "rgb(150,165,195)",
    fontSize: 14,
    marginBottom: 2,
  },

  timestamp: {
    color: "rgb(120,130,160)",
    fontSize: 12,
  },
});
