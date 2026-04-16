import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    width: "90%",
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

  firstName: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },

  seekingRideContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "rgba(43,86,223,0.5)",
    borderRadius: 50,
    paddingVertical: 5,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  seekingRideText: {
    color: "white",
    fontWeight: "700",
  },

  logoContainer: {
    position: "absolute",
    top: -25,
    right: -20,
    alignItems: "center",
  },

  logo: {
    width: 90,
    height: 90,
    resizeMode: "contain",
    opacity: 0.8,
  },

  distanceText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "right",
    marginTop: -10,
    marginRight: 8,
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

  date: {
    color: "rgba(123, 243, 237, 0.8)",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 3,
  },

  descriptionContainer: {
    width: "100%",
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

  seatsAvailable: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
  },

  deleteTripButton: {
    backgroundColor: "white",
    paddingVertical: 10,
    borderRadius: 50,
    width: 120,
    justifyContent: "center",
    alignItems: "center",
  },

  deleteTripButtonText: {
    color: "black",
    fontWeight: "700",
    fontSize: 16,
  },

  fullBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  fullBadgeIcon: {
    color: "white",
    fontSize: 16,
    marginRight: 6,
  },

  fullBadgeText: {
    color: "white",
    fontSize: 16,
  },

  actionButton: {
    backgroundColor: "#F2F2F2",
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    width: 140,
    justifyContent: "center",
    alignItems: "center",
  },

  actionButtonText: {
    color: "black",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  acceptRejectRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginTop: 10,
  },

  acceptButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  rejectButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },

  acceptRejectText: {
    color: "#061237",
    fontSize: 22,
    fontWeight: "700",
    marginTop: -2,
  },

  acceptedMessageButton: {
    backgroundColor: "white",
    opacity: 1,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 50,
    width: 140,
    justifyContent: "center",
    alignItems: "center",
  },

  acceptedMessageText: {
    color: "#061237",
    fontWeight: "700",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    width: "75%",
    backgroundColor: "#061237",
    borderRadius: 18,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  modalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },

  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  modalCancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },

  modalDeleteButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#020d2d",
    alignItems: "center",
  },

  modalButtonText: {
    color: "white",
    fontSize: 16,
  },
});
