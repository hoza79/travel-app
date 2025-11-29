import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#071236",
  },

  headerContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    color: "white",
    fontSize: 70,
    fontWeight: 700,
  },

  iconContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    width: 300,
    height: 300,
    resizeMode: "contain",
  },

  bottomTextContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    transform: [{ translateY: -70 }],
    width: "90%",
  },

  noMessagesYetText: {
    color: "white",
    fontSize: 30,
    fontWeight: 600,
    marginBottom: 10,
  },

  lastText: {
    color: "#535e7b",
    fontSize: 18,
    textAlign: "center",
  },
});
