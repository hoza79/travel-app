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
    width: "100%",
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
});
