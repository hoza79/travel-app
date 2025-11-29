import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  photo: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});
