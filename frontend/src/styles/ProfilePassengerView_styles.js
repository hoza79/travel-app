import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061237",
  },

  scrollContent: {},

  headerSection: {
    width: "100%",
    height: 200,
    position: "relative",
    marginBottom: 60,
  },

  coverPhoto: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
  },

  coverPhotoImage: {
    width: "100%",
    height: "100%",
  },

  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "white",
    position: "absolute",
    bottom: -50,
    alignSelf: "center",
    overflow: "hidden",
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  nameSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  editPenContainer: {
    height: 40,
    width: 40,
    marginLeft: 9,
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 30,
    padding: 5,
    backgroundColor: "#0e121e",
  },

  editPen: {
    height: "100%",
    width: "100%",
  },

  name: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },

  aboutSection: {
    marginTop: 20,
    justifyContent: "flex-start",
    alignItems: "flex-start",
    width: "100%",
    paddingLeft: 14,
  },

  aboutSectionText: {
    color: "#798097",
    fontSize: 16,
    fontWeight: "bold",
  },

  headerTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 35, // increased for breathing room
    alignSelf: "center",
    marginBottom: 10,
  },

  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 60, // more space between Photos & Trips
  },

  headerText: {
    color: "white",
    fontSize: 19,
    fontWeight: "600",
    opacity: 0.8,
    paddingBottom: 4,
    paddingTop: 3, // helps align vertically with the button
  },

  activeTabText: {
    color: "white",
    borderBottomWidth: 2,
    borderBottomColor: "white",
    opacity: 1,
  },

  friendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0e121e",
    borderRadius: 22,
    paddingVertical: 10, // more height
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#1c2448",
  },

  friendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 6,
  },

  friendIcon: {
    width: 22,
    height: 22,
    tintColor: "white",
  },
});
