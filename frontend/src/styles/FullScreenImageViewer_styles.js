import { StyleSheet, Dimensions } from "react-native";
const width = Dimensions.get("window").width;
const height = Dimensions.get("window").height;

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#061237",
  },

  image: {
    width: width,
    height: height,
    alignSelf: "center",
    resizeMode: "contain",
  },
});
