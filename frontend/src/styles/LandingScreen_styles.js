import { StyleSheet, Dimensions } from "react-native";
import { moderateScale } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");

// Base design device (iPhone 16 width ≈ 430)
const BASE_WIDTH = 430;
const widthRatio = width / BASE_WIDTH;

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#061237",
  },

  imageContainer: {
    width: "95%",
    alignItems: "center",
    marginTop: 50,
  },

  image: {
    width: "100%",
    height: width * (490 / BASE_WIDTH),
    opacity: 0.4,
    resizeMode: "cover",
  },

  titleAndTaglineContainer: {
    width: "100%",
    alignItems: "center",
    padding: 20,
  },

  AppName: {
    color: "white",
    fontSize: 85,
    fontWeight: "bold",
    width: "100%",
    textAlign: "center",
  },

  Tagline: {
    color: "#B0B0B0",
    fontSize: moderateScale(23),
    letterSpacing: 0.5,
    textAlign: "center",
  },

  buttonContainer: {
    marginBottom: height * 0.08,
    alignItems: "stretch",
    width: "85%",
  },

  signInButton: {
    marginBottom: 10,
    width: "100%",
    height: moderateScale(50),
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "white",
  },

  registerButton: {
    marginBottom: 20,
    width: "100%",
    height: moderateScale(50),
    backgroundColor: "#061037",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    borderWidth: 0.2,
    borderColor: "grey",
  },

  signInButtonText: {
    color: "black",
    fontSize: moderateScale(17),
    fontWeight: "600",
  },

  registerButtonText: {
    color: "white",
    fontSize: moderateScale(17),
    fontWeight: "600",
  },
});
