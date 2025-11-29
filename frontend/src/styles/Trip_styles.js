import { StyleSheet } from "react-native";
import { scale, verticalScale, moderateScale } from "react-native-size-matters";

export default StyleSheet.create({
  container: {
    width: "90%", // match TravelCard
    alignSelf: "center",
    marginVertical: 15,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#061237",
    paddingVertical: 25,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },

  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },

  columnStart: {
    flexDirection: "column",
    alignItems: "flex-start",
  },

  descriptionText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    lineHeight: 22,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
  },

  button: {
    backgroundColor: "#F2F2F2",
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    width: 140,
  },

  buttonText: {
    color: "black",
    fontWeight: "700",
    fontSize: 20,
    textAlign: "center",
  },

  profilePicture: {
    width: 70,
    height: 70,
    borderRadius: 50,
    overflow: "hidden",
    marginRight: 13,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  userName: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },

  logoContainer: {
    position: "absolute",
    top: 5,
    right: 0,
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: "contain",
    opacity: 0.8,
  },

  date: {
    color: "rgba(123, 243, 237, 0.8)",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 3,
  },

  seekingRideContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    backgroundColor: "rgba(43,86,223,0.5)",
    borderRadius: 50,
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  destination: {
    marginTop: 25,
    marginBottom: 25,
    alignItems: "center",
  },

  destinationText: {
    color: "white",
    fontSize: 33,
    fontWeight: "800",
    textAlign: "center",
  },

  seatsAvailable: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },
});
