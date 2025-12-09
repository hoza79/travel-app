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
    paddingVertical: 20,
    paddingHorizontal: 20,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  profilePicture: {
    width: 55,
    height: 55,
    borderRadius: 50,
    overflow: "hidden",
    marginRight: 12,
  },

  profileImage: {
    width: "100%",
    height: "100%",
  },

  userName: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },

  subText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },

  /** DELETE BUTTON **/
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  deleteText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },

  photo: {
    width: "100%",
    height: 250,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginTop: 5,
  },

  caption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },

  footer: {
    marginTop: 15,
    alignItems: "flex-end",
  },

  footerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
});
