import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#061237",
  },

  title: {
    color: "white",
    fontSize: 85,
    fontWeight: "bold",
  },

  TextInput: {
    width: 300,
    height: 50,
    borderRadius: 10,
    paddingLeft: 20,
    fontSize: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "white",
    color: "white",
  },

  registerButton: {
    marginBottom: 75,
    width: 300,
    height: 50,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "white",
    marginTop: 30,
  },

  registerButtonText: {
    color: "black",
    fontSize: 17,
    fontWeight: "600",
  },

  loginRedirect: {
    alignItems: "center",
    justifyContent: "center",
  },

  haveAnAccountText: {
    color: "white",
    fontSize: 17,
  },

  goBackToSignInText: {
    color: "white",
    fontSize: 17,
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
    justifyContent: "center",
    width: "100%",
  },

  modalCancelButton: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    width: "100%",
  },

  modalButtonText: {
    color: "white",
    fontSize: 16,
  },
});
