import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#061237",
  },

  searchBar: {
    height: 50,
    width: "90%",
    borderWidth: 1,
    borderRadius: 30,
    borderColor: "rgb(13,26,67)",
    backgroundColor: "rgb(13,26,67)",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 15,
  },

  searchIcon: {
    width: 25,
    height: 25,
    tintColor: "rgb(87,107,134)",
  },

  searchBarTextInput: {
    fontSize: 16,
    paddingLeft: 10,
    color: "white",
    flex: 1,
  },

  scrollView: {
    width: "100%",
    marginTop: 20,
  },
});
