import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#071739",
    alignItems: "center",
    paddingTop: 60,
  },

  coverContainer: {
    width: "90%",
    height: 180,
    backgroundColor: "#0b1f4b",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  coverPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },

  profileContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#0b1f4b",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -60,
    borderWidth: 2,
    borderColor: "#fff",
  },

  profilePhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },

  addText: {
    color: "#8ea4d2",
    fontSize: 16,
  },

  input: {
    width: "85%",
    borderColor: "#fff",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    color: "#fff",
  },

  button: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 40,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 40,
  },

  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },

  /* ✅ APP-WIDE MODAL STYLE (MATCHES TravelCard) */

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
    width: "100%",
  },

  modalCancelButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },

  modalButtonText: {
    color: "white",
    fontSize: 16,
  },
});
