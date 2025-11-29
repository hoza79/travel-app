import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },

  scrollView: {
    flex: 1,
    width: "100%",
  },

  scrollContent: {
    paddingTop: 60,
  },

  searchBar: {
    height: 40,
    width: "90%",
    alignSelf: "center",
    borderRadius: 14,
    paddingHorizontal: 15,
    backgroundColor: "#030d2cff",
    color: "white",
    fontSize: 16,
  },
});
